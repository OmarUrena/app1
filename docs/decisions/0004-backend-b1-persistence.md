# ADR 0004 — Persistencia de B1

Fecha: 2026-11-01. Estado: implementado y validado localmente en PostgreSQL 17.5.

## Alcance y repositorio

B0 está validado y su CI remoto aprobado. La rama B1 parte del commit existente
sin modificar el frontend. B1 prepara persistencia; B2–B8, auth real, compras,
Storage y sorteo quedan fuera del alcance de esta tarea.

## Migraciones y permisos

Se elige un único sistema: Supabase CLI 2.122.0 fijado como devDependency, historial
`supabase_migrations.schema_migrations` y SQL en `infra/supabase/migrations`.
El archivo se creó con `supabase --workdir infra migration new domain_b1`;
su timestamp procede del CLI en UTC. No se usa ORM ni otro ledger de migraciones.
El wrapper de NestJS para mantenimiento llama al CLI oficial, no interpreta ni
registra migraciones por su cuenta. Ninguna migración se ha enviado a Supabase remoto.

El esquema `sorteos` es privado y no está en los esquemas expuestos por la Data API.
Sus 13 tablas habilitan RLS sin políticas para clientes; se revocan privilegios de
PUBLIC y, cuando existen, de anon/authenticated. Funciones invoker con search_path
vacío y EXECUTE revocado a PUBLIC. El dueño de las tablas puede operar desde el
servidor; no se configura aún un login de ejecución ni se entrega esa conexión al
frontend. Antes de desplegar B2 se deberá provisionar un rol de servidor con los
privilegios mínimos y mantener separado el usuario que aplica migraciones.
No se usa SECURITY DEFINER para evitar problemas de permisos.

## Integridad y estados

- N entre 1 y 1,000,000 por rifa: límite técnico inicial, no un benchmark de capacidad.
  Un trigger genera exactamente 0..N-1 en la misma transacción. Numeración e IDs
  inmutables; sin DELETE/TRUNCATE de tickets. Ancho derivado de N-1, mínimo 1.
  Para cambiar N se crea otra rifa; el precio queda bloqueado tras el primer hold.
- Dinero BIGINT positivo en centavos DOP, acotado al rango seguro de JS. El total
  de orden es una columna generada por PostgreSQL. El driver entrega BIGINT como
  string; no cambiar su parser global a number. DTO monetario de B2 deberá validar
  el rango antes de convertir al formato HTTP del contrato.
- Guest sessions almacenan solo hashes. Idempotencia separada por operación y
  sesión mediante UNIQUE(session_id,idempotency_key), más request_hash inmutable.
  La comparación de payload y recuperación de respuesta corresponde a B3/B4.
- FKs compuestas aseguran que hold, orden y boleto pertenecen a la misma rifa.
  Índice parcial de order_tickets impide dos asignaciones activas. released_at
  conserva la relación histórica al liberar boletos.
- Constraints diferidos verifican el estado final de una transacción: cantidad
  HELD de holds activos, consumo único, reporte activo obligatorio y q boletos
  RESERVED/SOLD según la orden. No se ejecutan operaciones externas dentro de
  esas transacciones. El servidor de B3/B4 deberá bloquear primero la rifa,
  después hold y boletos; los triggers no sustituyen ese orden de bloqueo.
- La DB exige metadatos privados de comprobante; existencia real en Storage,
  firma de archivo y staging/compensación solo pueden verificarse en B4.
- NEEDS_RESOLUTION e INVALID no liberan inventario. Cancelar exige reviewer,
  motivo, tipo y referencia de conciliación, además de liberar explícitamente las
  relaciones en la misma transacción. La revisión humana y permisos son B5.
- No existe expiración de órdenes. DRAWN permanece bloqueado hasta otra decisión
  formal. No hay cron ni endpoints de hold, compra, pago o sorteo en esta fase.

## Auditoría, identidad y seed

Auditoría automática transaccional por INSERT/UPDATE: UUID, entidad, operación,
actor y estados. Sin serializar filas, nombres, teléfono, tokens o rutas de recibos.
No permite borrar, actualizar ni truncar el ledger. El registro de lecturas
sensibles se incorporará con las rutas privadas en B2/B5.

admin_users conserva el UUID externo de Auth sin FK a auth.users para permitir
PostgreSQL aislado. B2 debe verificar JWT y allowlist activa; el seed no crea un
usuario Auth ni un administrador activo. El teléfono no tiene UNIQUE porque no
demuestra identidad. El seed etiqueta explícitamente clientes y bancos ficticios;
su rifa queda DRAFT y la cuenta DEMO inactiva. El archivo referenciado es simulado,
sin objeto Storage ni URL pública. La numeración determinista solo es un fixture,
no el algoritmo de asignación real de B3.

Las herramientas de escritura local requieren loopback, nombres sorteos_dev/
sorteos_test/sorteos_b1_test_*, sin parámetros de conexión que puedan redirigir el
host y fuera de staging/production. El seed además requiere SEED_DEMO=true.
Nunca deben usarse esos comandos para administrar una base de negocio real.

## Recuperación y verificación

Down solo admite un esquema completamente vacío; con datos se usa una migración
correctiva o restauración verificada, nunca DROP de histórico. El archivo de
recuperación no constituye un segundo migrador: después del down autorizado se
repara el historial del mismo CLI. Las pruebas crean DBs exclusivas para comprobar
up repetido, seed reejecutable, constraints, RLS y recuperación positiva/negativa.
La ejecución inicialmente bloqueada se completó después: 20 pruebas SQL/HTTP
aprobadas y cluster temporal detenido. Se corrigieron la conexión del CLI al
PostgreSQL local sin TLS y la sintaxis de CASE dentro de IF en PL/pgSQL.
La herramienta local añade sslmode=disable después de validar loopback y nombre
DEMO; no modifica TLS del backend remoto ni acepta URLs remotas.

Auditoría de producción: cero hallazgos. Auditoría completa: aviso moderado nuevo
[GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)
en minimatch de herramientas de desarrollo, con tres rutas reportadas. Se registra
como pendiente de actualización compatible: no se hace un override global entre
versiones mayores ni se silencia el advisory.

Referencias revisadas: [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security),
[constraints PostgreSQL](https://www.postgresql.org/docs/17/ddl-constraints.html),
[constraint triggers](https://www.postgresql.org/docs/17/sql-createtrigger.html).
Se revisó el changelog de Supabase: los cambios recientes de TLS HTTP y zonas
horarias no modifican este SQL portable ni la prueba local de PostgreSQL 17.

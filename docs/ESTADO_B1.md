# Estado del backend B1

Fecha de verificación: 2026-11-01. Rama: `feat/backend-b1`.

## Resultado

B1 validada localmente: migración oficial repetida, seed DEMO reejecutable,
constraints, RLS y recuperación comprobados sobre PostgreSQL 17.5 aislado.
No se ha desplegado ni aplicado SQL en Supabase remoto. CI de esta rama todavía
no ejecutado; el CI remoto de B0 sí está aprobado.

| Criterio | Estado | Evidencia |
|---|---|---|
| Pendiente CI de B0 | PASS | Backend y Frontend de la rama B0 aprobados en GitHub Actions |
| Dependencias y lockfile | PASS | CLI oficial 2.122.0 fijado; pnpm-lock actualizado |
| Lint | PASS | `npm.cmd run lint` |
| Typecheck API/cliente | PASS | `npm.cmd run typecheck:api` |
| Build API/cliente | PASS | `npm.cmd run build:api` |
| OpenAPI/cliente | PASS | `npm.cmd run generate:api`; contrato HTTP sin cambios |
| Configuración | PASS | `npm.cmd run test:config`: 6/6 |
| Fundamentos y protecciones locales | PASS | `npm.cmd test`: 13/13 |
| PostgreSQL real | PASS | `scripts/test-backend-local.ps1`: 20/20 (19 de esquema y 1 de readiness) |
| Migración y seed reejecutables | PASS | Historial único y seed sin duplicar filas ni auditoría |
| Integridad y RLS | PASS | Numeración 1/10/137/10000, constraints, estados, privacidad y denegación por rol |
| Recuperación | PASS | Down exitoso sin datos y bloqueado con histórico presente |
| Auditoría de producción | PASS | `pnpm audit --prod --json`: cero vulnerabilidades reportadas |
| Auditoría completa | WARN | Un aviso moderado de minimatch en tres rutas de herramientas; cero altas/críticas |
| CI remoto B1 | SKIPPED | No se publicó esta rama ni se ejecutó en GitHub |

Total: **39 pruebas aprobadas**, ninguna omitida en las suites ejecutadas.

## Implementado

- `infra/supabase/migrations/20261102010448_domain_b1.sql`: esquema privado con
  13 tablas, enums/domains, FKs, checks, índices y triggers diferidos.
- Inventario generado 0..N-1, snapshots inmutables y dinero entero con total de
  orden calculado por PostgreSQL. Comprobante activo obligatorio al commit.
- Integridad de holds, reservas, ventas y liberación conciliada. INVALID y
  NEEDS_RESOLUTION mantienen RESERVED. Auditoría e histórico protegidos.
- `infra/seeds/demo.sql`: rifa DRAFT de 100 números, 3 RESERVED, orden pendiente
  y reporte simulado; cuenta DEMO y owner inactivos. Sin usuario Auth ni objeto Storage.
- Herramientas de mantenimiento limitadas a loopback, DBs DEMO y fuera de
  staging/production; rechazo de parámetros que pueden redirigir el host.
- Script Windows que inicia y detiene únicamente su cluster temporal. Las bases
  creadas por las pruebas se eliminan al terminar, sin tocar el servicio del sistema.
- Diagrama, decisiones y plan de recuperación en ESQUEMA_B1.md, ADR 0004 e infra/recovery.

## Correcciones verificadas durante la ejecución

El revisor de permisos volvió a estar disponible y autorizó la prueba local.
Se detectaron y corrigieron dos fallos reales antes de aprobar B1:

1. El CLI requiere TLS por defecto. La herramienta valida primero que la conexión
   sea loopback y luego añade sslmode=disable exclusivamente para ese PostgreSQL
   local sin TLS. La configuración del backend remoto no cambia.
2. Un CASE dentro de un IF PL/pgSQL requería paréntesis en el constraint diferido.
   Corregido y verificado al aplicar la migración desde una DB limpia.

El diagnóstico del CLI conserva un mensaje acotado y redacta URL/contraseña,
para poder identificar fallos sin propagar credenciales de execFile.

Última suite SQL: 20 aprobadas, 0 fallos, 0 omitidas. PostgreSQL temporal detenido
al finalizar. El resultado anterior bloqueado/fallido ya no describe el estado actual.

## Riesgos y límites

La auditoría completa reporta GHSA-g3hv-75wg-m249 en minimatch transitivo de eslint,
typescript-eslint y openapi-typescript/redocly. El parche anunciado es 11.0.1;
las herramientas usan versiones mayores anteriores. La actualización compatible
queda pendiente; no se oculta el aviso ni se fuerza un override global que pueda
romper otras herramientas. No hay hallazgos en las 236 dependencias de producción.

No hay endpoints de catálogo, compra, pagos ni admin todavía: corresponden a B2–B5.
Tampoco hay comprobantes reales, autenticación admin configurada, sorteo o despliegue.
La existencia y validación de archivos privados se comprobará en B4; B1 solo
valida sus metadatos y referencia obligatoria.

Próxima fase desbloqueada: **B2**, Auth admin y catálogo administrable/público.
Antes de trabajo simultáneo, separar frontend y backend en worktrees.

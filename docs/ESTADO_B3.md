# Estado del backend B3

Fecha: 2026-11-03. Rama: feat/backend-b3. Implementado y validado localmente.

## Entrega

- POST checkout-session: secreto de 256 bits en cookie HttpOnly, hash SHA-256
  en DB, renovación conservando secreto, Origin y defensa CSRF.
- POST checkout-holds: rifa y cantidad, Idempotency-Key por sesión, precio DB,
  total entero exacto, TTL 60 min y asignación criptográfica sin reemplazo.
- GET/DELETE checkout-holds/:id: solo sesión propietaria; no muestran números.
- Límites persistentes de simultáneos por sesión/IP y altas exitosas por hora;
  HMAC de IP, sin confiar en X-Forwarded-For ni guardar IP cruda.
- Bloqueo por rifa, actualización atómica y constraints diferidas de B1; auditoría
  de altas, cambios y accesos propios. No se crean órdenes ni se confirma pago.
- Expiración lazy y job interno de ACTIVE/HELD vencidos; no toca RESERVED/SOLD,
  CONSUMED ni órdenes. Cancelar un hold consumido devuelve 409.
- Migración nueva 20261104022108_checkout_holds_b3.sql, tabla checkout_limits con
  RLS, permisos mínimos de servidor, trigger y recuperación b3-down-empty.sql.
- Contrato, OpenAPI 0.3.0 y cliente generado actualizados; sin cambios de frontend.

## Verificación

| Comando / comprobación | Resultado |
|---|---|
| npm run generate:api | PASS, 4 operaciones nuevas B3 |
| npm run lint | PASS |
| npm run typecheck:api | PASS |
| npm run typecheck --workspace apps/web | PASS |
| npm run build:api | PASS |
| npm run test:config | PASS, 8 pruebas |
| npm test | PASS, 13 pruebas |
| npm run test:integration, cluster loopback con SCRAM | PASS, 51 pruebas: 40 previas y 11 B3 |
| Recuperación B3 vacía/datos/permisos/reparación/reaplicación | PASS, incluida en integración |
| Recuperación B2 después de revertir B3 | PASS, incluida en integración |
| Migraciones B1/B2 ya aplicadas | Sin diferencias |
| git diff --check | PASS |
| Runner Windows -PasswordAuthentication -TestScript test:checkout | PASS, 11/11 y servidor detenido |
| Aplicación de B3 en Supabase y CI remoto de B3 | PENDIENTE, no ejecutados |

Total: **72 pruebas aprobadas**, sin fallos ni omitidas. La suite final SCRAM
completa tardó aproximadamente 114 s en el equipo local. Una pasada anterior
con trust también aprobó las 49 pruebas existentes antes de añadir los dos
últimos casos B3. La autenticación de los logins de prueba usa contraseña,
sin depender del trust local que ocultó el fallo de CI B2.

Concurrencia: 50 solicitudes HTTP en paralelo, 20 boletos disponibles, repartidas
entre dos instancias NestJS con pools independientes sobre la misma DB.
Resultado: 20 respuestas 201 y 30 respuestas 409 INSUFFICIENT_TICKETS, exactamente
20 tickets HELD distintos, 20 holds y total de inventario conservado.
Tiempo medido: 1185 ms para las 50 solicitudes, excluyendo crear sesiones.
No es un benchmark de producción ni certifica capacidad de rifas de un millón.
También se prueban 25 reintentos paralelos con una clave: todos el mismo hold.

Evidencia local ignorada: .tmp/b3-scram-integration.txt. El comando de Windows
reproducible usa el runner del repositorio:

```powershell
powershell -NoProfile -File scripts/test-backend-local.ps1 -PasswordAuthentication
# Solo B3:
powershell -NoProfile -File scripts/test-backend-local.ps1 -PasswordAuthentication -TestScript test:checkout
```

El runner crea un cluster nuevo por ejecución SCRAM, contraseña temporal, quita
el archivo de inicialización y detiene solo su instancia. No toca el servicio
del sistema. Las suites crean y eliminan sus DB/roles. Las pruebas no usan la
URL de Supabase ni alteran los datos remotos. El fixture DEMO previo de B1 sigue
siendo reejecutable, DRAFT y sin transferencias o comprobantes reales.

El runner SCRAM del repositorio también se verificó de forma independiente:
11 pruebas B3 aprobadas y 858 ms en su prueba de 50 solicitudes/dos instancias.
Registro: .tmp/b3-runner-scram.txt. Diferencias de latencia entre pasadas son
esperables en este entorno local y no se fijan umbrales de rendimiento ficticios.

## Pendientes y límites

- Aplicar B3 remoto mediante el único historial CLI cuando se autorice esa
  operación; el arranque no migra automáticamente. Sin B3, los nuevos endpoints
  fallan al faltar permisos/esquema; no simulan éxito.
- Publicar esta rama/correcciones y comprobar un CI nuevo. No se afirma corregido
  el resultado remoto anterior solo porque la suite local pasó.
- B2: OWNER ya provisionado; sigue pendiente probar acceso con su sesión real.
- No hay proveedor CAPTCHA: exceso de cuota se bloquea con 429. Integrar un
  desafío adaptativo requiere proveedor y claves; no hay verificación fingida.
- Antes de producción: identidad de proxy confiable, clave HMAC privada estable
  entre procesos, retención/limpieza de contadores y medición de rifas grandes.
- Job requiere API activa; el catálogo calcula disponibilidad elegible y la
  siguiente operación valida/libera bajo lock. Una operación fallida revierte
  también su liberación lazy; el job vuelve a intentarlo.
- Nueva sesión no recupera holds antiguos. Pérdida de cookie/transferencia con
  hold vencido requiere flujo de incidencia posterior; B3 no emite boletos.

Siguiente fase: **B4**, submit único de formulario + comprobante privado,
conversión HELD -> RESERVED y creación atómica de orden PENDING_REVIEW.
Decisiones y límites completos: [ADR 0006](decisions/0006-backend-b3-holds.md).

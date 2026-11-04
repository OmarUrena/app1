# ADR 0006 — Pre-reservas B3

Fecha: 2026-11-03. Rama: feat/backend-b3.

## Alcance

Se implementan checkout-session, POST/GET/DELETE checkout-holds, liberación
periódica/lazy y protección de cupo. Sin crear órdenes, subir comprobantes,
entregar números ni operar sorteo. Se conservan los cambios pendientes de B2.
Migración nueva generada por CLI: 20261104022108_checkout_holds_b3.sql;
B1/B2 ya aplicadas no se editan. Esta tarea valida migraciones localmente.

## Sesión y reintentos

Cookie HttpOnly con secreto aleatorio de 32 bytes; SHA-256 en guest_sessions.
La inicialización separada de la primera asignación permite repetir un hold
después de una respuesta perdida con la misma sesión. La UI debe serializar
la inicialización de sesión y conservar Idempotency-Key por intención.
POST/DELETE requieren Origin allowlisted y no cross-site; cookie Secure con
prefijo __Host- en entornos desplegados, SameSite=Lax y sin Domain. El despliegue
web/API requiere el mismo sitio o proxy controlado. No hay recuperación por UUID.
Sesión con 24 horas de plazo renovable sin rotar secreto; nuevos holds no pueden
superar ese plazo. B4 definirá consulta de órdenes y recuperación a largo plazo.

## Inventario, uniformidad y bloqueo

Todas las operaciones de inventario bloquean la fila de rifa antes de holds o
boletos, como exige B1. POST obtiene primero advisory locks IP y sesión, en ese
orden, para serializar límites globales e idempotencia entre distintas rifas.
GET/DELETE/job solo bloquean rifa y no toman locks IP/sesión después, evitando
un orden inverso. Las ediciones administrativas de B2 ya bloquean la rifa.

Se enumeran UUID de AVAILABLE dentro del lock y se aplica Fisher-Yates parcial
con crypto.randomInt(i,N). Cada siguiente índice tiene probabilidad 1/(N-i),
por tanto cada subconjunto de q tiene probabilidad 1/binomial(N,q). No se usa
ORDER BY random(), Math.random() ni selección de números por el cliente.
La actualización exige exactamente q filas y las constraints diferidas de B1
comprueban cantidad/estado antes del commit. Snapshots y total con BigInt;
solo se serializan enteros seguros. Los UUID de tickets no salen en el DTO.

El enfoque es O(N) en lectura/memoria y serializa por rifa. La prueba de últimos
boletos demuestra seguridad bajo contención; no certifica capacidad para N=1M.
Medir memoria, latencia y espera de locks antes de operar rifas grandes. Un
timeout revierte la transacción; el cliente reintenta con la misma clave.

## Expiración

Tiempo de transacción PostgreSQL como autoridad. POST y GET/DELETE liberan HELD
vencidos de la rifa dentro del lock; se revierten junto con la operación si falla.
Job interno con intervalo configurable, sin solaparse consigo mismo; hasta
20 rifas/ciclo, FOR UPDATE SKIP LOCKED y transacción por rifa. Múltiples procesos
pueden barrer sin duplicar la liberación. Solo ACTIVE vencido pasa a EXPIRED;
solo sus HELD se liberan. No se toca RESERVED, SOLD o CONSUMED. Auditoría de
triggers preserva cambios; consultas/cancelaciones de holds propios se auditan.
Si no hay procesos API activos, no hay barrido; el catálogo computa elegibilidad
y la próxima operación libera bajo lock. No se promete una hora exacta del job.

## Límites y privacidad

Límites de simultáneos por sesión/IP y máximos horarios en PostgreSQL. Tabla
checkout_limits conserva un contador por HMAC IP/tipo, con ventana móvil desde
su primer éxito; no crea una fila por intento. Cancelar no borra el cupo horario.
Las transacciones fallidas revierten el contador: el throttling HTTP cubre los
intentos fallidos por proceso. Las instancias deben compartir la clave privada
CHECKOUT_ABUSE_HASH_KEY, obligatoria en staging/production. En desarrollo se
genera por proceso; reiniciarlo cambia las agrupaciones IP, no los límites por
sesión existentes. No se confía en cabeceras de proxy del cliente. Detrás de un
proxy no configurado, se limita la IP del proxy; configurar identidad de red de
forma explícita antes de desplegar, sin activar trust proxy indiscriminado.

Los rechazos 429 y fallos del job son observables en logging sin IP/cookie/PII.
No hay proveedor CAPTCHA configurado: el exceso falla cerrado con 429. Un
desafío adaptativo verificado en servidor requiere elegir proveedor y claves;
no se introduce un CAPTCHA que finge éxito. La protección no impide un botnet.
Los hashes de contadores no se purgan automáticamente; su retención/limpieza
operativa debe acordarse antes de producción, sin borrar historial de negocio.

## Permisos y recuperación

RLS en la nueva tabla, sin grants a anon/authenticated. Runtime amplía solo
sesiones, holds, columnas de estado/hold de tickets y contadores. De orders solo
lee hold_id para la validación diferida; no accede a PII/comprobantes ni escribe
órdenes, administradores o pagos. Trigger de alta runtime exige rifa elegible,
sesión con plazo suficiente, hash de abuso y vencimiento <=12 horas.
El operador/seed privilegiado puede preparar fixtures históricos DRAFT de B1.

b3-down-empty.sql solo en DB completamente vacía y transacción; retira B3 y
restaura permisos B2, conserva el rol global. Reparar la versión con el CLI y
reaplicar para comprobar. Con datos, nueva migración correctiva, nunca down
destructivo. La suite B2 revierte B3 antes de ensayar su recuperación histórica.

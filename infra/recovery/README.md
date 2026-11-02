# Recuperación B1/B2

La recuperación se ensaya únicamente sobre las DB desechables de
`apps/api/test/schema.integration.ts`. No hay autorización para rollback, DROP,
reset ni restauración sobre bases de producción.

## Instalación sin datos

`b1-down-empty.sql` examina todas las tablas del esquema y se niega a continuar
si encuentra cualquier fila, incluidas las del seed o la auditoría. Solo entonces
elimina `sorteos`. Se debe ejecutar en una transacción; con psql usar `-1` y
`-v ON_ERROR_STOP=1`. No ejecutar el archivo contra otra base por cambiar la URL.

El down no borra el ledger `supabase_migrations.schema_migrations`. Tras una
recuperación autorizada y exitosa, consultar `supabase migration repair --help`
y marcar como revertida esa versión usando el mismo CLI y la misma DB. Esto
mantiene un único historial de migraciones. No editar ese ledger a mano ni volver
a aplicar SQL por fuera del migrador oficial.

## Instalación con datos

1. Detener escrituras y preservar el estado: no eliminar órdenes ni auditoría.
2. Tomar un backup con el procedimiento aprobado del entorno y verificar que se
   puede restaurar en otra DB aislada. B1 no implementa ni certifica backup productivo.
3. Corregir con una nueva migración forward-only en el mismo directorio/historial,
   después de revisar el impacto sobre pagos, boletos e idempotencia.
4. Verificar integridad y conciliación antes de reabrir escrituras. Nunca liberar
   RESERVED por antigüedad ni rechazar un comprobante para borrar una orden.

La suite incluye prueba positiva de down en un esquema vacío y prueba negativa
con el seed presente. Ambas pasaron en PostgreSQL 17.5 aislado. Esto verifica
el rollback protegido de B1; no constituye una restauración de backup productivo.

## Recuperación selectiva B2

`b2-down-empty.sql` conserva las tablas B1 y retira columnas, triggers, políticas
y privilegios añadidos por B2. Solo admite una DB completamente vacía y debe
ejecutarse en transacción. No se elimina `sorteos_runtime`: es un rol global del
cluster que podría estar compartido con otras DB. Sin USAGE en este esquema ni
políticas de acceso queda sin autoridad sobre los datos de B1.

La suite B2 prueba el down vacío, el rechazo con datos, la reparación de la
versión mediante `supabase migration repair --status reverted` del mismo CLI
y la reaplicación con `db push`. No se escribe directamente en el ledger ni se
introduce un segundo sistema de migraciones. Con datos reales usar forward-only.

# ADR 0015 — Diagnóstico seguro de fallos al iniciar la API

Fecha: 2026-11-06. Estado: aplicado como corrección del arranque local de M4.

El proceso compilado de API que se inició en segundo plano durante la activación administrativa seguía escuchando en 3001. Al ejecutar `npm run dev:api`, el propietario abrió una segunda instancia que no pudo escuchar. El logger de framework descartaba los detalles y el manejador de entrada emitía únicamente `startup_failed`, sin permitir identificar el conflicto.

Se retira exclusivamente la instancia de fondo previamente identificada y se conserva el watcher del propietario. La API de desarrollo pasa a ser la instancia activa; no se cambia el puerto ni se detienen otros procesos Node. La comprobación real posterior devuelve ready 200 con `database=up`; el login web responde 200 y el endpoint administrativo web sin sesión permanece en 401.

El manejador de arranque publica código y mensaje de una lista cerrada para `EADDRINUSE`, `EACCES` y `EADDRNOTAVAIL`, más el puerto numérico validado cuando está disponible. Los demás errores reciben un diagnóstico genérico. No se serializan mensaje original, stack, objetos de error, direcciones ni configuración que puedan contener secretos o datos personales. El filtrado estricto del logger general se conserva.

Si `listen` falla, se llama a `app.close()` para liberar pools, temporizadores y hooks, conservando el error original para el diagnóstico. El proceso mantiene salida 1. No se adopta automáticamente otro puerto: Next.js debe seguir apuntando al puerto explícitamente configurado.

Validación: `npm test` aprobó 16/16 pruebas sin omitidas. Una prueba ocupa un puerto real y ejecuta el punto de entrada en un proceso hijo sin conexión DB/Auth; confirma salida 1, código `EADDRINUSE` y puerto correcto. Otra verifica diagnósticos conocidos y rechazo de mensajes/códigos arbitrarios con secretos de prueba. `npm run lint`, `npm run typecheck:api` y `npm run build:api` aprobados. No cambia OpenAPI, cliente, esquema ni configuración remota. Los logs de esta pasada están ignorados en `.tmp/admin-enable-20261106/startup-tests.txt`.

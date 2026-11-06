# ADR 0014 — Familia de direcciones HTTP configurable en servidor

Fecha: 2026-11-06. Estado: aceptada para habilitar la prueba administrativa local.

Durante la activación de M4, la resolución dual-stack de Supabase Auth en este equipo Windows tardó aproximadamente 9,4 segundos. Una petición HTTP fría tardó 10,7 segundos y excedió los límites existentes de Auth web (10 segundos) y JWKS de NestJS (2 segundos). La resolución IPv4 tardó unos 13 milisegundos. Aumentar tiempos de espera no resuelve la causa observada.

Se incorpora `HTTP_DNS_FAMILY=auto|4|6`, solo en los servidores Next.js y NestJS. Sin configurar o con `auto`, se conserva `fetch` normal. Para `4` o `6`, un `Agent` de Undici selecciona la familia de conexión; los agentes se reutilizan por familia. Undici queda fijado a 7.30.2 en ambas aplicaciones y en el lockfile. La configuración privada de este equipo usa `4`; los ejemplos conservan `auto` para otros entornos.

Los adaptadores existentes mantienen sus límites, redirecciones restringidas, validación TLS, autorización y política de caché. El transporte se conecta a JWKS y consultas Auth en la API, Auth del servidor web, medios y Storage para que estos servicios tengan un comportamiento consistente. No se modifican certificados, DNS del sistema ni opciones globales del proceso. No hay dependencia nueva en el navegador ni cambio del contrato API.

Con IPv4, la petición fría JWKS real devolvió 200 en 144 ms. El Route Handler de login respondió 401 `INVALID_CREDENTIALS` en 1.124 ms ante una identidad sintética de dominio `.invalid`; no se creó usuario ni se usaron credenciales personales. Esta prueba verifica conectividad, no acredita acceso del OWNER ni inscripción MFA.

La prueba de transporte usa un servidor HTTP IPv4 real: verifica éxito por IPv4, rechazo por IPv6, cancelación y error de configuración. Pasaron 14 pruebas base API, 18 financieras con PostgreSQL temporal y 42 web. Lint, typecheck y builds API/web pasaron. El cliente generado no cambió. Auditoría de producción: cero avisos en las cinco categorías.

La variable afecta HTTP saliente de estos adaptadores; la conexión PostgreSQL mantiene su configuración TLS independiente. En un entorno con conectividad normal se debe dejar `auto`. Una selección incompatible falla sin relajar TLS ni conceder acceso.

Referencias: [dispatcher de fetch en Node.js](https://nodejs.org/api/globals.html#fetch), [Agent de Undici](https://github.com/nodejs/undici/blob/main/docs/docs/api/Agent.md), [evidencia de activación](../MIGRACIONES_SUPABASE_B3_B5.md).

# ADR 0012 — Sesión administrativa y revisión web M4

Fecha: 2026-11-05. Estado: implementada; resultados y límites en ESTADO_FRONTEND.md y ESTADO_BACKEND.md.

## Decisión

La web administra Auth únicamente desde servidor con `@supabase/supabase-js` 2.118.0, la misma versión fijada en la API. No se incorpora un cliente Supabase al navegador. Login por contraseña, TOTP, inscripción del primer factor, renovación y logout usan rutas limitadas `/admin/auth/*`. No hay registro público de administradores ni recuperación que omita MFA.

Los tokens se mantienen en cookies HttpOnly, SameSite Strict, Secure bajo HTTPS, sin Domain y con path `/admin`. El access token se divide en hasta tres fragmentos de 3000 caracteres; refresh separado, límite conjunto controlado. Son credenciales emitidas por Auth, no una autorización derivada del contenido de la cookie. La cookie dura como máximo ocho horas desde su escritura; su presencia no sustituye la vigencia de sesión, allowlist o MFA en servidor. No se guardan tokens en URLs, localStorage o props de React.

Las lecturas normales no reescriben credenciales. Logout/invalidación dejan una marca HttpOnly independiente `signed_out`, sin token, rol ni PII, que bloquea la sesión local aunque una renovación anterior termine después y vuelva a escribir tokens. Solo un login nuevo la elimina. Su plazo de un año supera la duración de las credenciales de ocho horas y las respuestas tardías; no concede autorización. La prueba de caída de Auth detectó la carrera original y ahora comprueba también la reaparición simulada de cookies antiguas.

Se usa el SDK estándar con persistencia y auto-refresh deshabilitados y cliente nuevo por solicitud, en lugar del adaptador browser/SSR compartido de `@supabase/ssr`: todo acceso a Auth y a los tokens ocurre en servidor. Las rutas que pueden escribir cookies restauran/renuevan la sesión con `setSession`. Los Server Components leen el access token y consultan NestJS; si venció se vuelve al login, donde «Continuar sesión existente» permite renovar sin escribir cookies durante el render.

`GET /api/v1/admin/session` devuelve solo identificador administrativo, rol y necesidad/plazo de MFA. AdminGuard valida firma, usuario y allowlist; el endpoint confirma existencia/plazo de la sesión Auth. AAL1 permite preparar TOTP sin acceder a órdenes. Con MFA reciente se ejecuta además la autorización financiera de B5, que comprueba sesión y factor vigentes. Se reutilizan los permisos de metadatos Auth de B5; no hay migración nueva.

Las lecturas y escrituras financieras web pasan por `/admin/api/*`, con una lista explícita de las rutas B5, cliente OpenAPI generado y Bearer obtenido de cookies. No es un proxy de URL arbitraria, no lee PostgreSQL ni usa Storage directamente. NestJS sigue siendo la autoridad para roles OWNER/ADMIN, versiones, idempotencia, importes y transiciones. Las mutaciones de sesión y negocio exigen Origin exacto y rechazan solicitudes cross-site. El cuerpo JSON se limita a 8 KiB.

Los comprobantes se descargan a través del proxy B5 y una respuesta web privada/no-store. La vista usa un blob temporal revocable, sin optimizador de imágenes ni URL de Storage; PDF en iframe sandbox. La copia descargada queda bajo responsabilidad del operador. Las páginas/rutas administrativas llevan no-store, noindex y no-referrer. Cambios de autenticación usan navegación completa para descartar estado privado del cliente. Un control periódico y al volver a la pestaña, más el límite temporal visible de MFA, fuerzan revalidación; cada endpoint financiero comprueba siempre la autorización independientemente de esos controles UI.

Cada decisión tiene confirmación previa y un payload/UUID de idempotencia fijados en memoria. Una respuesta ambigua conserva ambos para reintentar la misma intención. Un conflicto de versión bloquea nuevos intentos hasta actualizar el detalle. Recargar la página no reenvía decisiones automáticamente. Dinero escrito en decimal se convierte con BigInt a centavos; fechas del banco se interpretan explícitamente en America/Santo_Domingo (UTC-04:00).

## Límites operativos

Auth aplica los límites de su proveedor; la web añade un techo compartido de 60 intentos/minuto por proceso para login/MFA/renovación. No se confía en IPs de X-Forwarded-For. Límites distribuidos, protección de borde y CAPTCHA siguen en M6. No se afirma resistencia DDoS.

Logout solicita revocación de la sesión actual al proveedor y borra cookies locales. Si no se confirma la revocación se muestra un error explícito; no se presenta como cierre remoto confirmado. No se solicitan contraseñas/códigos por chat, no se provisionan cuentas remotas y no se modifica la lista de administradores desde la web.

Antes de revocar se renueva el access token si venció: un 401 por token expirado no demuestra revocación del refresh token. Si falla Auth, se cierra la sesión local, se conserva la barrera de logout y el login explica la revocación remota pendiente, sin sugerir un reintento que ya no cuenta con las credenciales borradas.

Las pruebas integradas usan PostgreSQL real, NestJS, SDK Supabase, JWT/JWKS firmados y adaptadores HTTP locales de Auth/Storage. El servidor web de pruebas usa una copia temporal y puerto propio, conservando el servidor de desarrollo abierto. Estas pruebas no certifican Auth/Storage del proyecto remoto ni sustituyen la prueba autorizada en staging.

## Referencias consultadas

- [Supabase: sesiones y almacenamiento de cookies en servidor](https://supabase.com/docs/guides/auth/sessions).
- [Supabase: Auth SSR y renovación](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
- [Supabase: MFA](https://supabase.com/docs/guides/auth/auth-mfa).
- Guías de Route Handlers, cookies asíncronas y autenticación de la versión instalada de Next.js, en `apps/web/node_modules/next/dist/docs/`.

El índice changelog.md no pudo consultarse por el proveedor web (tipo text/markdown no soportado) ni por la red restringida de shell. Se verificaron las APIs mediante documentación oficial y el SDK instalado, sin actualizar su versión.

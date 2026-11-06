# Corrección del login administrativo — 2026-11-06

Actualización posterior: el propietario autorizó el proceso completo de desarrollo sin TOTP, con capacidad privada y vencimiento. Se añadió almacenamiento privado local de pruebas y una orden DEMO pendiente; operación actual en [prueba completa](DESARROLLO_PRUEBA_COMPLETA.md). El diagnóstico y corrección Auth originales siguientes conservan su alcance histórico; no se desactivó Auth ni se eliminaron factores.

## Causa comprobada

Los registros remotos muestran login Auth 200 seguido del rechazo SQLSTATE 42501 al comprobar la sesión; el usuario sí pasó la allowlist. El rol `sorteos_runtime` carece de USAGE sobre Auth, aunque B5 concedió SELECT limitado sobre metadatos. La API transformaba el fallo en 503 `SERVICE_UNAVAILABLE` y la web usaba un mensaje genérico. No hay evidencia de contraseña incorrecta en esos intentos.

Supabase aloja Auth en un esquema cuyo dueño es `supabase_admin`. `postgres` no puede conceder USAGE a un rol personalizado en este proyecto. La [guía oficial](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7) explica este caso. El dato relevante es el permiso efectivo, no que el migrador haya terminado sin error.

## Corrección aplicada

[Migración 20261106051455](../infra/supabase/migrations/20261106051455_admin_auth_session_checks.sql): comprobación booleana privada de administrador/sesión/factor, sin dar acceso a tablas Auth ni heredar roles generales. Se sustituyen las consultas directas de sesión y del guarda financiero y se retira SELECT Auth del runtime. Continúan firma JWT, usuario real, allowlist activa, vigencia de sesión y TOTP reciente. Revisión de privilegios y decisiones en [ADR 0016](decisions/0016-hosted-auth-session-boundary.md).

La web diferencia indisponibilidad API, error interno y red. No se accedió a contraseñas, tokens de sesión o secretos TOTP del propietario; no se modificaron su cuenta, factores ni permisos administrativos.

## Verificación local

- PostgreSQL temporal con `USAGE auth` retirado del runtime: 18/18 pruebas financieras y de sesión aprobadas. Incluye revocación, MFA, rol, conciliación, idempotencia, rollback y recuperación/reaplicación de ambas migraciones. Se comprobó que el helper falla sin contexto y no concede EXECUTE a otros roles ni SELECT Auth al runtime.
- Integración M4: 14/14 con navegador, Next.js, NestJS y PostgreSQL reales, JWT/JWKS y adaptadores locales Auth/Storage. Incluye primera inscripción TOTP y Firefox/WebKit móvil; no acredita login remoto del propietario.
- Web: 43/43 pruebas unitarias/componentes. Lint API/web, typecheck API/cliente y builds API/cliente/web aprobados. Generación OpenAPI/cliente sin cambios.
- Comandos: `scripts/test-backend-local.ps1 -PasswordAuthentication -Port 54345 -TestScript test:payments`; mismo runner con 54346 y `test:m4`; `npm run test --workspace @sorteos/web`; `npm run lint`; lint web; `npm run typecheck:api`; `npm run build:api`; build web con configuración de producción; `npm run generate:api`. Logs ignorados `auth-boundary-*` en `.tmp/admin-enable-20261106/`.

Sin pruebas omitidas en esas suites. La primera ejecución PostgreSQL dentro del sandbox no pudo iniciar el servicio; se repitió fuera del sandbox con éxito y ambas instancias temporales se detuvieron al terminar. El asesor posterior a la aplicación conserva únicamente los tres avisos remotos previos, sin alteraciones de configuración: funciones públicas [anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)/[authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No aparecieron avisos nuevos por el helper privado.

## Preparación remota y límite de autorización

Se respaldaron `sorteos` e historial con TLS verificado, sin exportar Auth. `pg_restore --list` confirmó formato legible; no se afirma una restauración ensayada. Evidencia privada e ignorada: `.tmp/admin-auth-boundary-20261106/`. El dry-run oficial propone exactamente `20261106051455_admin_auth_session_checks.sql`, sin seeds ni roles.

El primer intento de `db push` fue rechazado por la revisión automática porque la autorización previa cubría B3–B5. No se intentó otra vía. El propietario respondió explícitamente «Autorizo la migración», lo que autoriza la corrección concreta revisada. El bloqueo de aprobación queda resuelto.

## Aplicación remota y resultado

Tras la autorización se verificaron los hashes normalizados de los seis SQL contra el manifiesto del respaldo. Un nuevo dry-run propuso solo la corrección; `node .tmp/admin-auth-boundary-20261106/run.cjs apply` la aplicó con el CLI oficial y TLS verificado. El segundo dry-run dio `upToDate=true`, sin pendientes, y `list_migrations` confirmó las seis versiones. No se alteraron los cinco SQL anteriores ni se ejecutaron seeds/roles.

La consulta de privilegios confirmó propietario `postgres`, `search_path=''`, EXECUTE del runtime y cero concesiones de ejecución ajenas al propietario/runtime. El runtime sigue sin USAGE Auth y ya no tiene SELECT directo sobre las columnas de sesión/factor.

Una conexión real, en transacción de solo lectura con `SET LOCAL ROLE sorteos_runtime`, verificó: contexto ausente → false; contexto del OWNER y su sesión existente → true; sesión, usuario o administrador distintos → false; acceso directo a `auth.sessions` → rechazo 42501. La comprobación financiera devolvió false, coherente con cero factores verificados. Se usaron únicamente identificadores de metadatos en memoria, sin recuperar tokens, contraseñas o secretos MFA. Evidencia privada `.tmp/admin-auth-boundary-20261106/verification.json`.

La API existente sigue en 3001: ready 200 con DB up. Web login 200; órdenes web sin sesión 401. No se arrancó una API adicional. Se conservan un administrador activo, cero órdenes/holds/reportes y 16 tablas con RLS. El propietario debe reintentar el login y configurar/verificar TOTP en su navegador; no se declara ese paso personal ejecutado por estas comprobaciones. Storage privado real sigue pendiente para probar comprobantes.

Recuperación: conservar las versiones previas y corregir hacia adelante con una migración revisada. No borrar auditoría/Auth, no conceder roles generales ni relajar MFA para restaurar acceso. El seed DEMO existente se reutilizó exclusivamente en las bases locales temporales de pruebas; no se ejecutó en remoto.

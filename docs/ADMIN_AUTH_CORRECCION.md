# Corrección del login administrativo — 2026-11-06

## Causa comprobada

Los registros remotos muestran login Auth 200 seguido del rechazo SQLSTATE 42501 al comprobar la sesión; el usuario sí pasó la allowlist. El rol `sorteos_runtime` carece de USAGE sobre Auth, aunque B5 concedió SELECT limitado sobre metadatos. La API transformaba el fallo en 503 `SERVICE_UNAVAILABLE` y la web usaba un mensaje genérico. No hay evidencia de contraseña incorrecta en esos intentos.

Supabase aloja Auth en un esquema cuyo dueño es `supabase_admin`. `postgres` no puede conceder USAGE a un rol personalizado en este proyecto. La [guía oficial](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7) explica este caso. El dato relevante es el permiso efectivo, no que el migrador haya terminado sin error.

## Corrección preparada

[Migración 20261106051455](../infra/supabase/migrations/20261106051455_admin_auth_session_checks.sql): comprobación booleana privada de administrador/sesión/factor, sin dar acceso a tablas Auth ni heredar roles generales. Se sustituyen las consultas directas de sesión y del guarda financiero y se retira SELECT Auth del runtime. Continúan firma JWT, usuario real, allowlist activa, vigencia de sesión y TOTP reciente. Revisión de privilegios y decisiones en [ADR 0016](decisions/0016-hosted-auth-session-boundary.md).

La web diferencia indisponibilidad API, error interno y red. No se accedió a contraseñas, tokens de sesión o secretos TOTP del propietario; no se modificaron su cuenta, factores ni permisos administrativos.

## Verificación local

- PostgreSQL temporal con `USAGE auth` retirado del runtime: 18/18 pruebas financieras y de sesión aprobadas. Incluye revocación, MFA, rol, conciliación, idempotencia, rollback y recuperación/reaplicación de ambas migraciones. Se comprobó que el helper falla sin contexto y no concede EXECUTE a otros roles ni SELECT Auth al runtime.
- Integración M4: 14/14 con navegador, Next.js, NestJS y PostgreSQL reales, JWT/JWKS y adaptadores locales Auth/Storage. Incluye primera inscripción TOTP y Firefox/WebKit móvil; no acredita login remoto del propietario.
- Web: 43/43 pruebas unitarias/componentes. Lint API/web, typecheck API/cliente y builds API/cliente/web aprobados. Generación OpenAPI/cliente sin cambios.
- Comandos: `scripts/test-backend-local.ps1 -PasswordAuthentication -Port 54345 -TestScript test:payments`; mismo runner con 54346 y `test:m4`; `npm run test --workspace @sorteos/web`; `npm run lint`; lint web; `npm run typecheck:api`; `npm run build:api`; build web con configuración de producción; `npm run generate:api`. Logs ignorados `auth-boundary-*` en `.tmp/admin-enable-20261106/`.

Sin pruebas omitidas en esas suites. La primera ejecución PostgreSQL dentro del sandbox no pudo iniciar el servicio; se repitió fuera del sandbox con éxito y ambas instancias temporales se detuvieron al terminar. Los tres avisos remotos previos del asesor se conservan, sin alteraciones de configuración: funciones públicas [anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)/[authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se afirma una comprobación posterior a una migración que aún no se aplicó.

## Preparación remota y límite de autorización

Se respaldaron `sorteos` e historial con TLS verificado, sin exportar Auth. `pg_restore --list` confirmó formato legible; no se afirma una restauración ensayada. Evidencia privada e ignorada: `.tmp/admin-auth-boundary-20261106/`. El dry-run oficial propone exactamente `20261106051455_admin_auth_session_checks.sql`, sin seeds ni roles.

La revisión automática rechazó la ejecución de `db push`: considera que la autorización previa cubre B3–B5 y exige aprobación explícita para esta nueva migración remota que cambia la frontera de autorización de Auth. No se aplicó la corrección remota ni se intentó por otra vía. El login remoto permanece bloqueado hasta esa aprobación y aplicación. Esta limitación no se presenta como fallo de las credenciales del propietario.

Tras aprobar: ejecutar el helper revisado `node .tmp/admin-auth-boundary-20261106/run.cjs apply`, confirmar segundo dry-run sin pendientes, verificar permisos/ejecución bajo `SET LOCAL ROLE sorteos_runtime`, repetir asesores y permitir al propietario reintentar login/TOTP en la web existente. No crear una API adicional.

Recuperación: conservar las versiones previas y corregir hacia adelante con una migración revisada. No borrar auditoría/Auth, no conceder roles generales ni relajar MFA para restaurar acceso. El seed DEMO existente se reutilizó exclusivamente en las bases locales temporales de pruebas; no se ejecutó en remoto.

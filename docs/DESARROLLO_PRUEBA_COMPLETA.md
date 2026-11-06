# Prueba completa de desarrollo — 2026-11-06

La petición del propietario amplía temporalmente el acceso sin TOTP al recorrido M1–M4. El login conserva contraseña real de Supabase, JWT, allowlist y sesión vigente. Las reglas de órdenes, reservas, pago manual e idempotencia continúan aplicándose. [Decisiones y límites](decisions/0018-development-full-workflow.md).

## Uso en esta máquina

- [Administración](http://127.0.0.1:3000/admin/login): iniciar sesión o recargar la pantalla anterior; la API devuelve acceso de desarrollo y la web abre órdenes directamente.
- [Rifa DEMO](http://127.0.0.1:3000/rifas/demo-prueba-completa/participar): cantidad, pre-reserva, formulario y archivo en una sola acción. Precio: RD$100 por número, 100 números, compra de 1 a 20.
- [PDF de prueba](http://127.0.0.1:3000/development/comprobante-demo.pdf): documento sintético con aviso NO ES UN PAGO. Descargarlo y adjuntarlo al formulario; utilizar datos DEMO y referencia ficticia explícita. No realizar transferencias.

La ventana actual finaliza el **6 de noviembre de 2026 a las 7:01 p. m.**, hora de Santo Domingo (`2026-11-06T23:01:02.000Z`). Después se exige nuevamente MFA y la rifa DEMO deja de aceptar nueva pre-reserva por su fecha de fin. Las órdenes con comprobante no vencen ni liberan números por terminar la prueba; requieren resolución administrativa normal.

Se creó una única orden mediante el formulario normal de Chromium en 3000, con comprador `CLIENTE DEMO - PRUEBA INTEGRADA`, correo `.invalid`, teléfono reservado 555, PDF de prueba válido y referencia que declara ausencia de transferencia. Resultado: PENDING_REVIEW, reporte REPORTED, cliente `is_demo=true` y un número RESERVED mostrado solo después del commit. El PDF quedó privado. No se aprobó esa orden en remoto en nombre del propietario: queda disponible para que él pruebe las decisiones.

Las comprobaciones fallidas previas al envío exitoso no crearon órdenes ni reportes. Sus pre-reservas técnicas HELD conservan el TTL normal. No se cancelaron órdenes ni se alteró inventario para limpiar la evidencia.

La web y API ya están iniciadas en 3000/3001. No iniciar instancias duplicadas. Los PID/logs de sus lanzadores siguen en `.tmp/admin-login-test-runtime/`. Los `.env`, capacidades y respaldos permanecen ignorados por Git.

## Configuración y preparación reproducible

API privada: `ADMIN_DEVELOPMENT_MFA_TOKEN` aleatoria de 64 hex, `ADMIN_DEVELOPMENT_MFA_UNTIL` ISO UTC futura y `DEVELOPMENT_LOCAL_RECEIPTS=true`. Solo development/test y loopback. La capacidad jamás debe copiarse a Next.js. En la web puede ajustarse `ADMIN_LOGIN_WITHOUT_TOTP_UNTIL` al mismo plazo para que el formulario comunique el acceso de prueba; la autorización completa la decide NestJS/DB.

Después de aplicar las migraciones con el CLI oficial, ejecutar desde raíz, con el entorno privado configurado:

```powershell
$env:DEVELOPMENT_SETUP_ENABLED = 'true'
npm run dev:prepare --workspace @sorteos/api
```

Esta herramienta NestJS conserva el OWNER y datos existentes, prepara únicamente el slug DEMO fijo y rehúsa sobrescribir una rifa ajena a ese fixture. Las concesiones se auditan y no se eliminan. No usar el seed B1 antiguo en remoto ni activar una cuenta DEMO como real; el CHECK de banco continúa intacto.

Los archivos públicos generados en `apps/web/public/development` son únicamente imagen propia y PDF ficticio para subir. Los comprobantes enviados se guardan aparte en `.tmp/development-receipts` y solo se descargan a través del proxy autenticado. Para staging/producción deben configurarse Supabase Storage privado y sus claves de servidor; no se declara esa configuración completada.

## Aplicación y evidencia remota

Se aplicaron `20261106203619_development_admin_access` y `20261106205731_development_demo_checkout` con el CLI oficial, respaldo previo y TLS verificado. Los dry-run posteriores quedaron sin pendientes. Backups de esquema/historial, manifiestos y logs ignorados en `.tmp/development-full-flow/remote/` y `remote-demo/`; `pg_restore --list` verificó formato, sin afirmar restauración ensayada.

Una conexión real con SET LOCAL ROLE sorteos_runtime verificó capacidad OWNER/sesión válida, checkout DEMO autorizado y guarda financiero sin TOTP. La auditoría se comprobó y la transacción de verificación se revirtió; no produjo decisiones ni pagos. Esa prueba no sustituye el login personal del propietario. Evidencia privada: `runtime-verification.json`, `guest-result.json` y `guest-confirmation.png` en `.tmp/development-full-flow/`.

La inspección remota confirmó una rifa DEMO publicada, una cuenta DEMO inactiva, una concesión vigente y ninguna cuenta DEMO incorrectamente activada. El asesor posterior conserva los tres avisos anteriores: funciones públicas ejecutables por [anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)/[authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se alteraron esas opciones ni se desplegó.

## Verificación local

La prueba integrada cubre login sin TOTP, checkout de la rifa DEMO con cuenta correctamente marcada, archivo privado local real, aprobación desde navegador, paso a SOLD y rechazo al vencer la concesión. La regresión normal con MFA también se ejecutó. El problema de CORS del servidor aislado se corrigió manteniendo orígenes exactos; no se relajó CORS del producto.

La primera preparación detectó el CHECK que prohíbe cuentas DEMO activas. La transacción se revirtió y se cambió el flujo para conservar `is_demo=true,active=false`, con aceptación solo bajo la capacidad y para el slug DEMO. El primer envío PDF en Node watch expuso el fallo de mensajes internos del worker, corregido con una prueba de regresión. No se presentan esos intentos como éxitos.

Resultados actuales, sin omitidas: **19/19** pruebas base API; **88/88** integración PostgreSQL (incluidas **19/19** financieras); **16/16** integración de navegador M4; **45/45** web. Lint API/web, typecheck API/cliente y builds API/cliente/web aprobados. Se generaron OpenAPI 0.5.2 y cliente tipado. La suite de esquema sustituyó su antigua suposición «cero SECURITY DEFINER» por una lista exacta de tres helpers privados, comprobando propietario, search_path vacío, ACL sin concesiones ajenas a propietario/runtime y denegación a un rol externo incluso con USAGE del esquema.

Comandos ejecutados: `npm test`; `npm run lint`; `npm run typecheck:api`; `npm run lint --workspace @sorteos/web`; `npm run test --workspace @sorteos/web`; `npm run generate:api`; `npm run build:api`; build web con `API_MODE=live`, `APP_ENV=production` y URL API HTTPS; `scripts/test-backend-local.ps1 -PasswordAuthentication -Port 54345 -TestScript test:integration`; mismo runner con `test:payments`; runner 54346 con `test:m4`. Los PostgreSQL temporales se detuvieron al terminar; la web/API de uso del propietario se conservaron. Logs ignorados `.tmp/development-full-{foundation,backend,payments,m4,build}.txt`.

Comprobación final de la instancia de uso: login 200, rifa/formulario DEMO 200, PDF sintético descargable 200, administración anónima 401, ready 200 con DB up. En remoto: una orden PENDING_REVIEW, un reporte REPORTED, un comprador explícitamente DEMO y un número RESERVED; cero cuentas DEMO activadas como reales. La aprobación/cancelación sin TOTP se verificó en las suites aisladas y la capacidad real se verificó bajo runtime, sin usar credenciales personales del propietario.

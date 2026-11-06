# Activación administrativa y migraciones remotas B3–B5

Fecha: 2026-11-06. Proyecto: el configurado en `apps/api/.env`, mismo proyecto de B1/B2. Autorización explícita del propietario: «Sí» a aplicar B3/B4/B5 y arrancar la API local para habilitar Administración.

## Aplicación realizada

Se reutilizó el CLI oficial Supabase 2.122.0 y su único historial. Conexión de sesión del pooler en 5432, TLS `verify-full` y CA ya configurada. `db push --skip-vault --dry-run` propuso exactamente estos tres archivos, sin seeds ni roles; luego se aplicaron con `db push --skip-vault --yes`. B1/B2 conservaron sus versiones y hashes. No se editaron los SQL aplicados ni se usó un segundo mecanismo de historial.

| Versión | Nombre | Resultado |
|---|---|---|
| 20261104022108 | checkout_holds_b3 | Aplicada y confirmada |
| 20261104030210 | order_receipts_b4 | Aplicada y confirmada |
| 20261104035954 | admin_payments_b5 | Aplicada y confirmada |

SHA-256 de los SQL normalizados a LF:

- B3: `c4832c47b1e2f5cabc99b8e8880acd1f4d35a02d4eaa89d4e13bc9cd6e0a39e2`.
- B4: `fe7c9da5c11771a084fa3556e8c145c465ab0e3926f206c71eaffe8f2df63dc9`.
- B5: `e9bf0e4a55c9dd4ade0c6bbabc5db2635c941e99e9812be6d6b0cf46bb38ada6`.

Un segundo dry-run confirmó `upToDate=true`, sin migraciones pendientes. `list_migrations` confirmó las cinco versiones B1–B5.

## Respaldo y conservación

Antes de aplicar se creó un respaldo local custom de `sorteos` y `supabase_migrations` mediante `pg_dump`; `pg_restore --list` comprobó que el archivo es legible. No se afirma una restauración ensayada: se verificó el formato/listado. No se exportaron tablas, credenciales ni secretos de Auth. Respaldo, manifiesto de hashes y logs redactados en `.tmp/admin-enable-20261106/`, ignorado por Git.

Órdenes, holds y reportes: cero antes y después. Se conservó el único OWNER activo. No se crearon rifas, cuentas bancarias, compradores, órdenes, comprobantes o usuarios. No se modificaron contraseñas ni factores Auth.

Recuperación: seguir [infra/recovery](../infra/recovery/README.md). Los down vacíos exigen ausencia completa de datos, incluida auditoría; no utilizarlos para borrar la cuenta administrativa o su histórico. Con datos, preparar migración correctiva y usar el respaldo según el procedimiento autorizado. La existencia del dump no autoriza una restauración destructiva.

## Verificaciones reales

- Esquema `sorteos`: 16 tablas, todas con RLS; `anon`/`authenticated` sin USAGE del esquema.
- Políticas B5 sobre `auth.sessions` y `auth.mfa_factors`: SELECT restringido a `sorteos_runtime`, contexto de usuario/sesión del servidor.
- Permisos Auth limitados a nueve columnas de metadatos: sessions `id,user_id,not_after,aal,factor_id`; mfa_factors `id,user_id,status,factor_type`. No se concedió lectura de secretos.
- API local en `127.0.0.1:3001`: ready 200 con DB up; catálogo 200; sesión y órdenes administrativas sin JWT devuelven 401.
- Web en `127.0.0.1:3000`: formulario real habilitado, campos operables en Chromium; navegación anónima a `/admin/ordenes` redirige a `/admin/login`; API web de órdenes devuelve 401.
- JWKS real de Auth responde 200 con ES256, compatible con AdminGuard. La verificación del login del OWNER con su contraseña y TOTP corresponde al propietario; no se pidieron ni usaron esos secretos por chat.
- El OWNER tiene cero factores TOTP verificados al activar. El flujo de primera entrada debe inscribir y verificar el autenticador antes de consultar órdenes.

La configuración local web se cambió de mock a live y se tomaron URL/clave publicable del servidor API existente. Se corrigió el origen a `127.0.0.1` en ambos servicios. Los archivos `.env` siguen ignorados y no se copiaron claves privilegiadas a la web. Se conservaron respaldos de la configuración anterior. La API se inició en segundo plano, sin ventana visible, usando el build actualizado y los mismos parámetros de DB con TLS.

Se corrigió además la demora DNS local mediante `HTTP_DNS_FAMILY=4` en ambos servidores, con Undici 7.30.2 y validación TLS intacta. JWKS frío pasó de unos 10,7 segundos a 144 ms; el login real con una identidad sintética `.invalid` devolvió 401 `INVALID_CREDENTIALS` en 1.124 ms. No se cambió contraseña, se creó usuario ni se probó acceso del OWNER con esta solicitud. Decisión y límites en [ADR 0014](decisions/0014-server-http-address-family.md).

Verificaciones del cambio de transporte: `npm test` 14/14; runner PostgreSQL local `test:payments` 18/18; pruebas web 42/42; lint API/web, typecheck y builds API/web aprobados; `npm run generate:api` sin cambios del contrato/cliente. No hubo pruebas omitidas en estas suites. Auditoría de dependencias de producción sin avisos. Logs locales en `.tmp/admin-enable-20261106/`. No se repitió la suite completa de navegadores M4 contra proveedores locales: su evidencia anterior se conserva en el estado frontend y no se presenta como validación remota.

## Límites pendientes

Corrección posterior del arranque, 2026-11-06: se retiró la API compilada iniciada en segundo plano al comprobar que impedía al watcher del propietario ocupar 3001. La instancia de desarrollo quedó activa, con ready 200 y DB up. Los fallos de escucha ahora muestran un diagnóstico seguro y cierran recursos; pruebas y decisión en [ADR 0015](decisions/0015-api-startup-diagnostics.md). No iniciar una segunda API mientras el watcher siga activo.

No se ha verificado el login personal ni la inscripción TOTP real del OWNER. No hay órdenes para revisar. Falta configurar/verificar la clave de Storage de servidor y el bucket privado antes de probar creación de órdenes o acceso a comprobantes; esta autorización no creó buckets ni publicó datos bancarios.

El asesor posterior ya no reporta las seis tablas sin políticas que correspondían al cierre B2. Conserva tres avisos previos: permisos de `public.rls_auto_enable` para [anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), y [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se alteraron esas opciones fuera del alcance aprobado.

No se desplegó la aplicación ni se habilitaron ventas reales. El resultado habilita la prueba local de acceso contra el proyecto Supabase autorizado; no sustituye la simulación completa en staging.

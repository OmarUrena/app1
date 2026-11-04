# Aplicación remota de B1/B2

Fecha: 2026-11-01. Proyecto: el configurado en apps/api/.env (archivo privado ignorado por Git).
Autorización explícita del usuario: «Aplica las migraciones».

## Ejecución

CLI oficial Supabase 2.122.0 del repositorio. Se verificó previamente historial
vacío y ausencia del esquema sorteos. El dry-run mostró exactamente los dos SQL
esperados, sin seeds. Se aplicaron con db push, --skip-vault y conexión de sesión
5432 con sslmode=verify-full y certificado raíz oficial. La conexión runtime del
backend conserva el pool transaccional configurado, también con TLS verificado.
No se modificaron los wrappers que restringen las herramientas DEMO a loopback.

| Versión | Nombre | Resultado |
|---|---|---|
| 20261102010448 | domain_b1 | Aplicada y confirmada por SQL y list_migrations |
| 20261102020713 | catalog_admin_b2 | Aplicada y confirmada por SQL y list_migrations |

SHA-256 de los SQL con saltos LF normalizados:

- B1: `355ebe4209d7295bd2f415ec174efa85a717e03c350a50329aae2bf1f03aa54b`
- B2: `b830760f93e70068362c7ecb883cc2fb81d34518402831c7fc63d7abbb739a19`

Estos archivos ya tienen historial remoto: los cambios posteriores deben hacerse
con nuevas migraciones, sin editar versiones aplicadas.

## Verificación posterior de solo lectura

- Esquema sorteos con las 13 tablas esperadas; RLS habilitado en todas.
- 13 políticas de acceso del servidor; anon y authenticated sin USAGE del esquema
  ni privilegios de lectura/escritura en las tablas.
- sorteos_runtime NOLOGIN, sin superusuario, BYPASSRLS, CREATEDB, CREATEROLE ni
  replicación; el usuario de conexión tiene la membresía necesaria.
- Cero filas de negocio. No se cargó seed DEMO ni se crearon administradores,
  rifas, órdenes, cuentas bancarias, usuarios Auth u objetos Storage.
- El backend con la configuración real respondió: health 200, ready 200,
  catálogo 200 con items=[], cuentas públicas 200 con items=[] y admin 401 sin JWT.

## Avisos del asesor de seguridad

El asesor reportó seis INFO rls_enabled_no_policy para customers, guest_sessions,
orders, order_tickets, payment_reports y payment_incidents. El cierre es intencional
en B2: estas tablas no tienen permisos para el runtime del catálogo ni acceso de
cliente. Se añadirán permisos mínimos en las fases que implementen esas operaciones.
[Referencia del aviso](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

También reportó dos WARN sobre EXECUTE de la función preexistente
public.rls_auto_enable, para anon y authenticated. La inspección confirmó retorno
event_trigger, asociación a un evento DDL y search_path=pg_catalog. Esta función
no la crean B1/B2; sus permisos quedan para revisión específica. No se la invocó
ni se alteró como parte de estas migraciones.

- [Aviso para anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- [Aviso para authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Pendientes de operación

- OWNER autorizado y provisionado el 2026-11-03 (ver actualización debajo).
  Falta probar administración HTTP con una sesión real de ese usuario.
- Preparar las imágenes propias y su bucket público cuando se configure la primera rifa.
- Usar un login dedicado de runtime antes de un despliegue productivo; separar
  las credenciales del migrador. El rol limitado ya está preparado y verificado.
- Esta entrega aplica esquema y comprueba lecturas; no publica sitio ni rifa,
  realiza pagos ni prueba una compra real.

## Alta operativa de OWNER — 2026-11-03

Después de la aplicación inicial, el usuario seleccionó explícitamente un UUID
de Supabase Auth y autorizó su rol OWNER. Se comprobó la identidad existente,
no anónima, no eliminada y sin bloqueo vigente; la allowlist estaba vacía.
El alta manual de operación se ejecutó en transacción bajo el mismo bloqueo
de bootstrap, con contexto SYSTEM y request_id, sin cambiar roles existentes.
La verificación independiente confirmó OWNER activo y un evento INSERT en
audit_logs. No se alteró Auth, su contraseña, Storage ni el historial de migraciones.
Los comandos locales siguen rechazando bases remotas. No se guardan UUID personales
en este documento ni se solicita enviar contraseñas o tokens al chat.
La prueba de acceso HTTP con la sesión real del propietario continúa pendiente.

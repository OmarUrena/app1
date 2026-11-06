# ADR 0016 — Comprobación privada de sesiones en Supabase alojado

Fecha: 2026-11-06. Estado: implementación local probada; aplicación remota pendiente de aprobación explícita.

Los intentos reales del propietario llegaron a Auth con respuesta 200 y pasaron la allowlist de NestJS. Después falló la consulta de `auth.sessions` con SQLSTATE 42501. La inspección remota confirmó `has_schema_privilege('sorteos_runtime','auth','USAGE')=false`: tener SELECT sobre nueve columnas no garantizaba poder consultarlas. La comprobación anterior de la activación fue incompleta respecto al acceso efectivo del rol.

En este proyecto `supabase_admin` posee el esquema Auth. `postgres` tiene USAGE sin opción de concederlo y no pertenece al propietario. La documentación oficial describe este comportamiento: un GRANT puede terminar sin dar el permiso. Repetirlo, agregar membresía `authenticated` o elevar el rol de negocio no constituye una solución de privilegio mínimo.

Se crea `sorteos.admin_auth_session_valid(boolean)` como frontera privada de lectura. Devuelve únicamente un booleano, sin parámetros de identidad arbitrarios, filas ni secretos. Verifica rol de invocación `sorteos_runtime`, contexto ADMIN, administrador activo, coincidencia de usuario y sesión y plazo vigente. Para revisión financiera exige además sesión AAL2 con factor TOTP verificado del mismo usuario. La frescura del MFA sigue comprobándose en `assert_financial_admin` y NestJS.

El helper requiere SECURITY DEFINER para acceder al esquema administrado. Esta es una decisión de encapsulación limitada basada en el patrón específico documentado por Supabase, no una conversión general de las funciones de negocio: `assert_financial_admin` permanece SECURITY INVOKER. El helper pertenece al migrador `postgres`, tiene `search_path=''`, referencias de tablas calificadas y ningún SQL dinámico. Se revoca EXECUTE de PUBLIC y de los roles de API; únicamente el propietario y `sorteos_runtime` pueden ejecutarlo. El esquema `sorteos` sigue sin USAGE para anon/authenticated. Se retira el SELECT directo del runtime sobre las nueve columnas Auth; no se añaden membresías ni BYPASSRLS.

La sesión AAL1 llama al helper con `false` para permitir inscripción TOTP. Los guardas financieros llaman con `true`. Un contexto ausente o incompatible falla cerrado. Se preservan comprobaciones de firma, usuario Auth, allowlist, sesión revocada, factor vigente y MFA reciente; no se confía en metadatos editables ni banderas del navegador.

La corrección es una migración nueva creada con el CLI, `20261106051455_admin_auth_session_checks.sql`. Los cinco SQL aplicados previamente no cambian. El rollback local vacío B5 también retira el helper y repara ambas versiones con el CLI antes de reaplicar; conserva Auth y rechaza datos de negocio. En remoto se requiere corrección hacia adelante: no volver al acceso directo inválido, borrar sesiones ni restaurar un dump para forzar acceso.

Se añaden mensajes web específicos para indisponibilidad API, error interno y conexión. No se muestran diagnósticos SQL ni datos de credenciales al usuario. No cambia el contrato HTTP ni el cliente generado.

Referencia: [Supabase: permisos de roles personalizados sobre Auth](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7), en especial la frontera privada de lectura de sesiones; [sesiones y revocación](https://supabase.com/docs/guides/auth/sessions). Evidencia operativa y autorización pendiente en [corrección de acceso](../ADMIN_AUTH_CORRECCION.md).

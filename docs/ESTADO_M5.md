# M5 — Operación diaria integrada

Fecha: 2026-11-06. Desarrollo exclusivamente en main, sin nuevas ramas/worktrees.

## Implementación

- `/admin`: instantánea de inventario, ocupación, órdenes e incidencias pendientes; ingresos PAID separados de importes pendientes. Agregados monetarios enteros como cadenas decimales.
- `/admin/rifas`, `/admin/rifas/nueva`, `/admin/rifas/:id`: listado paginado/filtro, editor de premio, fotos propias, reglas/versiones, importes y fechas dominicanas. Vista previa, alta/edición reales, publicar/pausar/reanudar/cerrar. Bloqueo visible de numeración/precio, versión para evitar sobrescrituras y confirmación accesible de acciones.
- `/admin/reportes`: CSV autorizado/auditado, filtros, límite 10000 sin truncado y sin contactos, identidad, referencias bancarias, boletos ni archivos.
- Consulta cliente existente `/orden/confirmacion`, con cookie protegida, actualiza estado también después del cierre. Sin cookie, el código solo no da acceso. Asistencia por canal verificado sin inventar proveedor de OTP o soporte.
- Migración `20261106232520_operations_m5.sql`: metadata no sensible de auditoría y trigger de cierre. No cambia permisos públicos ni tablas Auth; se conservan las 17 tablas RLS.
- Cierre irreversible: primero PAUSED, luego cero holds vigentes; se verifica bajo bloqueo también en PostgreSQL y exige autorización financiera. Conserva órdenes, números e histórico; admite conciliación posterior. DRAWN sigue prohibido.
- Fotografías: NestJS decodifica, limita píxeles/tamaño y normaliza WebP sin metadatos; UUID sin sobrescritura. Se verifica bucket público de premios separado del privado. Compensación si falla la auditoría. Adaptador local explícito, restringido a loopback development/test, separado de comprobantes.

Decisiones previas a implementación: [ADR 0020](decisions/0020-daily-operations.md).
Contrato/cliente generado: OpenAPI 0.6.0.

## Verificación actual

| Verificación | Resultado |
|---|---|
| PostgreSQL general: `scripts/test-backend-local.ps1 -PasswordAuthentication -Port 54345 -TestScript test:integration` | PASS 92/92; incluye recuperación vacía y pruebas M5 de indicadores, cierre, CSV y versión |
| Regresión financiera final: mismo runner con `-TestScript test:payments` | PASS 24/24, también protección financiera del cierre en PostgreSQL y subida normalizada a adaptador HTTP de Storage público |
| Web: `npm test --workspace @sorteos/web` | PASS 46/46, incluyendo centavos exactos con agregados mayores que Number.MAX_SAFE_INTEGER |
| Base API: `npm test`; configuración: `npm run test:config` | PASS 20/20 y 9/9 |
| Navegador M5: runner PostgreSQL con `-TestScript test:m5` | PASS 5/5 (escenario principal y cuatro flujos), sin omitidas; alta, vista previa, fotos, publicación, edición/reanudación, pausa/hold/cierre, compra, aprobación posterior, consulta privada, dashboard y CSV |
| Regresión navegador M4: runner con `-TestScript test:m4` | PASS 16/16, sin omitidas; Chromium, Firefox y WebKit móvil, incluyendo perfil temporal completo sin TOTP y vuelta a MFA al vencer |
| Lint: raíz y web; typecheck: API/cliente/web | PASS |
| `npm run build:api` y build web con APP_ENV production, API_MODE live, API HTTPS de ejemplo y Auth vacío | PASS, incluye todas las rutas nuevas |
| `npm run generate:api` | PASS; OpenAPI/cliente 0.6.0, consulta CSV sin paginación silenciosa |
| Axe móvil M5 y revisión visual desktop/móvil | PASS sin incidencias serious/critical ni desbordamiento horizontal; capturas en frontend/screenshots/m5 |

Los tests usan PostgreSQL/NestJS/Next reales, JWT/JWKS reales y adaptadores locales del protocolo Auth/Storage. No certifican servicios bancarios ni Storage remoto. La regresión financiera final incluye rechazo en PostgreSQL de un ADMIN con sesión financiera válida que intenta cerrar directamente, además del control OWNER de la API.

Durante QA se corrigieron un selector ambiguo del harness, la expectativa de 401 ante consulta sin cookie, CORP de fotos públicas locales entre puertos y el nombre accesible del logo. El harness compila las rutas compartidas antes de abrir pestañas para evitar recargas de next dev durante la navegación; no reintenta acciones de negocio ni rebaja validaciones.

## Situación remota y límites

Supabase conserva las ocho migraciones previas. Dry-run identifica únicamente M5 pendiente; no se ha aplicado esta nueva migración. Respaldo privado local `.tmp/m5-migration/before-m5.dump`, formato verificado con pg_restore --list y hashes de migraciones guardados. La aplicación remota exige autorización aparte según PLAN_DESARROLLO; terminar pruebas locales no autoriza cambios remotos ni despliegue.

El entorno actual no dispone de SUPABASE_STORAGE_KEY para fotos/comprobantes en Storage remoto. El adaptador local permite pruebas de desarrollo; staging/producción requiere configurar y verificar el bucket público de premios, el privado de comprobantes y sus credenciales de servidor. Nunca se publican comprobantes.

Se dejó preparada la configuración privada local DEVELOPMENT_LOCAL_MEDIA=true y la base de fotos http://127.0.0.1:3001/api/v1/media. La API recargó su configuración y se reinició únicamente el launcher web existente de este proyecto en 3000; se conservó una única API en 3001. Comprobación posterior: readiness API 200, login web 200 y consulta administrativa anónima 401. No se cambió el plazo ni la capacidad temporal MFA. Las rutas M5 que requieren la nueva columna/trigger seguirán pendientes de aplicar la migración remota; no se acredita su ejecución en esa base.

No se declara lanzamiento ni requisitos legales aprobados. La política legal definitiva de retención/anonimización, canal de asistencia verificado, pruebas en dispositivos físicos, carga y despliegue pertenecen a M6/M7 y sus autorizaciones. No se borran datos para simular un cierre limpio. Las fotos subidas y aún no vinculadas a una rifa no se eliminan automáticamente; revisar objetos huérfanos fuera de transacciones y con auditoría antes de habilitar operación real.

Asesores remotos antes de M5: persisten los tres avisos conocidos, sin cambios remotos realizados: ejecución pública/autenticada de public.rls_auto_enable y protección de contraseñas filtradas desactivada. Remediaciones oficiales: [anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Recuperación

En instalación vacía usar infra/recovery/m5-down-empty.sql dentro de transacción y reparar exclusivamente la versión M5 con el CLI oficial. El script rechaza cualquier dato; no vaciar auditoría para forzarlo. Con datos, conservar respaldo y realizar una corrección hacia adelante. No reabrir rifas cerradas ni liberar reservas como recuperación técnica. El seed DEMO existente se reutiliza: sin cuentas reales, premios reales ni aprobaciones inventadas.

Siguiente hito propuesto: M6, después de la aceptación de M5. No iniciado.

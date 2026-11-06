# Changelog

## Activación administrativa local con Supabase — 2026-11-06

- Aplicadas B3/B4/B5 con autorización explícita, CLI oficial e historial original. B1/B2 y datos administrativos conservados; sin seeds ni nuevas órdenes.
- Respaldo previo, segundo dry-run sin pendientes, 16 tablas RLS y permisos Auth limitados verificados. API local arrancada: ready 200 y administración anónima 401.
- Web local cambiada de demo a live con la configuración publicable existente; formulario y redirección anónima verificados en Chromium. Configuración privada ignorada por Git.
- Corregida la demora DNS local de Auth mediante familia HTTP configurable en servidor y Undici 7.30.2; TLS y límites conservados. JWKS frío 200 en 144 ms y login inválido real 401 en 1.124 ms. Ver ADR 0014.
- Verificación: 14 pruebas base API, 18 financieras PostgreSQL y 42 web; lint, typecheck y builds aprobados, cliente generado sin cambios y auditoría de producción sin avisos.
- Login/TOTP personal del OWNER y Storage real siguen pendientes. Sin despliegue, buckets nuevos o ventas; evidencia en docs/MIGRACIONES_SUPABASE_B3_B5.md.

## Consolidación Git en main — 2026-11-05

- Todo el desarrollo integrado y M4 se guardan en main, con el historial previo backend/frontend conservado y un respaldo local del worktree antiguo.
- main pasa a ser la única rama de trabajo y la predeterminada del repositorio; se retiran las ramas por fases/capas y el worktree activo adicional.
- AGENTS, README, plan y prompts recogen la instrucción permanente de no crear ramas ni worktrees. Ver ADR 0013.

## M4 — Revisión administrativa integrada — 2026-11-05

- Frontend F5 conectado a B5: login Auth en servidor, MFA TOTP, inscripción inicial, renovación y logout, bandeja, detalle, comprobante privado e historial.
- Decisiones con confirmación bancaria/conciliación, rol OWNER/ADMIN, expectedVersion e idempotencia estable ante respuesta perdida; sin expiración de órdenes.
- Nuevo GET /api/v1/admin/session, OpenAPI/cliente 0.5.1 y ADR 0012. Sin migración nueva ni cambio remoto.
- Pruebas financieras, componentes y navegador con PostgreSQL/JWT reales y proveedores Auth/Storage de pruebas; servidores web aislados para conservar la sesión de desarrollo abierta. Resultados y límites en docs/ESTADO_FRONTEND.md#m4.
- Cierre local: 18/18 financieras/sesión, 42/42 web, 14/14 integración M4 y todos los 80 escenarios públicos/demo verificados entre pasada inicial y repetición de fallidos; lint/typecheck/build aprobados. No se presenta como una pasada única de 80/80.
- Corregida la carrera de logout detectada en la integración: las lecturas no reescriben credenciales sin renovación y una barrera de cierre impide recuperar acceso con cookies de respuestas tardías. Se conserva la prueba de regresión.

## Plan de desarrollo integrado — 2026-11-05

- Secuencia única M0–M7 en docs/PLAN_DESARROLLO.md; backend y frontend se implementan y verifican en una misma sesión y carpeta.
- AGENTS, README, planes técnicos, prompts, estados y QA alineados con hitos conjuntos, conservando los identificadores B/F y su evidencia histórica.
- Próximo hito funcional M4: completar F5 sobre B5 y comprobar las dependencias M1–M3 incorporadas. No se declara la integración probada por esta actualización.
- ADR 0011 registra la decisión. Cambios exclusivamente documentales, sin migraciones, cambios de contrato ni despliegue.

## Integración frontend F2–F4 — 2026-11-05

- Incorporados catálogo real, pre-reserva, formulario único con comprobante y confirmación protegida desde feat/frontend-f4 a la carpeta principal, conservando el backend B5 y los cambios documentales pendientes.
- Incorporadas pruebas, capturas y decisiones originales. Inicio web live desde raíz con npm run dev:web, puerto 3000.
- No se modifican migraciones ni servicios remotos.

## Revisión B5 — 2026-11-05

- Completada la documentación pendiente de la implementación B5 ya existente:
  contrato real de las ocho rutas, MFA reciente/sesión vigente, roles,
  expectedVersion e idempotencia, conciliación y proxy privado de comprobantes.
- Ejemplos de aprobación/cancelación corregidos con confirmaciones y versión
  obligatorias; condiciones de reembolso y duplicado documentadas.
- Añadidos ADR 0009, QA de revocación/concurrencia y recuperación B5. Estado y
  evidencia de la revisión en docs/ESTADO_BACKEND.md#b5.
- Regresión completa local: 108 pruebas aprobadas (86 de integración SCRAM,
  incluidas 17 B5), sin fallos ni omitidas; lint, typecheck, build y generación
  del cliente correctos. PostgreSQL temporal detenido al terminar.
- No se aplicaron migraciones remotas ni se desplegó. La validación con Auth y
  Storage reales sigue pendiente; el siguiente hito funcional es B6.

## Documentación — 2026-11-05

- Estados B0–B4 consolidados en docs/ESTADO_BACKEND.md y F0–F1 en
  docs/ESTADO_FRONTEND.md, con resumen y evidencias históricas por fase.
- Retirados los siete informes separados; referencias y enlaces a capturas
  actualizados. Se conservan planes, contrato, decisiones y documentos técnicos.
- Cambio exclusivamente documental; no se repiten pruebas de aplicación.

## Sin publicar — B4 — 2026-11-03

- POST multipart de orden + comprobante y GET protegido por sesión de invitado;
  correo obligatorio, validación server-side y números solo tras commit.
- Orden PENDING_REVIEW/reporte REPORTED y HELD -> RESERVED atómicos; idempotencia
  por sesión, clave y hash del payload/archivo. Sin aprobación ni expiración de órdenes.
- Storage privado real por SDK, staging durable, compensación y job de limpieza
  que no borra adjuntos confirmados. Validación JPG/PNG/PDF en worker aislado;
  bytes originales/SHA-256, sin claves/PII/diagnósticos de parsers en logs.
- Migración B4 nueva con email obligatorio en nuevas escrituras, permisos mínimos,
  comprobante adjunto exigido en DB y recuperación protegida; sin editar B1/B2/B3.
- Cliente tipado incluye helper multipart, OpenAPI 0.4.0, configuración y guías.
  Supabase JS 2.118.0, sharp 0.35.5 y pdf-lib 1.17.1 fijados en lockfile.
  No se aplica B3/B4 remoto, crea buckets ni despliega; F4/B5 siguen separados.
- Verificación final local: 91 pruebas aprobadas, 69 de integración SCRAM;
  auditoría de producción sin vulnerabilidades. Ver docs/ESTADO_BACKEND.md#b4.

## Requisito acordado — 2026-11-03

- Correo obligatorio para nuevas órdenes B4/F4: contrato, planes y QA actualizados;
  validación y cambio de persistencia pendientes de B4, sin editar migraciones aplicadas.
- Plan B7 explicita protección DDoS en borde/origen, límites distribuidos y alertas;
  no se ha configurado un proveedor ni certificado resistencia DDoS.

## Sin publicar — B3 — 2026-11-03

- Sesión invitada HttpOnly/CSRF, holds idempotentes por sesión y consulta/cancelación
  protegidas; snapshot de precio/TTL, sin números ni órdenes en respuestas.
- Inventario atómico bajo lock de rifa y Fisher-Yates parcial con crypto.randomInt;
  límites de simultáneos y altas horarias en PostgreSQL con HMAC de IP.
- Job por instancia y liberación lazy exclusivamente de HELD vencidos; RESERVED,
  SOLD y holds consumidos se conservan. Auditoría sin secretos ni IP cruda.
- Migración B3 nueva y recuperación protegida; B1/B2 aplicadas no se modifican.
  Pruebas de concurrencia sobre dos instancias, aislamiento de sesión, abuso,
  cancelación, expiración y recuperación; runner local con opción SCRAM.
- Contrato, OpenAPI/cliente generado, variables, README y ADR actualizados.
  No se aplica B3 remoto ni se despliega. CAPTCHA externo pendiente de proveedor.
- 72 pruebas aprobadas (51 de integración SCRAM, con 50 solicitudes en dos
  instancias para 20 boletos, sin duplicados), lint/typecheck/build y
  compatibilidad tipada del frontend correctos. Ver docs/ESTADO_BACKEND.md#b3.

## Sin publicar — Continuación B2 — 2026-11-03

- OWNER remoto autorizado por UUID, validado contra Auth y provisionado en la
  allowlist con auditoría; pendiente la prueba HTTP de su sesión real.
- Detectado fallo del CI publicado de B2 en integración. El fixture del login
  limitado ahora usa una contraseña aleatoria, compatible con PostgreSQL SCRAM;
  no cambia permisos del producto ni migraciones aplicadas.
- Verificación local: 60 pruebas aprobadas, incluidas 40 de integración bajo
  SCRAM; lint, typecheck, build y contrato generado correctos. Lecturas HTTP
  sobre Supabase repetidas correctamente. Nueva ejecución remota del CI pendiente.

## Sin publicar — B2 — 2026-11-01

- Nueva rama feat/backend-b2, conservando B1 y cambios existentes de frontend.
- Catálogo público y cuentas habilitadas; administración de rifas con validación,
  transacciones, paginación, publicación/pausa/reanudación y auditoría.
- JWT ES256/RS256 vía JWKS, confirmación de usuario Auth y allowlist activa; alta
  inicial manual local sin autoasignación de roles al registrarse.
- Rol PostgreSQL limitado, aprobación de OWNER y derechos de medios; verificación
  externa de imágenes fuera de transacciones y detección de edición concurrente.
- OpenAPI, cliente tipado con Bearer opcional, env y guías actualizados. Recuperación
  selectiva B2, reparación del historial oficial y reaplicación comprobadas.
- B1/B2 aplicadas en Supabase con autorización explícita: historial conservado,
  13 tablas con RLS, runtime limitado y verificaciones HTTP de solo lectura correctas.
  No se cargaron fixtures ni se crearon administradores/usuarios remotos.
- Auditoría de producción sin alertas; se mantiene el aviso moderado de minimatch
  en herramientas de desarrollo. Avisos preexistentes de permisos del event trigger
  público documentados. CI de esta rama y publicación del sitio no ejecutados.

## 0.2.0 — 2026-11-01 — B1 validada localmente

- Confirmado el CI remoto exitoso de B0; nueva rama `feat/backend-b1`.
- Supabase CLI 2.122.0 fijado como único sistema de migraciones.
- Esquema privado con 13 tablas, constraints, índices, auditoría y RLS cerrada.
- Inventario generado por rifa, importes enteros y snapshots protegidos; integridad
  diferida de reservas/órdenes/reportes y conservación del histórico contable.
- Seed DEMO reejecutable, comandos locales protegidos y plan de recuperación.
- 39 pruebas aprobadas: 19 sin DB y 20 de integración PostgreSQL, con migración,
  seed, integridad, RLS y recuperación comprobados en bases desechables.
- Corregidas la configuración TLS del migrador loopback y la sintaxis PL/pgSQL
  detectadas en las primeras ejecuciones reales.
- Auditoría de producción sin alertas; aviso moderado de minimatch pendiente en
  herramientas de desarrollo. CI remoto B1 y despliegue todavía no realizados.

## 0.1.1 — 2026-10-29

- Instalación pnpm con lockfile y acceso de red verificada; CI usa frozen lockfile.
- Express declarado directamente, correcciones strict de CORS y lint de DTO.
- OpenAPI y cliente tipado generados; lint, typecheck y build aprobados.
- 17 pruebas aprobadas: configuración, HTTP y PostgreSQL 17.5 aislado.
- Overrides de multer y js-yaml corrigen alertas de seguridad; auditoría posterior
  sin vulnerabilidades reportadas. B0 validado localmente; no se ha desplegado.

## 0.1.0 — 2026-10-27

- Inicio de backend B0 en rama `feat/backend-b0`.
- API NestJS, configuración validada, errores uniformes, cabeceras seguras,
  CORS restringido, rate limit, logs sin contenido sensible y health checks.
- Generación OpenAPI/cliente, pruebas HTTP e integración PostgreSQL, CI.
- Seis pruebas de configuración aprobadas con Node, sin dependencias externas.
- Instalador PowerShell local de pnpm JavaScript y verificaciones backend;
  reintento de descarga aún bloqueado por EACCES de red en la sesión.
- No hay cambios de datos ni funcionalidad de compras. Validación ejecutable
  pendiente por restricciones de dependencias del entorno; ver `docs/ESTADO_BACKEND.md#b0`.

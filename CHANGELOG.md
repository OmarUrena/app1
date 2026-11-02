# Changelog

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
  pendiente por restricciones de dependencias del entorno; ver `docs/ESTADO_B0.md`.

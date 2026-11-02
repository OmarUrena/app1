# Changelog

## Frontend F2 — 2026-11-01

- Inicio, catálogo paginado y detalle conectados a B2 mediante cliente generado; snapshots del contrato sincronizados desde backend sin ediciones manuales.
- Inventario coherente con disponibilidad, fecha de consulta y actualización manual; reglas, premio, límites, formato de números y fechas de participación reales.
- Vacío, 404, caída y rate limit con mensajes seguros y recuperación; imágenes con directorio público autorizado y fallback.
- Modo live predeterminado. Se conserva demo explícito de desarrollo; compra deshabilitada hasta B3/B4.
- Pruebas unitarias y de navegador, con harness opcional NestJS/PostgreSQL local y capturas F2. Ver docs/frontend/ESTADO_F2.md.
- ADR de preparación renumerado 0006 para no colisionar con B2; decisiones de integración en ADR 0007.

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

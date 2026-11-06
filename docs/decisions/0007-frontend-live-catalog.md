# ADR 0007 — Catálogo público F2 conectado a B2

Fecha: 2026-11-01. Estado: aceptada.

## Contexto

B2 está implementado en el checkout principal, aún sin commit al iniciar F2. El frontend continúa en `feat/frontend-f2`, worktree `.tmp/frontend-f2`. Se sincronizan sin modificaciones el contrato Markdown, OpenAPI y los dos archivos del cliente compartido desde B2. No se implementan ni cambian servicios backend desde esta rama; para ejecutar el conjunto hay que integrar también la entrega B1/B2.

## Decisiones

- Consultar NestJS con operaciones del cliente generado. `connection()` fuerza render por solicitud y todas las lecturas usan `no-store`; React `cache` deduplica únicamente detalle/metadatos del mismo render. Timeout de 10 segundos, sin reintentos automáticos.
- Separar resumen de tarjeta de detalle. No inventar reservas, categorías, especificaciones, fechas ni imágenes que el listado no ofrece. El detalle toma todos sus conteos de un único snapshot `availability`, muestra `asOf` y permite actualizarlo manualmente. La consulta no garantiza cupo.
- Mostrar paginación real del servidor. B2 no ofrece búsqueda ni filtros públicos; se conservan solo en el modo visual demo. No disfrazar un filtro de doce resultados de búsqueda global.
- Las rutas públicas B2 solo exponen PUBLISHED; PAUSED/CLOSED/DRAFT producen 404. Explicar esa posible indisponibilidad sin intentar consultar rutas admin. Los estados demo permanecen para regresión visual.
- Admitir imágenes HTTPS solo bajo un directorio público explícito de premios, tanto en el mapeo como en Next Image. Sin configuración, sin archivo o ante error: placeholder. No permitir comodines de host, URLs firmadas ni buckets privados de comprobantes.
- Implementar el acceso tipado de cuentas públicas sin mostrar instrucciones de transferencia. Compra y cuentas de transferencia en UI esperan B3/B4 y F3/F4; no hay órdenes, holds ni números asignados en F2.
- Los fallos del catálogo se muestran separados del vacío real, con correlación segura y recuperación explícita. Nunca sustituir API caída por fixtures. El modo demo sigue prohibido en builds de producción.

## Verificación y límites

Pruebas del mapeo y del cliente, regresión F1 y prueba opcional con NestJS/PostgreSQL reales, descritas en `docs/frontend/ESTADO_F2.md`. No hay cambios de datos persistentes ni despliegue. La integración local reutiliza el setup B2 con base efímera y proveedores Auth/media exclusivos de tests; no certifica Supabase remoto ni iPhone físico.

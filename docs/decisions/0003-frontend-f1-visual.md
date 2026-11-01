# ADR 0003 — Dirección visual F1 y catálogo de demostración

Fecha: 2026-10-29. Estado: aceptada por confirmación del propietario de GUIA_VISUAL.md.

## Decisión

El sistema visual pasa del fondo claro/lima de F0 a fondos petróleo oscuros, acentos dorados, títulos Georgia y tipografía de sistema para interacción. Sustituye únicamente la decisión visual del ADR 0002. Se conserva la arquitectura Next.js y el cliente generado del backend.

La aplicación se adapta primero a 360 px: cabecera compacta, navegación inferior Inicio/Rifas/Ayuda y controles táctiles. A partir de 768 px el catálogo ocupa dos columnas; desde 1024 px, hasta tres, con detalle y resumen en columnas. En el detalle móvil, la acción para ir a la vista previa de participación sustituye a la barra inferior.

F1 incorpora inicio, catálogo buscable/filtrable, detalle de premio, reglas y ayuda. La cantidad es una vista previa local: no calcula importes de compra, no reserva cupo, no emite números y no permite enviar órdenes. La compra requiere B3/B4 y F3/F4. No se incorporan favoritos, perfiles, cuentas bancarias ni sorteos.

## Datos e imágenes

Los modelos de presentación F1 son independientes de DTOs aún no implementados; se nombran RaffleView y no se presentan como un contrato de API. Solo API_MODE=mock carga fixtures mediante importación dinámica. En live se muestra catálogo en preparación; nunca se sustituyen datos fallidos por demos. El modo mock sigue prohibido durante build de producción.

Los fixtures son cinco ejemplos rotulados DEMO: con cupo, pausado, sin cupo y cerrado. Cada uno mantiene total = sold + reserved + held + available. El porcentaje expresa solo sold, incluso cuando toda la disponibilidad restante está reservada. No se inventan fechas, bancos ni ganadores.

Las tres fotografías conceptuales se generaron con la herramienta incorporada imagegen y se copiaron a apps/web/public/images/demo. Los prompts y la procedencia se conservan en docs/frontend/ASSETS_F1.md. Next Image optimiza el tamaño servido; las imágenes originales permanecen disponibles en el proyecto. No representan bienes reales ofrecidos ni marcas patrocinadoras.

## Validación y convivencia con otra sesión

No se modifica backend ni el contrato de negocio. El cliente OpenAPI existente permanece intacto. No cambian dependencias o scripts raíz.

Playwright puede reutilizar un servidor existente solo mediante PLAYWRIGHT_REUSE_SERVER=1. Antes de hacerlo se verificó que localhost:3000 respondía con el rediseño y la banda DEMO; cada smoke test vuelve a comprobar esa banda. Por defecto CI inicia un servidor propio con mock/test y no reutiliza otro. No se detiene el servidor del usuario.

El estado final, resultados, capturas y límites se documentan en docs/frontend/ESTADO_F1.md. No se despliega ni se interviene en datos.

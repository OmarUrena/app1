# Diseño F1 — composición y comportamiento

Fecha: 2026-10-29. Implementa la dirección aprobada en [GUIA_VISUAL.md](GUIA_VISUAL.md). No define endpoints ni autoriza compras.

## Composición móvil

```text
INICIO                       CATÁLOGO
Marca · buscar · menú        Marca · buscar · menú
Banda DEMO                   Banda DEMO
Foto hero + mensaje          Título editorial
Acción: descubrir premio     Buscar por premio / categoría
Tres datos del proceso       Filtros de estado
Rifas destacadas             Conteo de resultados
Tarjeta SUV                  Tarjetas en una columna
Tarjeta portátil             Vacío recuperable si no coincide
Cómo funciona                Información del proceso
Footer                       Footer
Inicio · Rifas · Ayuda        Inicio · Rifas · Ayuda
```

```text
DETALLE                      AYUDA
Cabecera y banda DEMO        Cabecera y banda DEMO
Volver a rifas               Título introductorio
Galería + miniaturas         Tres pasos explicados
Título y descripción         Preguntas desplegables
Precio y estado demo         Aviso de no transferir
Inventario diferenciado      Enlace al catálogo
Cantidad local, sin hold     Footer
Compra deshabilitada         Inicio · Rifas · Ayuda
Información conceptual
Reglas
Proceso de participación
Acción fija: ir al resumen
```

En detalle, galería y descripción breve preceden al precio, estado y cantidad, antes de las reglas extensas. La acción inferior permite llegar rápidamente al resumen. El botón de compra se muestra deshabilitado con una explicación explícita.

## Composición escritorio

Contenedor de hasta 1200 px con navegación superior. Hero panorámico: texto a la izquierda y premio a la derecha. Inicio: dos tarjetas de premio y un bloque editorial; catálogo: hasta tres columnas. Detalle: galería/descripcion/reglas a la izquierda y panel de precio/estado/cantidad a la derecha. Ayuda: contenido principal y aviso lateral. El panel es sticky solo si la altura disponible lo permite.

## Interacciones

- Búsqueda local por nombre o categoría, tolerante a tildes y mayúsculas.
- Filtros Todas, Con cupo, Pausadas, Sin cupo y Cerradas; estado visible mediante aria-pressed.
- Vacío con botón para limpiar búsqueda y filtros.
- Tarjetas con enlaces al detalle; sin acciones interactivas anidadas dentro de un enlace global.
- Galería del SUV con dos vistas; selección por botones con nombre y estado accesibles.
- Cantidad editable con límites y validación de enteros. Cambiarla no crea ninguna reserva ni calcula un cobro.
- Preguntas frecuentes con details/summary nativo.
- Menú móvil desplegable, cerrado al usar sus enlaces; navegación inferior con aria-current.
- Live permanece como armazón sin datos ficticios. Mock muestra banda global y rótulos sobre fotos/precios/cifras.

## Piezas reutilizadas

Header, Footer, BottomNavigation, Button, Input, Alert, Badge, EmptyState, RaffleCard, PrizeGallery, PricePanel, AvailabilityMeter, RaffleRules, StatusTag, PurchaseQuantity y FAQ. Los iconos son SVG propios de trazo uniforme y las fuentes proceden del sistema; no se cargan fuentes remotas.

## Comprobación visual

Las capturas finales se conservarán en screenshots/f1 para inicio, catálogo, detalle, ayuda y login a 360, 768 y 1280 px. Las capturas de F0 se conservan por separado. Los controles de navegador verifican además teclado, búsqueda, estados, validación de cantidad y galería.

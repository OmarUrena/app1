> Actualización F2 (2026-11-01): el catálogo ya está conectado y verificado con B2. Ver [ESTADO_F2.md](ESTADO_F2.md). El contenido siguiente conserva el registro de F1.

# Frontend F1 — rediseño de App Sorteos

## Actualización de cierre — 2026-11-01

Trabajo en feat/frontend-f2, dentro de .tmp/frontend-f2, sin modificar feat/backend-b0. Se completaron controles pendientes de navegadores y se confirmó la CI remota del commit base.

| Control actual | Resultado |
| --- | --- |
| Lint, typecheck y build producción live | PASS |
| Tests unitarios/componentes | 13 aprobados, incluidos cliente HTTP y recuperación |
| Tests de núcleo | 6 aprobados |
| E2E | 70 aprobados, 0 omitidos, 1.5 minutos |
| Motores | Chromium 360/768/1280 px; Firefox 1280 px; WebKit móvil 390 px |
| Accesibilidad automática | Axe A/AA en inicio, catálogo, detalle, ayuda y login en los cinco perfiles |
| CI base 8b66eb6 | [Frontend exitoso](https://github.com/OmarUrena/app1/actions/runs/41308070025), [Backend exitoso](https://github.com/OmarUrena/app1/actions/runs/41308070038) |
| CI de esta rama nueva | Pendiente de publicarse/integrarse; la CI base no la sustituye |
| Safari en iPhone físico / lector de pantalla humano | No ejecutado; requiere dispositivo/revisión humana |

La ampliación detectó pérdida de la primera búsqueda antes de hidratación y diferencias de foco/tabulación. Se protegieron los controles hasta instalar sus handlers, se añadió tabIndex=0 al enlace de salto y se retiró el scroll suave global. Una regresión retiene los scripts de red y verifica que el buscador no acepte entrada prematura. Las pruebas de teclado no se eliminaron ni se rebajaron. También se priorizó la primera fila de imágenes y se comprobó retry del error boundary.

Evidencia: [inicio WebKit móvil](screenshots/f1-followup/inicio-webkit-mobile.png), [catálogo WebKit móvil](screenshots/f1-followup/catalogo-webkit-mobile.png), [detalle Firefox](screenshots/f1-followup/detalle-firefox-desktop.png). f1-followup conserva diez capturas adicionales.

F1 queda verificado localmente dentro de estos límites. F2 requiere B2: ver [ESTADO_F2.md](ESTADO_F2.md). No se habilitaron compras, transferencias ni autenticación. Las secciones siguientes conservan el registro original.

## Registro original

Fecha: 2026-10-29. Alcance: F1 visual, con datos demo explícitos; sin integración F2 ni compra F3–F4. Guía aprobada por el propietario mediante «Puedes empezar a trabajar».

## Cambios entregados

Se aplicó el sistema visual oscuro y dorado con fotografía conceptual, títulos serif y componentes compartidos. Inicio presenta el premio principal, dos tarjetas y la explicación del proceso. El catálogo permite buscar por premio/categoría sin depender de tildes, filtrar estados y recuperar resultados vacíos. El detalle contiene galería funcional, precio, inventario diferenciado, cantidad de vista previa y reglas. En móvil se priorizan precio y estado antes de las reglas extensas; en escritorio el panel va en una columna lateral.

La navegación móvil tiene Inicio/Rifas/Ayuda y un menú desplegable. En detalle se sustituye por una acción para llegar al resumen. Ayuda utiliza preguntas desplegables accesibles. Login mantiene la explicación de acceso no habilitado y no captura credenciales.

Los cinco fixtures cubren cupo, pausa, agotamiento y cierre. El agotamiento con reservas conserva 70% de vendidos confirmados, sin presentarlo como 100% vendido. La cantidad local no reserva ni calcula cobros; no se envían órdenes. Los importes y fotografías están marcados como DEMO. Live no importa fixtures para mostrarlos y mantiene el catálogo en preparación.

## Archivos y decisiones

- Interfaz y componentes: apps/web/src/app, components y features/raffles.
- Fixtures: apps/web/src/fixtures/catalog.ts, modelo de presentación separado de DTOs.
- Activos: apps/web/public/images/demo, tres imágenes originales generadas con imagegen incorporada. Prompts y procedencia en ASSETS_F1.md.
- Pruebas: apps/web/tests/raffles.test.tsx y tests/e2e/catalog.spec.ts; foundation.spec.ts ampliado.
- Configuración local: .env.local creado desde el ejemplo solo si no existía; ignorado por Git. No se sobreescribió configuración del usuario.
- Documentos: GUIA_VISUAL.md actualizada con aprobación, DISENO_F1.md, ASSETS_F1.md, README/CHANGELOG web y ADR 0003.
- Dependencias, backend, esquema de datos, OpenAPI y cliente compartido: sin cambios en esta fase. No hay migraciones ni despliegue.

## Verificación

Comandos desde la raíz, con Node 24 y dependencias del lockfile existente:

| Control | Resultado | Evidencia |
| --- | --- | --- |
| npm run lint --workspace @sorteos/web | PASS | Sin advertencias |
| npm run typecheck --workspace @sorteos/web | PASS | TypeScript estricto |
| npm run test:core --workspace @sorteos/web | PASS | 6 tests de entorno, moneda, fecha y errores |
| npm run test --workspace @sorteos/web | PASS | 6 tests de componentes y consistencia de fixtures |
| npm run build --workspace @sorteos/web | PASS | Next.js 16.4.3; rutas públicas, ayuda y detalle dinámico |
| npm run test:e2e --workspace @sorteos/web | PASS | 39 tests Chromium en 360/768/1280 px |
| axe WCAG 2 A/AA y 2.1 AA | PASS automatizado | Inicio, catálogo, detalle, ayuda y login sin infracciones detectadas |
| Navegación y estados | PASS | Teclado, menú, filtros, búsqueda, galería, cantidad inválida, pausa/cierre/agotamiento y 404 de ruta inexistente |
| Producción live sin demos | PASS | Servidor temporal en 3101: portada y catálogo no muestran datos ficticios; slug demo no revela su contenido |
| Capturas | PASS | 15 imágenes en screenshots/f1, conservando las de F0 |
| Observación local de rendimiento | Registrada | PERFORMANCE_F1.json; no es una puntuación Lighthouse |
| CI remota | SKIPPED | No se lanzó ni observó GitHub Actions |
| Safari/Firefox y dispositivo físico | SKIPPED | La ejecución observada utiliza Chromium local |

Para build se fijaron API_MODE=live, APP_ENV=production y API_BASE_URL=https://api.example.test/api/v1 únicamente en el proceso de comprobación. La URL es de ejemplo y no se consulta en F1. El servidor temporal de producción se cerró al terminar. El servidor demo del usuario en 3000 se conservó abierto.

Para E2E se reutilizó el servidor existente con PLAYWRIGHT_REUSE_SERVER=1 después de comprobar respuesta 200, banda DEMO y nuevo diseño. Los smoke tests verifican también esa banda. PLAYWRIGHT_BROWSERS_PATH apuntó a .tmp/playwright-browsers dentro del workspace. La CI conserva por defecto un servidor propio configurado mock/test.

## Evidencias visuales

| Pantalla | Móvil 360 px | Escritorio 1280 px |
| --- | --- | --- |
| Inicio | [Captura](screenshots/f1/inicio-mobile.png) | [Captura](screenshots/f1/inicio-desktop.png) |
| Catálogo | [Captura](screenshots/f1/catalogo-mobile.png) | [Captura](screenshots/f1/catalogo-desktop.png) |
| Detalle | [Captura](screenshots/f1/detalle-mobile.png) | [Captura](screenshots/f1/detalle-desktop.png) |
| Ayuda | [Captura](screenshots/f1/ayuda-mobile.png) | [Captura](screenshots/f1/ayuda-desktop.png) |
| Login | [Captura](screenshots/f1/admin-mobile.png) | [Captura](screenshots/f1/admin-desktop.png) |

También se conservan las cinco capturas a 768 px en la misma carpeta.

## Medición local

La portada se observó con Chromium en tres contextos nuevos, sin throttling y con servidor/optimizador ya calentados por E2E. Se registraron FCP de 532/392/260 ms y candidatos LCP de 532/808/860 ms para 360/768/1280 px respectivamente. Son muestras locales de desarrollo, no estimaciones de rendimiento en teléfonos reales ni resultados Lighthouse. El JSON conserva condiciones, tamaños de imagen observados y tiempos; el script apps/web/scripts/measure-ui.mjs permite repetir la observación.

## Incidencias y límites

La primera ejecución encontró un selector de test que coincidía tanto con el error de cantidad como con el anuncio de navegación de Next.js. Se corrigió para verificar la descripción accesible del input, sin quitar ni rebajar la validación. La suite completa posterior pasó. La revisión visual motivó acercar precio y disponibilidad al inicio del detalle móvil y volver a comprobar su composición.

No hay bancos, premios reales, fechas de sorteo o ganadores anunciados. Las imágenes son ilustraciones originales; la tipografía usa fuentes de sistema. No se implementaron favoritos, perfiles ni autenticación simulada. La lectura humana con tecnologías de asistencia y los controles de producción/staging corresponden a verificaciones posteriores; axe no los sustituye.

F1 no integra datos reales: la siguiente fase es F2, dependiente del catálogo B2. Compra, carga de comprobante y confirmación protegida requieren B3/B4 y sus fases frontend. No se alteró la rama backend ni se creó commit desde esta sesión.

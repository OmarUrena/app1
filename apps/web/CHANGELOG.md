# Cambios de frontend

## Rediseño F1 — 2026-10-29

- Aplicada la guía visual aprobada: fondo petróleo, dorado, títulos serif, hero fotográfico y navegación inferior móvil.
- Catálogo demo con búsqueda tolerante a tildes, filtros de estado y recuperación de vacío; detalle con galería, reglas e inventario diferenciado.
- Selector de cantidad local sin reservas, cobros ni órdenes; compra deshabilitada y explicada.
- Ayuda funcional con preguntas desplegables; conservación de estados loading/error/404 y login sin captura de credenciales.
- Tres imágenes originales generadas, persistidas en public/images/demo y documentadas con sus prompts.
- Ampliada la verificación a 39 E2E Chromium y 6 tests de componentes, además de los 6 tests de núcleo. Evidencia visual separada de F0.
- Medición local reproducible de la portada; producción live no publica fixtures. Sin cambios de API ni backend.

## Validación F0 — 2026-10-29

- Dependencias verificadas con lockfile congelado; OpenAPI y cliente compartido generados desde NestJS.
- Chromium y herramientas Playwright descargados en .tmp/playwright-browsers.
- Corregida advertencia ESLint en PostCSS y contraste del pie de la ilustración detectado por axe.
- Playwright usa npm y dirección IPv4 explícita; Next.js recibe la declaración de scroll suave.
- Lint, typecheck, build, 6 tests de núcleo, 3 tests UI y 15 E2E aprobados localmente. Nueve capturas conservadas en docs/frontend/screenshots.
- CI frontend actualizada para respetar el lockfile; ejecución remota pendiente.

## 0.1.0 — 2026-10-27

- Armazón F0 Next.js/React/TypeScript/Tailwind con identidad visual propia y componentes accesibles.
- Inicio, catálogo aún no habilitado, entrada administrativa sin captura de credenciales, loading/error/404.
- Consumo del cliente OpenAPI compartido; configuración de entorno, errores seguros y formatos DOP/UTC.
- Modo demo local visible y prohibido en build productivo.
- Tests de núcleo ejecutados; tests de UI y E2E con axe/capturas preparados y pendientes por restricciones de instalación.

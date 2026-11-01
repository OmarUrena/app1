# Estado frontend F0 — 2026-10-29

Estado: validado localmente. Alcance: armazón frontend F0; no implementación F1–F8. Código en apps/web. Decisiones en docs/decisions/0002-frontend-f0.md.

## Instalación y coordinación

- Se conserva feat/backend-b0. No se creó commit/worktree desde esta sesión. La separación de ramas sigue pendiente de coordinación y permisos Git.
- Instalación desde raíz verificada con pnpm 10.28.2 y --frozen-lockfile, mediante el paquete JavaScript disponible en .tmp/backend-tooling. No se cambiaron versiones ni se habilitaron globalmente scripts opcionales de dependencias.
- Chromium 1248, Headless Shell, FFmpeg y Winldd descargados para Playwright en .tmp/playwright-browsers, mediante acceso de red autorizado.
- docs/openapi.json y packages/api-client/src/generated.ts generados desde NestJS con npm run generate:api. No se inventó otro contrato ni se accedió a una base de datos.
- La primera generación encontró dos parámetros sin tipo en apps/api/src/bootstrap.ts. El usuario autorizó corregirlos, pero otra sesión ya había aplicado los tipos al releer el archivo. Esta sesión no editó código de backend.
- Cambios de esta sesión: apps/web, documentos frontend, ADR 0002 y workflow frontend. Next.js actualiza automáticamente next-env.d.ts durante la compilación.

## Comandos y resultados reales

Los comandos npm se ejecutaron desde la raíz. El prefijo de la instalación fue node .tmp/backend-tooling/node_modules/pnpm/bin/pnpm.cjs.

| Criterio / comando | Resultado | Evidencia |
| --- | --- | --- |
| pnpm install --frozen-lockfile | PASS | Instalación completada respetando el lockfile |
| npm run generate:api | PASS | Exportación NestJS y openapi-typescript completadas |
| npm run lint --workspace @sorteos/web | PASS | ESLint sin advertencias |
| npm run typecheck --workspace @sorteos/web | PASS | TypeScript estricto sin errores |
| npm run test:core --workspace @sorteos/web | PASS | 6 tests: entorno, moneda, fechas y errores |
| npm run test --workspace @sorteos/web | PASS | 3 tests: input accesible, botón deshabilitado y toast |
| npm run build --workspace @sorteos/web | PASS | Next.js 16.4.3, API_MODE=live, APP_ENV=production; 6 páginas generadas |
| npm exec --workspace @sorteos/web -- playwright install chromium | PASS | Descargas completadas dentro del workspace |
| npm run test:e2e --workspace @sorteos/web | PASS | 15 tests Chromium, 36.5 s, 0 fallos en ejecución final |
| axe WCAG 2 A/AA y 2.1 AA | PASS automatizado | Sin infracciones detectadas en /, /rifas y /admin/login a 360/768/1280 px |
| Responsive y navegación | PASS | Sin desbordamiento horizontal, navegación por teclado y regreso al inicio |
| Admin y 404 | PASS en alcance F0 | /admin redirige al placeholder, sin campos de credenciales; ruta inexistente devuelve 404 |
| Capturas | PASS | 9 archivos en docs/frontend/screenshots: inicio, catálogo y admin por cada viewport |
| CI remota | SKIPPED | Workflow preparado con frozen-lockfile; no se ejecutó ni observó GitHub Actions |

Para reproducir descarga y E2E en esta máquina, establecer PLAYWRIGHT_BROWSERS_PATH con la ruta absoluta del workspace seguida de .tmp/playwright-browsers. Ver apps/web/README.md.

## Problemas encontrados y corregidos

- La instalación inicial estaba bloqueada por EACCES/EPERM; ahora las dependencias están disponibles y verificadas.
- ESLint rechazó la exportación anónima de PostCSS; se asignó un nombre a la configuración.
- La primera suite de navegador aprobó 12 tests y detectó 3 fallos de contraste en portada: el pie de la ilustración se superponía al boleto oscuro. Se añadió un fondo legible y la suite completa posterior aprobó los 15.
- El cierre del servidor de la primera ejecución quedó detenido por permisos Windows. Se cerraron únicamente los procesos de prueba identificados. La ejecución final contó con permisos para manejar sus procesos, terminó con código 0 y cerró el servidor.
- Playwright usa npm run dev y 127.0.0.1 para evitar el ejecutable global pnpm y ambigüedades IPv6. Se declaró data-scroll-behavior en html para Next.js.

## Limitaciones y siguiente fase

Validación limitada a F0 local con fixtures vacíos y Chromium. Axe no sustituye revisión humana con lector de pantalla; Safari/Firefox no se probaron. Autenticación real, catálogo integrado, checkout, comprobantes y pagos pertenecen a fases posteriores. No se desplegó, no se aplicaron migraciones ni se modificaron datos productivos.

Siguiente fase: F1, componentes de catálogo y detalle con fixtures explícitos. La integración real del catálogo F2 requiere B2. Antes de ampliar alcance, coordinar rama/worktree independiente con backend.

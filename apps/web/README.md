# App Sorteos — frontend F1

Actualización 2026-11-01: F1 revisado en Chromium, Firefox y WebKit; preparación F2 en feat/frontend-f2. La integración real sigue pendiente del catálogo B2 que desarrolla la otra sesión. Ver docs/frontend/ESTADO_F2.md.

Aplicación web Next.js con prioridad móvil: fondos petróleo oscuros, acentos dorados, fotografía conceptual y títulos editoriales. Usa React, TypeScript estricto y Tailwind. Idioma español dominicano, moneda DOP y hora America/Santo_Domingo.

## Iniciar la web

Desde la raíz, con Node 24 y las dependencias del monorepo instaladas:

```powershell
if (-not (Test-Path apps/web/.env.local)) {
    Copy-Item apps/web/.env.example apps/web/.env.local
}
npm run dev --workspace @sorteos/web
```

Abrir http://127.0.0.1:3000. El ejemplo activa API_MODE=mock y APP_ENV=development. La vista permite explorar cinco rifas de demostración sin órdenes, transferencias ni datos personales. Si ya existe .env.local, respetar su contenido y comprobar esas variables para ver el catálogo demo.

La instalación se administra desde raíz mediante pnpm install --frozen-lockfile. El backend administra el workspace, lockfile y packages/api-client. Generar el cliente compartido con pnpm generate:api después de una instalación limpia. No instalar otro árbol independiente dentro de apps/web. Si pnpm.exe falla en Windows, utilizar el paquete JavaScript local preparado por scripts/install-backend.ps1, sin modificar la instalación global.

## Rutas y comportamiento F1

| Ruta | Contenido |
| --- | --- |
| / | Hero fotográfico, dos premios demo y explicación del proceso |
| /rifas | Búsqueda tolerante a tildes y filtros por estado; vacío recuperable |
| /rifas/[slug] | Galería, precio, estado, inventario, reglas y cantidad local |
| /ayuda | Explicación del proceso y preguntas desplegables |
| /admin/login | Acceso aún no habilitado; no captura credenciales |
| /admin | Redirección al placeholder de login |

El comprador nunca selecciona números. El selector de cantidad es una vista previa sin cálculo de cobro ni hold. El botón de compra permanece deshabilitado y explica que no hay compras en demo. Los porcentajes usan vendidos confirmados; agotamiento, pausa y cierre son estados distintos.

Solo el modo mock carga fixtures. En live se muestra un catálogo en preparación; no se llama a endpoints de negocio todavía ni se sustituyen fallos de API por datos ficticios. La integración real corresponde a F2/B2; las compras, a F3–F4/B3–B4.

## Configuración

| Variable servidor | Uso |
| --- | --- |
| API_MODE | live por defecto; mock únicamente para desarrollo/test |
| APP_ENV | development, test, staging o production |
| API_BASE_URL | URL terminada en /api/v1, HTTPS en staging/production; necesaria al integrar la API |
| NEXT_TELEMETRY_DISABLED | 1 desactiva telemetría de Next.js |
| PLAYWRIGHT_BROWSERS_PATH | Ubicación local de Chromium, para instalación y pruebas |
| PLAYWRIGHT_REUSE_SERVER | 1 permite reutilizar un servidor demo que ya esté abierto durante E2E; por defecto se inicia uno propio |
| PLAYWRIGHT_PORT | Puerto E2E, 3102 por defecto, independiente de la web habitual |

Mock está bloqueado durante build de producción. No exponer estas variables como NEXT_PUBLIC ni agregar secretos a cliente. El armazón live puede compilar sin una API conectada. En esta fase no se envían escrituras de negocio.

## Verificar

```powershell
npm run test:core --workspace @sorteos/web
npm run lint --workspace @sorteos/web
npm run typecheck --workspace @sorteos/web
npm run test --workspace @sorteos/web
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.tmp/playwright-browsers'
npm exec --workspace @sorteos/web -- playwright install chromium firefox webkit
npm run test:e2e --workspace @sorteos/web
```

Usar puerto 3102 libre o establecer PLAYWRIGHT_PORT. Si se reutiliza un servidor con PLAYWRIGHT_REUSE_SERVER=1, confirmar primero la banda DEMO en ese puerto: la suite también la comprueba. El servidor existente no se cierra al terminar. Los E2E cubren Chromium a 360/768/1280 px, Firefox a 1280 px y WebKit móvil a 390 px. La CI inicia su propio servidor mock/test y descarga los tres motores; no observa ni usa datos productivos. WebKit no sustituye una prueba con Safari en un teléfono físico.

Para revisar esta rama desde la raíz original sin cambiar la rama backend:

```powershell
Set-Location -LiteralPath '.tmp/frontend-f2'
if (-not (Test-Path apps/web/.env.local)) {
    Copy-Item apps/web/.env.example apps/web/.env.local
}
npm run dev --workspace @sorteos/web -- --port 3104
```

La vista de esa rama estará en http://127.0.0.1:3104. Instalar dependencias desde la raíz del worktree con el mismo lockfile, sin modificar la instalación del checkout backend.

## Preparación de F2

```powershell
npm run api:check-catalog --workspace @sorteos/web
```

El comando comprueba cuatro GET del OpenAPI NestJS y falla explícitamente mientras falte B2. No inventa tipos ni endpoints. El cliente web normaliza API_BASE_URL para evitar duplicar /api/v1, mantiene cookies/no-store y transforma errores de red/proxy sin revelar detalles internos. Se prueba contra health del contrato real; todavía no hay catálogo real conectado. Requisitos de backend y pasos de integración: docs/frontend/ESTADO_F2.md y ADR 0005.

Para comprobar el build live en otra sesión de PowerShell, sin cambiar .env.local:

```powershell
$env:API_MODE = 'live'
$env:APP_ENV = 'production'
$env:API_BASE_URL = 'https://api.example.test/api/v1'
$env:NEXT_TELEMETRY_DISABLED = '1'
npm run build --workspace @sorteos/web
```

La URL de ejemplo sirve para validar configuración; no corresponde a una API desplegada. F1 no la consulta. Estas variables quedan en esa sesión de PowerShell; usar otra terminal para continuar en modo demo o restaurarlas.

## Evidencia y activos

- Guía aprobada: docs/frontend/GUIA_VISUAL.md.
- Composiciones: docs/frontend/DISENO_F1.md; decisiones: docs/decisions/0003-frontend-f1-visual.md.
- Resultado detallado: docs/frontend/ESTADO_F1.md; historial F0: docs/frontend/ESTADO_F0.md.
- Capturas F1: docs/frontend/screenshots/f1. Las capturas F0 se conservan.
- Imágenes conceptuales originales: public/images/demo; procedencia y prompts: docs/frontend/ASSETS_F1.md. Next Image optimiza las variantes servidas.
- Medición local de carga: docs/frontend/PERFORMANCE_F1.json. Se reproduce con node apps/web/scripts/measure-ui.mjs desde raíz, con Chromium configurado y la web demo abierta. No es Lighthouse ni un benchmark de producción.

No se desplegó ni se habilitaron compras, banca o autenticación. Los textos legales definitivos y premios reales deberán aprobarse en sus fases. Las pruebas de navegador/axe complementan, sin reemplazar, la revisión humana con lector de pantalla y pruebas de dispositivo real.

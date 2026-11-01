# App Sorteos — frontend F1

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

Mock está bloqueado durante build de producción. No exponer estas variables como NEXT_PUBLIC ni agregar secretos a cliente. El armazón live puede compilar sin una API conectada. En esta fase no se envían escrituras de negocio.

## Verificar

```powershell
npm run test:core --workspace @sorteos/web
npm run lint --workspace @sorteos/web
npm run typecheck --workspace @sorteos/web
npm run test --workspace @sorteos/web
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.tmp/playwright-browsers'
npm exec --workspace @sorteos/web -- playwright install chromium
npm run test:e2e --workspace @sorteos/web
```

Usar puerto 3000 libre. Si se reutiliza un servidor con PLAYWRIGHT_REUSE_SERVER=1, confirmar primero la banda DEMO: la suite también la comprueba. El servidor existente no se cierra al terminar. Los E2E cubren 360, 768 y 1280 px. La CI inicia su propio servidor mock/test; no observa ni usa datos productivos.

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

No se desplegó ni se habilitaron compras, banca o autenticación. Los textos legales definitivos y premios reales deberán aprobarse en sus fases. Las pruebas Chromium/axe complementan, sin reemplazar, la revisión humana con lector de pantalla y pruebas de dispositivo real.

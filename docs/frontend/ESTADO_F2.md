# Frontend F2 — catálogo conectado a B2

Fecha: 2026-11-01. Rama: `feat/frontend-f2`. Worktree: `.tmp/frontend-f2`.

**Implementación F2 conectada y validada localmente con B2.** El backend ya está disponible en el checkout principal `feat/backend-b2`, aún sin commit al iniciar esta integración. Se preservan todos sus archivos y cambios. Esta rama incorpora copias exactas del contrato Markdown, OpenAPI y cliente compartido generados por esa sesión; no modifica manualmente los DTOs ni implementa backend. Para integrar las ramas debe incluirse la implementación B1/B2, no solo sus tipos.

## Funcionalidad

- Inicio y listado consultan `GET /api/v1/raffles`. Paginación real de doce elementos, navegación anterior/siguiente y manejo de página vacía. B2 no tiene búsqueda ni filtros públicos: esas herramientas siguen exclusivamente en demo.
- Detalle por slug mediante `GET /api/v1/raffles/{slug}` y snapshot de `GET /api/v1/raffles/{slug}/availability`. Todos los conteos del detalle proceden del mismo snapshot; se muestran `asOf`, vendidos confirmados, reservados, cupo temporal vigente y disponibles, con actualización manual. No se confunde agotamiento con venta total.
- Precio entero en centavos, premio, reglas conservadas como texto, límites, formato `0..N-1` con ceros y fechas de inicio/cierre de participación cuando existen. No se inventa una fecha de sorteo ni especificaciones del premio.
- Listado y detalle usan modelos de presentación separados. La tarjeta no inventa reservas o held ausentes en el resumen. No hay categoría editorial ni insignias DEMO en datos live.
- Acceso tipado `bankAccounts()` a `GET /api/v1/bank-accounts/public`, preparado y probado. No se invoca durante la navegación de catálogo ni se muestran instrucciones de transferencia antes del flujo con cupo F3/F4.
- Render por solicitud con `connection()` y lecturas `no-store`, timeout de diez segundos y sin reintentos automáticos. El detalle y sus metadatos deduplican lectura durante el mismo render, sin caché compartida entre visitantes.
- Estado vacío real separado de error; caída/429 con mensajes seguros, referencia de solicitud y botón de reintento. El detalle tiene su propio manejo de fallo. Un 404 incluye explicación de posible pausa/cierre; B2 no publica esos estados ni permite distinguirlos por rutas públicas.
- Imágenes con Next Image, directorio HTTPS público explícito y fallback ante ausencia/error. Sin configuración se muestran placeholders; ninguna foto demo sustituye la de un premio real.
- `API_MODE=live` predeterminado en `.env.example`. Demo explícito de desarrollo conservado y bloqueado en producción.

Compra continúa deshabilitada porque B3/B4 todavía no forman parte de esta entrega. Cambiar cantidad es una vista previa local: no crea hold, importe congelado, orden ni números. No se aceptan transferencias.

## Iniciar la web

Desde la raíz original, en PowerShell:

```powershell
Set-Location -LiteralPath '.tmp/frontend-f2'
$env:API_MODE = 'live'
$env:APP_ENV = 'development'
$env:API_BASE_URL = 'http://127.0.0.1:3001/api/v1'
npm run dev --workspace @sorteos/web -- --port 3104
```

Abrir http://127.0.0.1:3104. Iniciar la API B2 en otra terminal desde el checkout principal con la base local preparada según su documentación. Una DB sin rifas publicadas muestra vacío; el seed B1 no publica sus ejemplos. No se activaron cuentas ni administradores en el proyecto del usuario.

Para imágenes, configurar `PUBLIC_PRIZE_IMAGE_BASE_URL` con el directorio HTTPS exacto del bucket público de premios, sin comodines, credenciales, query ni fragmentos. Ejemplo de forma, sin proyecto real: `https://media.example.test/storage/v1/object/public/raffle-media`. Reiniciar Next después de cambiarlo. Nunca usar bucket de comprobantes ni URLs firmadas. La variable es del servidor, sin prefijo `NEXT_PUBLIC_`.

## Verificación

| Comando desde el worktree | Resultado |
| --- | --- |
| `npm run api:check-catalog --workspace @sorteos/web` | PASS: cuatro respuestas públicas JSON 200 presentes |
| `npm run lint --workspace @sorteos/web` | PASS sin advertencias de ESLint |
| `npm run typecheck --workspace @sorteos/web` | PASS |
| `npm run test --workspace @sorteos/web` | PASS: 20 pruebas |
| `npm run test:core --workspace @sorteos/web` | PASS: 6 pruebas |
| `npm run test:e2e --workspace @sorteos/web -- --max-failures=3` | PASS: 70 pruebas, cinco perfiles |
| `npm run build --workspace @sorteos/web` | PASS, modo live/production; inicio, listado y detalle dinámicos |
| `npm run test:live --workspace @sorteos/web` | PASS: un escenario integrado, incluidos caída, recuperación y HTTP 429 |

Total: **97 pruebas aprobadas**, sin omisiones (20 unitarias, 6 de núcleo, 70 de navegador y 1 escenario de integración B2). El build usa URL HTTPS de ejemplo sin servicio activo y demuestra que el catálogo no se congela durante prerender. No demuestra conectividad remota. La primera ejecución completa de Playwright bajo sandbox hizo caer Firefox al abrir página; la ejecución final con permisos de navegador pasó sin modificar ni omitir casos.

La integración real crea una DB efímera mediante el setup de pruebas B2, aplica sus migraciones, publica trece rifas TEST por las rutas administrativas con JWT verificado y comprueba el vacío inicial, paginación, ausencia de demo, detalle en Chromium/Firefox/WebKit, HELD vigente frente a vencido, pausa/404, edición/reanudación, actualización manual, caída y recuperación. Los proveedores Auth/media son los fixtures exclusivos del test B2; NestJS y PostgreSQL son reales. Al terminar se elimina esa DB y su rol de login, no una base operativa. No se modifica el esquema del proyecto desde frontend.

Para repetir esa integración opcional, iniciar PostgreSQL de pruebas en loopback y una única instancia Next de este worktree en 3105 con `API_MODE=live`, `APP_ENV=test`, `API_BASE_URL=http://127.0.0.1:3106/api/v1`. Después, desde el worktree:

```powershell
$env:TEST_DATABASE_URL = 'postgres://demo_test@127.0.0.1:54339/postgres'
$env:BACKEND_CHECKOUT = 'C:\Users\Omar Ureña\Desktop\AppRifas'
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\Users\Omar Ureña\Desktop\AppRifas\.tmp\playwright-browsers'
npm run test:live --workspace @sorteos/web
```

`TEST_DATABASE_URL` debe señalar exclusivamente una instancia local de pruebas. El harness reutiliza setup/cleanup de `apps/api/test/catalog.integration.ts` de B2, sin editarlo; falla si cambia ese punto de integración. El puerto 3106 debe estar libre; el test inicia y detiene su NestJS. No ejecutar simultáneamente otro `next dev` del mismo checkout: los tests visuales usan otro modo y requieren cerrar primero el servidor live.

## Evidencia y límites

Capturas locales en [screenshots/f2](screenshots/f2): vacío y catálogo móvil, detalle en escritorio/Firefox/WebKit móvil, error y límite de solicitudes. Muestran premios explícitamente TEST y placeholders porque el proveedor de medios del test es HTTP local, no un bucket HTTPS autorizado.

Sin validación de Supabase remoto, fotos de un bucket real, Safari/iPhone físico, lector humano ni despliegue. Los navegadores automatizados verifican motores y tamaños, no dispositivos físicos. El aviso LCP ocasional de desarrollo en filtros demo no equivale a una medición Lighthouse; no se publica un nuevo puntaje de rendimiento.

No se habilitaron compras, login administrativo ni mutaciones desde Next. No hay nueva migración frontend; B1/B2 conserva su recuperación y seed. Las CI remotas de la entrega nueva no se han ejecutado: la rama no se ha publicado.

Siguiente fase: **F3, dependiente de B3**, cantidad y pre-reserva técnica antes de cualquier transferencia. Las cuentas bancarias solo aparecerán en ese flujo cuando el backend garantice el cupo. Ver [ADR 0007](../decisions/0007-frontend-live-catalog.md). La preparación anterior a B2 queda como registro histórico en [ADR 0006](../decisions/0006-frontend-f2-preparation.md).

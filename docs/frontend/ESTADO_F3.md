> Integración 2026-11-05: este trabajo ya está en la carpeta principal. Inicio vigente: npm run dev:web, http://127.0.0.1:3000. Las referencias a ramas y worktrees documentan el desarrollo original. Ver [verificación integrada](../ESTADO_FRONTEND.md#integracion-f4).

> Actualización F4 (2026-11-05): formulario y confirmación ya implementados; ver [ESTADO_F4.md](ESTADO_F4.md). El backend está integrado y la restricción histórica sobre generate:api dejó de aplicar. Este documento conserva el cierre histórico de F3.

# Frontend F3 — cantidad y pre-reserva temporal

Fecha: 2026-11-03. Rama `feat/frontend-f3`, worktree `.tmp/frontend-f2`.

## Implementación

- Ruta `/rifas/[slug]/participar`, accesible desde el detalle live incluso para revisar un cupo previo cuando el catálogo está agotado. Cantidad entera, controles táctiles y límites de la rifa. No se seleccionan números.
- Sesión invitada mediante `POST /checkout-session`, cookie HttpOnly administrada por el navegador, inicialización única por pestaña y Web Locks cuando están disponibles. Todas las llamadas son del cliente tipado generado B3; Next no escribe tablas de negocio.
- `POST /checkout-holds` por acción explícita, con UUID de idempotencia estable y solamente `raffleId/quantity`. Precio y total se muestran desde el snapshot del servidor, sin calcular una cotización cliente.
- Recuperación de una respuesta perdida con la misma intención. Si un reintento ambiguo recibe 429, no se ofrece borrar la intención para crear otra. GET al recargar cuando se conoce el ID; sin ID solo recuperación manual, nunca POST por montaje.
- Contador con hora servidor y tiempo monotónico, plazo absoluto y descuento de latencia. Advertencia a cinco minutos; al vencer se ocultan cuentas. Se conserva explicación de cupo temporal, sin orden, pago confirmado ni números.
- Consulta/cancelación propia. Cambiar cantidad exige liberar primero y confirmar respuesta; crear un cupo nuevo sigue sujeto al stock y cuotas B3. Pérdida de sesión no dispara una sesión sustituta ni recrea el hold.
- Cuentas públicas reales del endpoint solo durante un hold activo y lejos del vencimiento, con estado vacío/error. Se indica claramente no transferir hasta habilitar F4. No se añadió envío de orden, captura de datos personales ni comprobantes.
- Modo demo sin escrituras ni reservas ficticias. Ayuda en `/ayuda#incidencias` para transferencia previa, sin inventar un contacto de soporte.

Se sincronizaron los snapshots B3 iniciales de `docs/openapi.json`, `packages/api-client/src/generated.ts`, `docs/CONTRATO_API.md` y el plan frontend. No se editaron DTOs generados a mano. El contrato conserva correo obligatorio para F4. No se implementa B4/F4 en esta fase aunque la otra sesión avance backend.

La implementación backend sigue perteneciendo al checkout principal; aún no estaba incorporada a la rama frontend al cerrar esta fase. Antes de integrar/publicar, incorporar los commits B1–B3 y verificar la regeneración conjunta. No ejecutar `generate:api` desde el backend B0 ancestral de este worktree: sustituiría el snapshot B3 por un contrato anterior. La CI existente regenera el contrato y requiere esa integración; no se modificó para ocultar la dependencia ni se afirma que haya pasado remotamente.

## Iniciar

Terminal backend desde el checkout principal con B3 y DB local ya migrada:

```powershell
$env:CORS_ORIGINS = 'http://127.0.0.1:3104'
npm run dev:api
```

Terminal frontend desde la raíz original:

```powershell
Set-Location -LiteralPath '.tmp/frontend-f2'
$env:API_MODE = 'live'
$env:APP_ENV = 'development'
$env:API_BASE_URL = 'http://127.0.0.1:3001/api/v1'
npm run dev --workspace @sorteos/web -- --port 3104
```

Abrir http://127.0.0.1:3104, consultar una rifa publicada y entrar en «Consultar cupo temporal». El seed B1 no publica sus rifas; no se habilitó ninguna rifa operativa desde esta sesión. Sin API se muestra un fallo recuperable. En `API_MODE=mock`, la ruta de participar solo informa que no crea cupos.

API_BASE_URL es una URL pública compartida con el navegador para este flujo, no una variable para credenciales. Debe ser alcanzable por el navegador del usuario: `127.0.0.1` solo sirve en ese mismo PC. En staging/producción se requieren HTTPS, web/API bajo el mismo sitio, CORS exacto y cookies Secure de B3. No mezclar localhost con 127.0.0.1. No se añadió una clave Supabase pública ni privilegiada al frontend.

## Verificación

**Validación local aprobada: 110 pruebas**, sin fallos ni omisiones: 28 unitarias, 6 de núcleo, 75 de navegador y un escenario integrado B3. Lint, typecheck, comprobación de catálogo y build de producción aprobados. La regresión de cinco perfiles tardó 5,1 minutos en esta ejecución; no es una medición de rendimiento del producto. El escenario B3 final tardó aproximadamente 50 segundos, excluido setup/cleanup. Comandos del worktree:

| Comando | Cobertura |
| --- | --- |
| `npm run lint --workspace @sorteos/web` | PASS: ESLint sin advertencias |
| `npm run typecheck --workspace @sorteos/web` | PASS: TypeScript estricto y cliente generado |
| `npm run test --workspace @sorteos/web` | PASS: 28 pruebas de cliente, errores, inventario, persistencia, contador y sesión única |
| `npm run test:core --workspace @sorteos/web` | PASS: 6 pruebas de dinero, zona horaria, configuración y redacción |
| `npm run test:e2e --workspace @sorteos/web -- --max-failures=3` | PASS: 75 pruebas en cinco perfiles, incluida demo F3 sin escrituras |
| `npm run test:checkout:live --workspace @sorteos/web` | PASS: un escenario integrado NestJS B3, DB local y tres motores |
| `npm run build --workspace @sorteos/web` | PASS: producción live, ruta de participación dinámica |

El escenario integrado comprueba: sin holds al abrir; límites de cantidad; doble clic; snapshot exacto; cookie HttpOnly; recarga sin cambiar TTL; insuficiencia ante datos obsoletos; cancelación antes de cambiar; respuesta perdida después del commit; 429 posterior sin perder la clave; vencimiento local y backend; cookie perdida sin nueva sesión; dos solicitudes de navegador simultáneas al último cupo; ausencia de nuevas órdenes; Axe sin infracciones y sin desbordamiento móvil. Los errores de red/429 se inyectan solo en el navegador de pruebas; el hold se crea realmente por NestJS.

El vencimiento usa un fixture de corta duración insertado atómicamente en la DB efímera, como las pruebas B3. No se desactiva el trigger ni se modifica un vencimiento inmutable. La suite reutiliza setup/cleanup del backend y falla si ese setup deja de coincidir. Capturas en [screenshots/f3](screenshots/f3).

La primera pasada del escenario intentó modificar un vencimiento y fue rechazada por el trigger; se corrigió el fixture, manteniendo la protección. También se adaptó el harness a los nuevos imports relativos de herramientas de recuperación de backend. Las pasadas finales completas aprobaron sin omitir casos. Al terminar se verificó que no quedaban DB `sorteos_b1_test_b3_*` y se detuvo únicamente el PostgreSQL local iniciado para estas pruebas.

Para repetir el escenario integrado, iniciar una instancia Next live en 3105 con `API_BASE_URL=http://127.0.0.1:3106/api/v1`, `APP_ENV=test`, además de PostgreSQL local de pruebas. Luego:

```powershell
$env:TEST_DATABASE_URL = 'postgres://demo_test@127.0.0.1:54339/postgres'
$env:BACKEND_CHECKOUT = 'C:\Users\Omar Ureña\Desktop\AppRifas'
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\Users\Omar Ureña\Desktop\AppRifas\.tmp\playwright-browsers'
npm run test:checkout:live --workspace @sorteos/web
```

Los puertos 3106 y PostgreSQL de pruebas deben estar disponibles. El harness aplica las migraciones ya existentes mediante el CLI oficial, crea DB/rol efímeros y los elimina al finalizar. No usa ni modifica Supabase remoto. No ejecutar la regresión demo a la vez que el servidor live del mismo checkout: Next solo admite una instancia dev por worktree.

## Límites y siguiente fase

No se han probado Supabase remoto, cookies en un dominio desplegado, proxy real, iPhone físico ni lector humano. No se publicó la rama ni se desplegó. Sin canal de soporte configurado, la ayuda pide conservar referencia/comprobante y contactar al organizador por un canal ya verificado.

La recuperación dura mientras exista el localizador en `sessionStorage` y la cookie propietaria. Borrar almacenamiento/cookie o cerrar la pestaña tiene límites documentados en [ADR F003](../decisions/F003-checkout-holds.md). El frontend no elude las cuotas del backend ni promete renovar TTL.

La UI conoce los límites publicados de la rifa y el máximo estructural de 1000 del DTO B3. La cuota configurable `HOLD_MAX_QUANTITY` puede ser más restrictiva y no se expone como configuración pública en B3; un 422 conserva el mensaje de validación y permite revisar una primera solicitud rechazada. No se inventa un valor de configuración desde el navegador.

Siguiente fase: **F4**, dependiente de B4, formulario único con nombre, teléfono, **correo obligatorio**, transferencia y comprobante obligatorio, seguido de confirmación protegida con números RESERVED y pago PENDING_REVIEW. F3 no publica ese flujo ni simula su éxito.

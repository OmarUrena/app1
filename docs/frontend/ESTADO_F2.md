# Frontend F2 — preparación e integración pendiente

Fecha: 2026-11-01. Rama: feat/frontend-f2. Worktree: .tmp/frontend-f2, separado de feat/backend-b0.

**Estado: preparación iniciada; integración real bloqueada por B2. No se declara F2 completado.** El propietario confirmó que la otra sesión continuará B1/B2. No se implementa backend desde esta sesión.

## Evidencia de la dependencia

Se inspeccionaron código NestJS, OpenAPI generado, cliente compartido y ramas remotas. El único commit disponible era 8b66eb6, con B0 y las rutas de salud. El catálogo del contrato Markdown sigue siendo una especificación de B2, no una implementación disponible.

Al cerrar esta entrega, la otra sesión ya había comenzado feat/backend-b1 en el checkout principal. Sus cambios locales permanecen fuera del worktree frontend; el contrato de catálogo B2 sigue pendiente. El ADR de esta preparación se numeró 0005 para no coincidir con el ADR 0004 de persistencia backend.

El comando desde raíz:

```powershell
npm run api:check-catalog --workspace @sorteos/web
```

lee docs/openapi.json y señala las rutas/respuestas públicas ausentes. El script directo devuelve código 2 cuando B2 falta, 1 si no puede leer el esquema y 0 solo cuando encuentra las cuatro respuestas JSON 200. Este control no genera un esquema alternativo, DTOs manuales ni una API simulada. No se añade como requisito de la CI de F1 mientras B2 no exista.

Rutas ausentes en la revisión:

| Método | Ruta OpenAPI | Necesidad |
| --- | --- | --- |
| GET | /api/v1/raffles | Catálogo paginado |
| GET | /api/v1/raffles/{slug} | Detalle público |
| GET | /api/v1/raffles/{slug}/availability | Inventario vigente y asOf |
| GET | /api/v1/bank-accounts/public | Cuentas publicadas cuando el flujo posterior las necesite |

## Preparación implementada

- Se corrigió el prefijo del cliente web: API_BASE_URL incluye /api/v1, pero los paths generados ya lo incluyen. El adaptador entrega solo el origen al cliente compartido y valida la configuración; health se solicita a /api/v1/health, sin duplicar el prefijo.
- Se conserva credentials=include y no-store, sin reintentos automáticos. Los errores JSON se traducen a mensajes seguros; si un proxy devuelve HTML, no se muestra ese cuerpo. Se permite correlación segura desde X-Request-Id cuando no existe en el envelope.
- Los errores 429/403 sin JSON mantienen un mensaje pertinente. Las pruebas usan la ruta health realmente presente en OpenAPI; no se ejecutan llamadas a rutas de negocio inexistentes.
- El error boundary usa retry de la versión instalada de Next.js para volver a solicitar el segmento, en lugar de limitarse a limpiar el error local. Una prueba verifica la acción y que no se muestre un detalle interno.
- Se cerraron incidencias de interacción inicial y teclado de F1, y se amplió la matriz de navegadores. Ver la actualización de ESTADO_F1.md.

## Entrega requerida de backend antes de integrar

1. B1/B2 implementados y verificados en una rama integrable, con seed de demostración y las rutas públicas indicadas.
2. docs/openapi.json generado desde NestJS y packages/api-client/src/generated.ts sincronizado. No añadir paths al cliente a mano ni usar casts para saltar el tipado.
3. DTOs con dinero entero, estados, nulabilidad de fechas/imágenes, paginación y errores uniformes revisados contra CONTRATO_API.md.
4. Origen de API local/staging, origen web admitido por CORS y orígenes autorizados de imágenes públicas. No utilizar comodines generales en Next Image ni URLs privadas de comprobantes.
5. Regla explícita de visibilidad pública para PAUSED/CLOSED/histórico. DRAFT y datos de compradores no se exponen por accidente al añadir filtros.

## Trabajo F2 que seguirá a esa entrega

| Parte | Criterio de implementación |
| --- | --- |
| Lectura server-side | Operaciones del cliente generado; impedir que la consulta se congele como el armazón estático durante el build |
| Modelo de tarjeta | Mapear los datos reales de lista; no rellenar reservas o held con ceros inventados porque el resumen no los devuelve |
| Detalle/inventario | Usar el snapshot completo de availability para sus conteos y asOf; no mezclar cifras de respuestas tomadas en momentos diferentes |
| Texto y marca demo | Separar modo visual demo de datos reales: quitar rótulos de demo únicamente a datos conectados y autorizados |
| Paginación y búsqueda | Respetar paginación del servidor. No presentar una búsqueda sobre la página cargada como búsqueda de todo el catálogo |
| Precio y fechas | Precio desde API; cierre de participación y fecha de sorteo son conceptos distintos. No inventar una fecha de sorteo a partir de endsAt |
| Rango de numeración | Mostrar el formato configurado sin convertirlo en selector de números |
| Imágenes | Next Image con orígenes publicados explícitamente autorizados y fallback honesto si falta el activo |
| Caché | Inicialmente lecturas sin caché para garantizar actualización tras administración; disponibilidad vuelve a validarse en backend al crear un hold en F3 |
| Errores | Vacío real, 404, pausa, cierre, agotamiento, 429 y caída de API con recuperación visible; nunca fallback a fixtures en live |
| Cuentas bancarias | Consumir solo el endpoint público autorizado cuando corresponda; no habilitar transferencias antes de contar con cupo y el flujo B3/B4 |
| Validación | Entorno backend real de prueba: cambios admin reflejados, coherencia de cantidades, render ante errores y ausencia de datos ficticios en producción |

Los campos editoriales de F1, como category/subtitle/highlights, no están garantizados en el contrato inicial. Se retirarán o se sustituirán por textos genéricos honestos si el DTO no los ofrece; no se inferirán especificaciones del premio.

No se habilita el CTA de compra por tener catálogo. Holds y formulario único requieren sus fases backend y frontend posteriores. La cuenta publicada no es una prueba de pago y el comprobante no confirma el ingreso.

## Validación de esta preparación

Las pruebas locales de núcleo y componentes cubren el cliente, el prefijo, cookies, caché, errores, correlación y reintentos. Se ejecutan con npm run test:core y npm run test --workspace @sorteos/web. Build y lint/typecheck se registran al cerrar los cambios.

La CI pública del commit base fue exitosa: [Frontend](https://github.com/OmarUrena/app1/actions/runs/41308070025), [Backend](https://github.com/OmarUrena/app1/actions/runs/41308070038). Estos resultados corresponden a 8b66eb6, no validan remotamente los cambios nuevos de esta rama.

No hay cambios en API, migraciones, datos o despliegues. El siguiente paso es integrar B2, regenerar el cliente, volver a ejecutar api:check-catalog y completar las lecturas reales de F2.

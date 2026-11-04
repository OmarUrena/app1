# Contrato REST compartido — App Sorteos / API v1

**Fuente de verdad:** OpenAPI generado desde NestJS. Este documento define el contrato inicial deseado; si Codex detecta incompatibilidad, debe proponer ADR y actualizar **ambos** consumidores, no divergir silenciosamente.

## Convenciones
- Base `/api/v1`; JSON excepto `POST /orders` que recibe `multipart/form-data` con comprobante.
- Dinero: entero en **centavos DOP** `amountMinor` (RD$100.00 = 10000); no `float`. Formateo visual `Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP'})` tras conversión segura para presentación.
- Timestamps ISO 8601 UTC en red; UI muestra hora de Santo Domingo; backend es autoridad para expiraciones.
- UUID para IDs internos; `orderCode` público no secuencial, no es credencial de acceso; números de boleto string ceropadded en respuesta, integer en DB.
- Todas las respuestas de error: `{ "error": { "code": "...", "message": "...", "details": {}, "requestId": "..." } }` sin PII ni errores internos.
- `Idempotency-Key` UUID (cliente lo reutiliza en reintentos de **la misma** operación); backend distingue payload igual vs distinto y mantiene respuesta vinculada al guest session.
- Paginación `{items:[], pagination:{page,pageSize,total}}` sin exponer datos privados en rutas públicas.
- `Cache-Control: no-store` para órdenes, holds, admin y comprobantes. Disponibilidad pública puede cachearse por pocos segundos, pero al crear hold se valida en DB.

## Sesión de invitado, acceso a órdenes y CSRF
**Decisión de implementación sugerida:** NestJS crea cookie anónima de sesión con 256 bits de entropía al primer checkout. Cookie `HttpOnly; Secure; SameSite=Lax; Path=/`; en desarrollo local tratar Secure según HTTPS. El servidor almacena solo el hash del secreto y vincula holds/órdenes a esa sesión. Ningún token ni `orderCode` en localStorage, querystrings o analíticas. Frontend usa `credentials:'include'`; CORS restringido a web origin; validar `Origin` y defensa CSRF en POST. Esto NO convierte al invitado en usuario autenticado: si pierde la cookie, recuperación futura exige OTP del teléfono o soporte verificado, nunca consulta pública por nombre/teléfono.

## Endpoints públicos

### Salud del servicio — implementado y validado en B0

- `GET /health`: 200 `{"status":"ok"}` indica que responde el proceso.
- `GET /health/ready`: consulta PostgreSQL con `SELECT 1`; 200
  `{"status":"ready","database":"up"}` si responde. Sin conexión configurada:
  503 `DATABASE_NOT_CONFIGURED`; fallo de conexión: 503 `DATABASE_UNAVAILABLE`.
- Errores con el envelope común; `X-Request-Id` generado por servidor y
  `Cache-Control: no-store`. No divulgar host, versión, credenciales ni diagnóstico DB.
- JSON OpenAPI de las rutas implementadas: `/api/v1/openapi.json`; UI:
  `/api/v1/docs`. Ambos solo si Swagger está habilitado en desarrollo/test.
  Generación offline del esquema mediante `pnpm generate:api` (requiere dependencias).

En B3 están implementados el catálogo, las cuentas públicas, administración de
rifas, sesión invitada y pre-reservas. Órdenes, revisión de pagos y reportes
siguen siendo objetivos de B4–B6. OpenAPI contiene solo rutas implementadas.

### `GET /raffles?page=1&pageSize=12`
**200:** `{items:[{id,slug,title,prizeImageUrl,status,ticketPriceMinor,totalTickets,confirmedSoldCount,availableCount}],pagination:{...}}`.
Solo rifas PUBLISHED (o histórico visible con control explícito). No divulgar titulares/compradores/números.
En B2 solo PUBLISHED; `page>=1`, `pageSize` entre 1 y 100. `prizeImageUrl` puede
ser null; las imágenes proceden del bucket público de premios configurado.

### `GET /raffles/:slug`
**200:** `{id,slug,title,description,prize,prizeImageUrl,images:[{url,alt}],status,totalTickets,numberWidth,ticketPriceMinor,minPurchase,maxPurchase,rules,rulesVersion,startsAt,endsAt,confirmedSoldCount,reservedCount,availableCount}`.
`startsAt` y `endsAt` admiten null; DRAFT/PAUSED/CLOSED responden 404 en rutas públicas.

### `GET /raffles/:slug/availability`
**200:** `{total,available,held,reserved,sold,asOf}`. Invariante `total=available+held+reserved+sold` cuando no hay VOID. Lo único que garantiza compra es una pre-reserva exitosa.
`held` solo cuenta pre-reservas vigentes; HELD vencidos se computan como disponibles
sin cambiar inventario en el GET de disponibilidad. B3 libera transaccionalmente
al operar holds y mediante un barrido periódico.
RESERVED nunca se reclasifica por tiempo.

### `GET /bank-accounts/public`
**200:** `{items:[{id,bankName,accountType,accountDisplay,holderName,currency:'DOP'}]}`. Solo cuentas publicadas por admin, datos destinados a recibir transferencias.

### `POST /checkout-session` — B3

Antes de la primera pre-reserva, llamar con `Origin` de la allowlist y
`credentials:'include'`. Responde 201 `{ready:true}` y establece cookie
`__Host-sorteos_guest` en staging/production; en development/test `sorteos_guest`.
Es HttpOnly, SameSite=Lax, Path=/ y Secure en entornos desplegados. Caduca a las
24 horas; repetir con sesión vigente renueva el plazo y conserva el secreto.
No devuelve credenciales en JSON. El servidor guarda SHA-256 del secreto de
256 bits; no se utiliza UUID público como credencial.

Este paso separado permite reintentar un hold cuya respuesta se perdió sin
perder también su sesión. Esperar la respuesta antes de enviar holds y mantener
una sola inicialización de sesión a la vez en el cliente. Una cookie inválida o
vencida se reemplaza; no recupera holds de sesiones anteriores. Si la respuesta
inicial de sesión se pierde, repetirla puede crear una sesión vacía adicional,
sujeta al límite por IP; no crea órdenes ni asigna boletos.

POST/DELETE exigen Origin válido y rechazan Sec-Fetch-Site: cross-site.
Desplegar web/API bajo el mismo sitio para que SameSite=Lax permita la cookie;
una integración SSR debe reenviar esa cookie de forma protegida. No hay token
en querystrings, body ni localStorage. Sin sesión vigente: 401 SESSION_INVALID.

### `POST /checkout-holds`
**Header:** `Idempotency-Key: 0b30...` + `Origin` válido.

**JSON solicitud:**
```json
{"raffleId":"11111111-1111-4111-8111-111111111111","quantity":10}
```
**201 ejemplo:**
```json
{
  "holdId":"22222222-2222-4222-8222-222222222222",
  "raffleId":"11111111-1111-4111-8111-111111111111",
  "quantity":10,
  "unitPriceMinor":10000,
  "totalMinor":100000,
  "currency":"DOP",
  "expiresAt":"2026-10-27T02:00:00Z",
  "serverTime":"2026-10-27T01:00:00Z",
  "status":"ACTIVE"
}
```
**No devuelve números.** Si insuficiencia => 409 `INSUFFICIENT_TICKETS`; si límites => 422 `INVALID_QUANTITY`; 429 abuso.

Requiere cookie de sesión obtenida previamente. Solo acepta raffleId y quantity;
rechaza precios, números y campos desconocidos. La cantidad respeta min/max de
rifa y HOLD_MAX_QUANTITY (100 por defecto). Se valida PUBLISHED y ventana de
venta con hora DB; en otro caso 409 RAFFLE_NOT_AVAILABLE. TTL inicial 60 minutos.
La sesión debe durar al menos ese TTL; si falta plazo, 401 SESSION_INVALID:
renovar checkout-session con la misma cookie antes de crear el hold.

Idempotencia única por sesión y UUID de cabecera, incluso entre rifas. Mismo
payload devuelve 201 con el mismo hold, precio y vencimiento; serverTime refleja
la consulta actual. Distinto payload: 409 IDEMPOTENCY_CONFLICT. El reintento de
un hold vencido/cancelado/consumido devuelve su estado actual, nunca lo reactiva
ni sustituye: para otra intención se requiere una clave nueva. No hay renovación
de TTL por reintentos o lecturas. Cambiar cantidad requiere cancelar el hold
anterior y crear otro, sujeto a disponibilidad y límites; no hay reemplazo garantizado.

Defaults: 1 hold vigente/sesión, 3/IP, 20 nuevas pre-reservas exitosas/IP/hora,
60 sesiones nuevas/IP/hora. Límites compartidos por DB; fallan con 429
RATE_LIMITED. Las cancelaciones no reinician el cupo horario. IP mediante HMAC
privada estable, sin guardar IP cruda ni confiar en X-Forwarded-For del cliente.
El throttling HTTP general añade límite por proceso a intentos fallidos.

### `GET /checkout-holds/:id`
Requiere sesión invitado propietaria, devuelve estado/importe/expiración **sin números**; 404 para otros. `DELETE /checkout-holds/:id` opcional, sujeto a sesión y auditoría.

Ambos endpoints están implementados. GET libera el hold si venció y devuelve
200 con EXPIRED. DELETE de ACTIVE devuelve 200 CANCELLED y libera solo sus HELD;
repetir conserva CANCELLED/EXPIRED; CONSUMED devuelve 409 HOLD_CONSUMED.
Un job por instancia barre hasta 20 rifas/ciclo (30 segundos por defecto),
omite rifas bloqueadas y reintenta después. Nunca libera RESERVED ni SOLD,
ni modifica una orden por antigüedad. La liberación lazy ocurre dentro de la
transacción de la operación y se revierte si esa operación falla.

### `POST /orders` — UN SOLO SUBMIT de orden + pago
`multipart/form-data`, con campos concretos:
- `holdId`: UUID de pre-reserva propia aún ACTIVE.
- `idempotencyKey`: UUID estable (también cabe en header).
- `customerName`: nombre completo, longitud validada.
- `customerPhone`: teléfono normalizado en backend.
- `customerEmail`: obligatorio, no vacío y con formato válido (máximo 254 caracteres).
- `bankAccountId`: UUID de cuenta activa.
- `bankReference`: referencia de transferencia, texto seguro validado.
- `transferDate`: fecha/hora reportada por cliente (no equivale a confirmación bancaria).
- `receipt`: imagen JPG/PNG o PDF, obligatorio, 5MB máximo inicial configurable.
- `acceptedRulesVersion`: versión de reglas/condiciones aceptadas.

Decisión del 2026-11-03: el correo es obligatorio para nuevas órdenes y debe
validarse tanto en F4 como en B4 antes de subir el archivo o crear la orden.
Recogerlo no implica verificar su titularidad ni autoriza acceso a la orden;
no se añade OTP ni envío de mensajes sin definir ese flujo. B4 aún no está
implementado; el esquema histórico B1 conserva email nullable hasta incorporar
la validación/migración correspondiente sin inventar correos para datos previos.

**201 ejemplo tras creación y commit atómico:**
```json
{
  "orderCode":"RF-X7K2M9P4",
  "status":"PENDING_REVIEW",
  "paymentReportStatus":"REPORTED",
  "raffleId":"11111111-1111-4111-8111-111111111111",
  "quantity":3,
  "ticketNumbers":["00184","03592","08731"],
  "totalMinor":30000,
  "currency":"DOP",
  "createdAt":"2026-10-27T01:32:00Z",
  "message":"Orden y comprobante recibidos. Los números están reservados y el pago está pendiente de verificación."
}
```
**Invariantes:** `numberCount===quantity`; numeros únicos de esa rifa; órdenes en `PENDING_REVIEW` no expiran solas; sin comprobante válido => nunca emitir 201 ni crear orden.

**Errores relevantes:** 400 `INVALID_REQUEST`, 401/403 `SESSION_INVALID`, 409 `HOLD_EXPIRED`, 409 `HOLD_CONSUMED`, 409 `RAFFLE_NOT_AVAILABLE`, 409 `IDEMPOTENCY_CONFLICT`, 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`, 422 `INVALID_RECEIPT`, 503 `STORAGE_UNAVAILABLE`.

**Respuesta perdida:** mismo idempotencyKey + misma sesión + mismos campos => misma orden y mismos tickets, sin duplicación. Si payload cambia => 409. Si la orden ya se creó, no perderla aunque la UI no haya recibido el primer 201.

### `GET /orders/:orderCode`
Requiere guest session propietaria y/o verificación OTP futura; no basta conocer código. **200:** `{orderCode,status,raffle:{title},ticketNumbers,quantity,totalMinor,createdAt,paymentStatus}`. No devolver comprobante ni cuenta sensible. `404` para órdenes ajenas (evitar enumeración).

## Endpoints administrativos (JWT + admin_users activo + autorización)

### Autenticación implementada en B2

Enviar `Authorization: Bearer <access_token>` de Supabase Auth del proyecto
configurado. Se verifican ES256/RS256, firma mediante JWKS fijo, emisor, audiencia
authenticated, expiración, subject UUID y session_id. Además, se consulta
`/auth/v1/user` con la clave publicable del servidor y se exige que el UUID
coincida. Cada solicitud comprueba `admin_users.active` y rol en PostgreSQL;
email, user_metadata, cookies isAdmin y flags del navegador no autorizan.

Sin token/inválido: 401. Usuario Auth válido fuera de allowlist/inactivo: 403.
Auth sin configurar o no disponible: 503 AUTH_UNAVAILABLE. No se expone login,
signup ni bootstrap privilegiado por HTTP; F5 usará Supabase Auth y sesión SSR.
El JWT no debe ir en URLs, logs ni localStorage del flujo de compra.

OWNER y ADMIN pueden consultar, crear DRAFT, editar DRAFT/PAUSED y pausar.
Solo OWNER publica o reanuda. Accesos y mutaciones se auditan sin guardar tokens.

### Payload y respuestas de rifas — B2

`POST /admin/raffles` recibe JSON: slug, title, description, prize, totalTickets,
ticketPriceMinor (entero en centavos), minPurchase, maxPurchase, rules,
rulesVersion; startsAt/endsAt opcionales y anulables; images opcional (máximo 8):
`[{storageKey:'prizes/imagen-propia.webp',alt:'Descripción',rightsConfirmed:true}]`.
No acepta status, números seleccionados ni campos de autorización. La creación
de rifa y N boletos es atómica. Devuelve 201 con AdminRaffleDto.

AdminRaffleDto contiene el detalle público más version, hasCommitments y media
(`storageKey`, alt, rightsConfirmed). `GET /admin/raffles/:id` devuelve 200 con
ese mismo DTO; `GET /admin/raffles` admite page/pageSize y status opcional.

PATCH admite esos mismos campos como opcionales y responde 200. Solo fechas
pueden ser null. N es inmutable por la decisión de B1; precio bloqueado desde el
primer hold. Una rifa publicada se pausa antes de editar. Editar invalida su
aprobación anterior. Los cambios de estado se hacen exclusivamente con acciones.

Publicar/reanudar reciben obligatoriamente:

```json
{"rulesApproved":true,"requirementsReviewed":true,"mediaRightsConfirmed":true}
```

Es una declaración administrativa del propietario, no una certificación legal
automática. Se requieren reglas, imágenes propias marcadas y objeto accesible
con MIME de imagen en el bucket público. Se verifica HEAD fuera de la transacción
y luego version bajo bloqueo; edición concurrente: 409 CONCURRENT_MODIFICATION.
Publicar exige DRAFT; reanudar exige PAUSED. Pausar exige PUBLISHED y no necesita
payload. Las tres acciones responden 200 con AdminRaffleDto.

Errores adicionales uniformes: 409 RAFFLE_FIELDS_LOCKED, RAFFLE_NOT_EDITABLE o
INVALID_RAFFLE_STATE; 422 INVALID_RAFFLE, INVALID_MEDIA o
PUBLICATION_REQUIREMENTS_NOT_MET; 503 MEDIA_UNAVAILABLE. Conflicto de slug: 409
CONFLICT. Validación estructural y campos desconocidos: 400 INVALID_REQUEST.

| Método | Ruta | Acciones / validaciones |
|---|---|---|
| GET | `/admin/raffles` | listar incluidas DRAFT/PAUSED |
| GET | `/admin/raffles/:id` | B2: detalle de administración sin datos de compradores |
| POST | `/admin/raffles` | crear rifa + N tickets en DB de forma atómica |
| PATCH | `/admin/raffles/:id` | validar campos inmutables tras compromiso |
| POST | `/admin/raffles/:id/publish` | validar requisitos para publicación |
| POST | `/admin/raffles/:id/pause` | pausar nuevos holds |
| POST | `/admin/raffles/:id/resume` | reanudar si permitido |
| POST | `/admin/raffles/:id/close` | bloquear nuevas ventas y auditar; sorteo no disponible si pendientes |
| GET | `/admin/orders` | paginado, filtros status/fecha/rifa, acceso mínimo |
| GET | `/admin/orders/:id` | detalle privado y auditoría |
| GET | `/admin/payment-reports/:id/receipt-url` | URL firmada corta o proxy protegido |
| POST | `/admin/orders/:id/start-review` | `PENDING_REVIEW -> UNDER_REVIEW` |
| POST | `/admin/orders/:id/approve` | requiere importe+referencia verificados; `RESERVED->SOLD` atómico |
| POST | `/admin/orders/:id/request-resolution` | motivo; mantiene RESERVED |
| POST | `/admin/orders/:id/cancel` | resolución documentada; libera solo después de conciliación |
| GET | `/admin/dashboard` | cifras agregadas coherentes |
| GET | `/admin/reports/orders.csv` | export auditable, acceso admin |

**Ejemplo de aprobación:**
```json
{
  "verifiedAmountMinor": 30000,
  "bankPostedAt": "2026-10-27T01:33:00Z",
  "bankConfirmationReference": "REF-BANCO-DEMOSTRACION",
  "note": "Depósito verificado en extracto bancario."
}
```
**200:** `{orderCode,status:'PAID',soldTicketCount:3,reviewedAt}`. Solo después de verificación humana, bloqueo e idempotencia.

**Ejemplo cancelación (solución del pago explícita):**
```json
{
  "resolutionType":"NOT_PAID_CONFIRMED",
  "reason":"Comprobante inválido y sin depósito bancario localizado tras conciliación.",
  "evidenceReference":"INC-001"
}
```
Para fondos ingresados pero no asignables, documentar reembolso/reconciliación antes de liberar; no permitir cancelación simple de `PAID`.

## Matriz compacta de estados

| Objeto | Origen | Destino | Quién / condición |
|---|---|---|---|
| Hold | ACTIVE | CONSUMED | backend, POST /orders completado |
| Hold | ACTIVE | EXPIRED | job, `expiresAt<=now`, no orden |
| Ticket | AVAILABLE | HELD | checkout, DB transaction |
| Ticket | HELD | AVAILABLE | expiración/cancelación de hold sin orden |
| Ticket | HELD | RESERVED | submit con comprobante válido |
| Order | PENDING_REVIEW | UNDER_REVIEW | administrador |
| Order | PENDING_REVIEW/UNDER_REVIEW | PAID | admin verifica ingreso |
| Order | PENDING_REVIEW/UNDER_REVIEW | NEEDS_RESOLUTION | admin detecta problema |
| Order | NEEDS_RESOLUTION | UNDER_REVIEW/PAID | reanuda/reconcilia y valida |
| Order | NEEDS_RESOLUTION/UNDER_REVIEW/PENDING_REVIEW | CANCELLED | admin documenta resolución financiera |
| Ticket | RESERVED | SOLD | admin verifica pago orden |
| Ticket | RESERVED | AVAILABLE | orden CANCELLED tras conciliación |

**No hay transición automática `RESERVED -> AVAILABLE` por tiempo.**

## Errores y UX para frontend

| HTTP/código | Mensaje orientado al usuario |
|---|---|
| 409 `INSUFFICIENT_TICKETS` | «Ya no quedan tantos boletos disponibles. Reduce la cantidad.» |
| 409 `HOLD_EXPIRED` | «La reserva temporal venció. Si ya transferiste, solicita asistencia.» |
| 409 `IDEMPOTENCY_CONFLICT` | «Esta solicitud ya fue procesada con otros datos. Consulta tu orden.» |
| 415 `UNSUPPORTED_FILE_TYPE` | «Adjunta JPG, PNG o PDF.» |
| 413 `FILE_TOO_LARGE` | «El comprobante supera el tamaño permitido.» |
| 429 `RATE_LIMITED` | «Demasiadas solicitudes; inténtalo más tarde.» |
| 503 `STORAGE_UNAVAILABLE` | «No pudimos recibir el comprobante. No se creó la orden.» |
| 403 `FORBIDDEN` | «No tienes permiso para realizar esta acción.» |

## Contrato no funcional
- No PII en respuestas públicas, logs, URLs, SEO o analytics.
- Cada write crítico auditado con `requestId` y actor.
- Entornos: `development`, `test`, `staging`, `production` separados; usar datos DEMO en primeros tres.
- Si se implementa otro mecanismo de autorización/archivo, documentar con ADR antes de cambiar el contrato; no romper formulario único.

# App Sorteos — paquete de implementación progresiva para Codex

**Fecha de especificación:** 2026-10-26
**Estado:** frontend F3 conectado a B3 (2026-11-03), rama feat/frontend-f3. Ver [validación y límites F3](docs/frontend/ESTADO_F3.md). Worktree conservado en .tmp/frontend-f2; esta rama requiere el backend B1–B3 del checkout principal.
**Idioma de producto:** español (República Dominicana); moneda DOP (RD$).

## Iniciar el frontend conectado

Desde la raíz original del proyecto, en PowerShell:

```powershell
Set-Location -LiteralPath ".tmp/frontend-f2"
$env:API_MODE = "live"
$env:APP_ENV = "development"
$env:API_BASE_URL = "http://127.0.0.1:3001/api/v1"
npm run dev --workspace @sorteos/web -- --port 3104
```

Web: http://127.0.0.1:3104. Iniciar B3 en otra terminal desde el checkout principal con su DB local migrada y CORS_ORIGINS=http://127.0.0.1:3104. Sin API se muestra un error recuperable; sin rifas publicadas se muestra un catálogo vacío. El seed B1 no publica rifas. El detalle permite consultar cupo temporal. La recepción de órdenes y comprobantes todavía no está habilitada; no transferir.

`apps/web/.env.example` utiliza `API_MODE=live`. Para revisar únicamente las pantallas de demostración en desarrollo, cambiar explícitamente a `mock`. `PUBLIC_PRIZE_IMAGE_BASE_URL` admite el directorio HTTPS del bucket público de premios; vacío muestra placeholders. Reiniciar Next al configurarlo. Nunca introducir claves privilegiadas ni el bucket privado de comprobantes.

Controles: `npm run lint --workspace @sorteos/web`, `npm run typecheck --workspace @sorteos/web`, `npm run test --workspace @sorteos/web`, `npm run test:core --workspace @sorteos/web`, `npm run api:check-catalog --workspace @sorteos/web` y `npm run test:e2e --workspace @sorteos/web`. La integración adicional B3 se ejecuta con `npm run test:checkout:live --workspace @sorteos/web`; configuración y límites en [ESTADO_F3](docs/frontend/ESTADO_F3.md).

## Propósito
Construir una plataforma web propia para vender boletos de rifas de **un único organizador**, con una compra en un solo formulario, transferencias bancarias con comprobante obligatorio, asignación aleatoria de números, y validación manual del pago desde un panel administrativo.

## Ejecutar backend B0

Requisitos: Node.js 22 o 24 y pnpm 10.28.2. Desde la raíz:

En Windows, si `pnpm.exe` falla con EPERM, el instalador local usa el paquete
JavaScript oficial con el Node instalado y guarda herramientas/caches en el proyecto:

```powershell
powershell -NoProfile -File scripts/install-backend.ps1
```

Requiere acceso a `https://registry.npmjs.org/`. Instala dependencias y ejecuta
generación, lint, typecheck, pruebas y build del backend; se detiene ante el primer
fallo. No modifica pnpm global. La prueba PostgreSQL se ejecuta por separado.
En Codex, las descargas pueden requerir permisos de red ampliados; el instalador
ya se verificó con ese acceso. En una terminal normal necesita acceso al registro npm.

Instalación habitual con pnpm funcional:

```powershell
pnpm install --frozen-lockfile
Copy-Item apps/api/.env.example apps/api/.env
pnpm generate:api
pnpm dev:api
```

API en `http://127.0.0.1:3001/api/v1/health`. Swagger de desarrollo en
`http://127.0.0.1:3001/api/v1/docs`; JSON en `/api/v1/openapi.json`.
`GET /api/v1/health/ready` devuelve 503 mientras no se configure `DATABASE_URL`,
y 200 únicamente después de una consulta real a PostgreSQL. La API puede iniciar
sin DB en desarrollo. Para producción, tras build: `pnpm --filter @sorteos/api start`.

```powershell
pnpm generate:api
pnpm lint
pnpm typecheck:api
pnpm test:config
pnpm test
pnpm build:api
```

La generación escribe `docs/openapi.json` desde NestJS y
`packages/api-client/src/generated.ts` desde ese JSON. Ejecutarla antes de
compilar tras una instalación limpia y al modificar controladores/DTO.
El cliente se crea con `createApiClient('http://127.0.0.1:3001')` y usa
`client.GET('/api/v1/health')`. Solo están implementadas las rutas de salud;
el contrato de negocio de los planes se incorporará por fases.

Para pruebas con DB, ver [infra/README.md](infra/README.md). Todas las variables
están documentadas en `apps/api/.env.example`; no se requieren claves Supabase en B0.
En staging/producción CORS exige HTTPS, DB exige TLS y Swagger está prohibido.
`HOST=127.0.0.1` por defecto; para contenedores configurar explícitamente `HOST=0.0.0.0`.

Estado de validación y limitaciones: [docs/ESTADO_B0.md](docs/ESTADO_B0.md).
Decisiones: [ADR 0001](docs/decisions/0001-backend-b0.md).

## Archivos y orden de lectura de Codex

1. `AGENTS.md`: contexto inmutable, límites, arquitectura y reglas del agente. Debe ubicarse en la raíz del repositorio.
2. `docs/CONTRATO_API.md`: rutas, payloads, errores, estados y reglas compartidas. Fuente de integración backend-frontend.
3. `docs/PLAN_BACKEND.md`: fases B0-B8, entregables, esquemas, seguridad y criterios de salida.
4. `docs/PLAN_FRONTEND.md`: fases F0-F8, pantallas, estados visuales, integración y criterios de salida.
5. `docs/MATRIZ_QA.md`: pruebas de aceptación, concurrencia, fallos y seguridad.
6. `docs/PROMPTS_CODEX.md`: instrucciones listas para copiar a Codex, una fase por ejecución.

## Estructura sugerida (adaptar, NO sobrescribir proyecto existente)

```text
app-sorteos/
├─ AGENTS.md
├─ README.md
├─ docs/
│  ├─ CONTRATO_API.md
│  ├─ PLAN_BACKEND.md
│  ├─ PLAN_FRONTEND.md
│  ├─ MATRIZ_QA.md
│  └─ PROMPTS_CODEX.md
├─ apps/
│  ├─ api/              # NestJS
│  └─ web/              # Next.js App Router
├─ packages/
│  └─ api-client/       # Tipos/cliente generado a partir de OpenAPI
└─ infra/
   ├─ migrations/       # Una sola fuente de migraciones
   └─ scripts/          # Seed de DEMO y pruebas de concurrencia
```

## Milestones / integración continua por cortes verticales

| Hito | Backend | Frontend | Resultado visible / verificable |
|---|---|---|---|
| M0 – Bases | B0 | F0 | Repositorio, CI, entornos, convenciones, scripts y contratos |
| M1 – Catálogo | B1 + B2 | F1 + F2 | Admin crea rifa en entorno demo; visitante ve lista y detalle |
| M2 – Disponibilidad | B3 | F3 | Cantidad, cotización y pre-reserva temporal sin orden |
| M3 – Compra real integrada (sin banca real) | B4 | F4 | Un solo formulario envía datos + comprobante y devuelve números |
| M4 – Validación de pagos | B5 | F5 | Admin aprueba/requiere resolución; cliente ve estado protegido |
| M5 – Operación | B6 | F6 | Cierre, conciliación, verificación protegida e indicadores |
| M6 – Robustez | B7 | F7 | Pruebas E2E, acceso, rendimiento, accesibilidad y recuperación |
| M7 – Prelanzamiento | B8 | F8 | Staging listo; despliegue productivo solo tras checklist y permiso legal |

**Primera entrega de valor:** M1. **MVP funcional de punta a punta:** M4, usando bancos/cuentas de demostración y comprobantes simulados. **Operación real:** requiere M5-M7 y revisiones legales, fiscales, financieras y de seguridad.

## Modo de trabajo de Codex

- Leer archivos completos y reconocer el estado real del repo antes de cambiarlo.
- Ejecutar **una fase** por tarea; no construir B0-B8/F0-F8 a la vez.
- Antes de programar: mostrar alcance, dependencias, ficheros previstos y decisiones técnicas.
- Implementar código, migraciones, pruebas, documentación y comandos reproducibles para la fase.
- Terminar cada fase con: resumen, archivos modificados, comandos corridos y resultados, pendientes, riesgos y siguiente fase desbloqueada.
- Si falta un secreto, integración de Supabase o servicio externo, implementar adaptadores y usar configuración de DEMO sin inventar credenciales ni conexiones.
- Nunca tocar datos productivos, borrar tablas, desplegar, realizar pagos reales o publicar una rifa sin autorización explícita.

## Fuentes técnicas oficiales

- NestJS OpenAPI: https://docs.nestjs.com/openapi/introduction
- Next.js App Router: https://nextjs.org/docs/app
- PostgreSQL bloqueo de filas: https://www.postgresql.org/docs/current/sql-select.html
- Supabase Storage privado: https://supabase.com/docs/guides/storage/serving/downloads
- Supabase RLS: https://supabase.com/docs/guides/storage/security/access-control

## Aviso de alcance

No está decidido un proveedor de mensajería, una pasarela de pago, un mecanismo definitivo de elección de ganadores ni la operativa reglamentaria. No inventarlos. El lanzamiento con rifas reales queda bloqueado hasta verificar permisos, reglas del sorteo y cumplimiento dominicano. La referencia visual pública (Rifas Luxury RD) es inspiración funcional, no una autorización para copiar marca, imágenes ni código ajeno.

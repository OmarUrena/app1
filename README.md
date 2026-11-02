# App Sorteos — paquete de implementación progresiva para Codex

**Fecha de especificación:** 2026-10-26  
**Estado:** backend B0 validado localmente el 2026-10-29: lint, typecheck, build, OpenAPI/cliente y 17 pruebas aprobadas.  
**Avance B1 (2026-11-01):** esquema y migraciones validados en `feat/backend-b1`;
39 pruebas aprobadas, incluidas 20 de integración PostgreSQL. Ver [estado B1](docs/ESTADO_B1.md).
**Avance B2 (2026-11-01):** catálogo y administración de rifas en `feat/backend-b2`,
JWT + usuario Auth + allowlist, publicación auditada y rol DB limitado.
Ver [estado B2](docs/ESTADO_B2.md) para pruebas y configuración.
**Idioma de producto:** español (República Dominicana); moneda DOP (RD$).

## Propósito
Construir una plataforma web propia para vender boletos de rifas de **un único organizador**, con una compra en un solo formulario, transferencias bancarias con comprobante obligatorio, asignación aleatoria de números, y validación manual del pago desde un panel administrativo.

## Ejecutar backend B0

Requisitos: Node.js 22.13+ o 24 LTS y pnpm 10.28.2. Desde la raíz:

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
`client.GET('/api/v1/health')` o `client.GET('/api/v1/raffles')`. B2 ya incorpora
catálogo y administración de rifas; holds y órdenes siguen pendientes de B3/B4.
Para un consumidor SSR autenticado, `createApiClient(apiOrigin, accessToken)`
envía Bearer. No guardar tokens en URLs ni logs; renovar el cliente al renovar JWT.

Para pruebas con DB, ver [infra/README.md](infra/README.md). Todas las variables
están documentadas en `apps/api/.env.example`; no se requieren claves Supabase en B0.
En staging/producción CORS exige HTTPS, DB exige TLS y Swagger está prohibido.
`HOST=127.0.0.1` por defecto; para contenedores configurar explícitamente `HOST=0.0.0.0`.

Estado de validación y limitaciones: [docs/ESTADO_B0.md](docs/ESTADO_B0.md).
Decisiones: [ADR 0001](docs/decisions/0001-backend-b0.md).

## Persistencia B1: uso local

El único historial de migraciones es el del CLI Supabase 2.122.0, fijado en
devDependencies. SQL en `infra/supabase/migrations`; el CLI se usa aquí sobre
PostgreSQL loopback, sin enlazar proyectos remotos. Modelo y decisiones en
[ESQUEMA_B1](docs/ESQUEMA_B1.md) y [ADR 0004](docs/decisions/0004-backend-b1-persistence.md).

Con una DB de desarrollo vacía llamada `sorteos_dev` o `sorteos_test`, configurar
en `apps/api/.env` la conexión local, `DATABASE_SSL=false` para PostgreSQL sin TLS
y `NODE_ENV=development`. Luego:

```powershell
npm run db:migrate:local
$env:SEED_DEMO = 'true'
npm run db:seed:demo
Remove-Item Env:SEED_DEMO
```

El seed crea una rifa DEMO DRAFT de 100 números y una orden pendiente simulada,
sin cuentas bancarias ni archivos reales; puede repetirse sin duplicar datos.
No crea credenciales ni privilegios de administrador activos. Todas las tablas
de negocio quedan en el esquema privado `sorteos` con RLS y sin acceso de browser.

Para ejecutar la suite SQL en una instancia temporal separada, con PostgreSQL 17
instalado en Windows:

```powershell
powershell -NoProfile -File scripts/test-backend-local.ps1
```

La suite crea sus propias DBs desechables y las elimina al terminar. El script
detiene únicamente la instancia que inició, sin tocar el servicio del sistema.
El procedimiento fue verificado: migraciones, seed, integridad, RLS y recuperación
aprobados. Auditoría de producción sin alertas; queda un aviso moderado en las
herramientas de desarrollo, documentado en [ESTADO_B1](docs/ESTADO_B1.md).
Recuperación de esquema vacío y plan con datos: [infra/recovery](infra/recovery/README.md).

## Catálogo y administración B2

Con ambas migraciones aplicadas, los visitantes pueden usar GET `/api/v1/raffles`,
`/raffles/:slug`, `/raffles/:slug/availability` y `/bank-accounts/public`. Solo se
exponen rifas PUBLISHED; el seed DRAFT no simula un catálogo ya publicado.

Configurar en `apps/api/.env`:

- `SUPABASE_URL`: origen HTTPS del proyecto propio.
- `SUPABASE_PUBLISHABLE_KEY`: clave publicable del mismo proyecto, sin service_role.
- `PUBLIC_RAFFLE_BUCKET`: bucket público de imágenes propias de premios.
- `DATABASE_URL`: login del servidor con membresía a `sorteos_runtime`. En local,
  aplicar migraciones primero con el usuario autorizado para crear rol/esquema.

Auth requiere claves de firma ES256/RS256 habilitadas. El backend verifica JWKS,
consulta al usuario en Auth y comprueba la allowlist activa en cada solicitud.
Sin configuración no ofrece un login ficticio: las rutas admin devuelven 503.
Crear el usuario mediante el flujo de Supabase Auth del proyecto propio y tomar
su UUID; no autorizar por email ni metadata editable.

Sobre una DB local `sorteos_dev` migrada **sin seed**, el operador puede preparar
el primer OWNER con la herramienta del servidor:

```powershell
$env:PROVISION_LOCAL_ADMIN = 'true'
$env:LOCAL_ADMIN_USER_ID = 'REEMPLAZAR_POR_UUID_REAL_DE_AUTH'
$env:LOCAL_ADMIN_ROLE = 'OWNER'
npm run admin:provision:local
Remove-Item Env:PROVISION_LOCAL_ADMIN
Remove-Item Env:LOCAL_ADMIN_USER_ID
Remove-Item Env:LOCAL_ADMIN_ROLE
npm run dev:api
```

La herramienta requiere credenciales locales del operador, falla con configuración
incorrecta, es reejecutable para el mismo rol y no modifica administradores ya
existentes ni eleva el OWNER desactivado del seed. No existe endpoint de bootstrap.
En un entorno remoto, provisionar el login y allowlist mediante el procedimiento
de operación aprobado; estos comandos locales rechazan conexiones remotas.

Los endpoints `/api/v1/admin/raffles` usan Bearer JWT del usuario allowlisted.
OWNER/ADMIN crean borradores, editan DRAFT/PAUSED y pausan; OWNER publica/reanuda
con las tres confirmaciones del [contrato](docs/CONTRATO_API.md). Esa declaración
no constituye una certificación legal automática. El operador carga sus imágenes
propias al bucket público y registra claves prizes/ o raffles/: HEAD comprueba
acceso y MIME antes de publicar, sin una transacción DB abierta.

Pruebas completas: `powershell -NoProfile -File scripts/test-backend-local.ps1`.
Solo B2: agregar `-TestScript test:catalog`. El proveedor de pruebas es local y
usa claves generadas; Supabase real y assets propios requieren una verificación
del entorno antes de operar. Ver [ADR 0005](docs/decisions/0005-backend-b2-catalog-auth.md).

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

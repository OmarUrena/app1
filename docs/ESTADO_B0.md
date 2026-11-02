# Estado de backend B0

Rama local: `feat/backend-b0`. Verificación: 2026-10-29.

## Resultado

B0 validado localmente: instalación con lockfile, generación OpenAPI/cliente,
lint, typecheck, build y 17 pruebas aprobadas. No hay implementación de B1–B8,
despliegue ni cambios en bases remotas. El workflow CI está configurado; todavía
no se ha ejecutado en GitHub.

## Evidencia

| Criterio | Estado | Comando / resultado |
|---|---|---|
| Instalar dependencias | PASS | Instalador local, pnpm 10.28.2 con `--frozen-lockfile` |
| OpenAPI y cliente | PASS | `npm.cmd run generate:api`: JSON desde NestJS y tipos generados |
| Lint | PASS | `npm.cmd run lint`: sin errores |
| Typecheck | PASS | `npm.cmd run typecheck:api`: API y cliente |
| Build | PASS | `npm.cmd run build:api`: API y cliente |
| Configuración | PASS | `npm.cmd run test:config`: 6/6 |
| HTTP y fundamentos | PASS | `npm.cmd test`: 10/10 |
| PostgreSQL real | PASS | `npm.cmd run test:integration`: 1/1 con PostgreSQL 17.5 aislado |
| Auditoría de dependencias | PASS | `pnpm audit --json`: cero vulnerabilidades reportadas |
| CI remoto | PASS | [Backend](https://github.com/OmarUrena/app1/actions/runs/41308070038) aprobado; comprobado el 2026-11-01 |
| Migración / rollback / seed | No aplica | B0 no crea tablas de negocio |

Las pruebas HTTP verifican arranque, health, readiness sin DB, CORS, errores
uniformes, DTO inválido, JSON corrupto, rate limiting, Swagger deshabilitado y
DB inaccesible sin filtración de secretos. La integración comprueba `SELECT 1`
y respuesta `ready` sobre PostgreSQL real; no valida todavía dominio ni concurrencia.

## Correcciones realizadas al instalar

- Declarar Express como dependencia directa: pnpm no permite depender de la
  copia transitiva instalada para el adaptador NestJS.
- Tipar explícitamente el callback CORS para compilar en modo strict.
- Corregir declaraciones literales de DTO que incumplían lint.
- Generar `docs/openapi.json` y `packages/api-client/src/generated.ts`.
- CI usa `pnpm install --frozen-lockfile` con el lockfile disponible.
- Corregir dos alertas transitivas con overrides específicos en
  `pnpm-workspace.yaml`: multer 2.5.0 y js-yaml 5.4.1. Auditoría posterior sin alertas.

## Instalación y acceso a internet

Se verificó `powershell -NoProfile -File scripts/install-backend.ps1`. Usa el
paquete JavaScript oficial de pnpm con Node 24.22.1 y guarda herramientas/caches
en el proyecto, evitando el pnpm.exe global que antes fallaba con EPERM.

Las conexiones desde el sandbox estándar siguen devolviendo EACCES. Las
descargas y consultas de auditoría funcionaron con permisos ampliados autorizados
por revisión automática. No fue necesario modificar firewall, permisos globales
de Windows ni desactivar TLS.

pnpm informa scripts de instalación omitidos de `@scarf/scarf` y `unrs-resolver`.
Las verificaciones del backend pasan sin habilitarlos. No se verificó el build
del frontend en esta tarea.

## PostgreSQL aislado

Se encontró PostgreSQL 17.5 en `C:/Program Files/PostgreSQL/17/bin`.
Se creó un cluster exclusivo de prueba en `.tmp/postgres-b0/data`, sin tocar
el servicio `postgresql-x64-17`. Escuchó únicamente en `127.0.0.1:54329`, con
zona horaria UTC. La integración utilizó el usuario DEMO `demo_test`, sin datos
de negocio. La instancia temporal quedó detenida después de la prueba.
Docker no está instalado y no fue necesario. Pasos reproducibles en `infra/README.md`.

## Límites y siguiente fase

- Sin rifas, órdenes, transferencias, comprobantes ni auth admin hasta las fases
  correspondientes. No se declara MVP ni preparación productiva.
- Rate limiting por proceso, sin topología proxy configurada.
- TLS remoto y entorno Supabase no probados: esta fase solo necesita PostgreSQL
  aislado. El test local usa conexión sin TLS exclusivamente loopback.
- CI remoto confirmado como aprobado el 2026-11-01; separar worktrees antes del trabajo simultáneo.
  Se conserva el frontend existente; no se hicieron commits con trabajo ajeno.
- Próxima fase desbloqueada: B1, esquema PostgreSQL, migraciones y seed DEMO.

## Cierre de pendientes — 2026-11-01

Consulta de solo lectura a GitHub Actions: Backend y Frontend completados con
conclusión `success` en la rama B0. Trabajo de B1 iniciado en `feat/backend-b1`.
Los resultados de B0 de esta página son históricos; ver `ESTADO_B1.md` para la
verificación de la implementación nueva.

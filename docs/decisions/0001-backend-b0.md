# ADR 0001 — Fundamentos del backend

Fecha: 2026-10-27. Estado: aceptado; validado localmente el 2026-10-29.

## Contexto y alcance

El directorio inicial contenía AGENTS.md, README y cinco documentos de planes/contrato/QA.
No existían Git, código, dependencias, scripts, migraciones ni tests. Se inicia
Git en `feat/backend-b0`. La autorización de iniciar backend se interpreta como
B0, primera fase del plan; B1–B8 quedan fuera de esta entrega.

## Decisiones

- Monorepo pnpm 10.28.2; NestJS 11 y TypeScript 5.9 strict. Node 22 o 24.
  `apps/web` solo reserva un directorio; no se implementa frontend.
- `pg` para sondeo real y acotado `SELECT 1`. B0 no crea tablas. Elegir un único
  sistema de migraciones en B1. TLS verifica certificado; no permitir parámetros
  `ssl*` en DATABASE_URL que puedan sobrescribir esta política. CA por variable.
- Sin configuración DB, liveness funciona y readiness devuelve 503; nunca
  simular que una base no configurada está disponible. Staging/producción requieren DB y TLS.
- Swagger y documento generado desde controladores reales; solo rutas de salud
  implementadas. El contrato de negocio Markdown describe las fases futuras.
  `openapi-typescript` + `openapi-fetch` generan el consumidor; ejecutar
  `pnpm generate:api` antes de build/typecheck tras una instalación limpia.
- Swagger se prohíbe en staging/producción. CORS requiere orígenes exactos.
  No hay sesiones ni escrituras de negocio en B0; añadir CSRF con las sesiones B3.
- Throttler usa memoria por proceso. Ejecutar una sola instancia hasta acordar
  almacenamiento compartido; no confiar en X-Forwarded-For ni habilitar trust proxy
  sin conocer la topología. Límites específicos de holds pertenecen a B3.
- Logs por lista de campos: requestId generado por servidor, método, estado y
  duración; nunca URL, parámetros, IP, cuerpo, JWT, cookie ni texto de excepción.
  Logs de framework omiten mensajes arbitrarios; incorporar códigos diagnósticos
  seguros y alertas a medida que se incorporen módulos.
- Docker es opcional; contenedor PostgreSQL desechable y servicio PostgreSQL en CI.
  No hay despliegue ni acceso a Supabase remoto en esta fase.

## Limitaciones de verificación inicial

Node y npm disponibles. pnpm instalado como ejecutable falla con EPERM al resolver
el directorio de usuario. Registry npm falla con EACCES; instalación offline falla
por metadatos/dependencias faltantes. No hay Docker ni psql. No se generan lockfile
ni artefactos fingidos: generarlos con conexión habilitada. Los rangos de versiones
requieren resolución, lockfile y comprobación de advisories antes de integrar.
Se ejecutaron seis pruebas de configuración con el soporte TypeScript nativo de
Node 24: todas aprobadas. No sustituyen compilación ni pruebas HTTP/DB.

## Validación y ajustes — 2026-10-29

Las restricciones iniciales quedaron resueltas para esta tarea usando pnpm
JavaScript local y permisos ampliados para operaciones de red. Lockfile disponible,
OpenAPI y cliente generados, lint/typecheck/build aprobados; 6 pruebas de config,
10 de fundamentos/HTTP y 1 de integración PostgreSQL real aprobadas.

Se declara Express directamente porque el bootstrap lo importa. Los adaptadores
de NestJS no sustituyen una dependencia explícita en un monorepo pnpm.

Auditoría inicial detectó [multer GHSA-q7qp-rjg7-q26m](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m)
y [js-yaml GHSA-r3ph-w7gj-g6xm](https://github.com/nodeca/js-yaml/security/advisories/GHSA-r3ph-w7gj-g6xm).
NestJS fijaba versiones afectadas. Se usan overrides específicos por paquete padre:
multer 2.5.0 bajo platform-express y js-yaml 5.4.1 bajo swagger. Tras actualizar,
la auditoría completa no reporta vulnerabilidades y los checks del backend pasan.
Revisar estos overrides cuando NestJS incorpore las versiones corregidas.

Sin Docker disponible, se usa PostgreSQL 17.5 instalado para levantar un cluster
temporal exclusivo dentro del proyecto. No se modifica ni se prueba el servicio
PostgreSQL preexistente. La instancia de prueba se detiene tras la verificación.

# ADR 0011 — Una secuencia de desarrollo para backend y frontend

Fecha: 2026-11-05. Estado: aceptada por petición del propietario.

## Contexto

ADR 0010 reunió la implementación en la carpeta principal, pero los planes y prompts seguían asignando fases B/F a sesiones y agentes distintos. El propietario solicita unificar su desarrollo y trabajar ambas capas en una misma sesión. El repositorio contiene backend B5 y frontend F4; la verificación de su incorporación conjunta sigue en curso.

## Decisión

`docs/PLAN_DESARROLLO.md` será la única secuencia operativa M0–M7, conservando los hitos ya descritos en README. Los planes B/F se mantienen como especificaciones técnicas e identificadores históricos para QA, migraciones y evidencias. Contrato API y reglas de negocio conservan su autoridad.

Cada hito abarca datos, NestJS, OpenAPI/cliente, Next.js y pruebas de integración en una sesión y carpeta. Se elimina la recomendación de dos agentes/sesiones y ramas por capa. No se delega salvo solicitud explícita. Los dos procesos de desarrollo siguen siendo servicios separados, ejecutados desde la misma raíz.

El próximo hito funcional es M4 (B5 + F5), reutilizando B5 y comprobando las dependencias M1–M3 incorporadas. No avanzar solo B6 mientras la web administrativa F5 está pendiente. Ningún resultado histórico se presenta como prueba actual de integración.

## Consecuencias y alcance

AGENTS, README, planes, prompts y referencias de estado/QA apuntan a la secuencia integrada. Se conserva el detalle y trabajo existente, sin renumerar migraciones, cambiar endpoints, modificar secretos, mover worktrees ni ejecutar operaciones remotas. Esta decisión organiza el trabajo; no implementa funcionalidades ni autoriza los hitos futuros o despliegues.

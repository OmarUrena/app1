# Prompts para Codex — ejecución guiada por fases

## Primer mensaje (usar una sola vez al iniciar proyecto)

```text
Vamos a construir App Sorteos, una plataforma propia de rifas de un único organizador en República Dominicana.

Lee completamente AGENTS.md, README.md, docs/CONTRATO_API.md, docs/PLAN_BACKEND.md, docs/PLAN_FRONTEND.md y docs/MATRIZ_QA.md. Si los documentos están en otra ruta, localízalos en este repositorio. Esos archivos contienen las reglas de negocio que NO debes reemplazar por suposiciones.

Antes de programar, audita el repositorio y entrégame: (1) estado actual y archivos existentes, (2) propuesta de arquitectura y estructura respetando el código ya existente, (3) dependencias/versiones estables compatibles, (4) riesgos y decisiones abiertas, (5) orden recomendado de fases B0/F0.

No modifiques código todavía en esta primera tarea salvo que te lo solicite explícitamente. No te conectes a Supabase de producción ni despliegues. Debes mantener la regla fundamental: formulario único de datos+transferencia+comprobante, creación de orden y asignación aleatoria solo al enviarlo, y reserva sin autoexpiración una vez la orden tenga comprobante.
```

## Prompt general de implementación de UNA fase

```text
Implementa únicamente la fase [B0/F0/...] descrita en docs/PLAN_BACKEND.md o docs/PLAN_FRONTEND.md. Lee AGENTS.md, docs/CONTRATO_API.md y docs/MATRIZ_QA.md antes de tocar código.

1) Revisa el repo y enumera dependencias pendientes.
2) Presenta el plan corto de archivos/migraciones/endpoints/componentes afectados.
3) Implementa código funcional, tests, documentación y variables .env.example.
4) Si cambias un endpoint, sincroniza OpenAPI y el cliente tipado; no inventes API diferente a CONTRATO_API.md.
5) Ejecuta lint, typecheck, build y tests relevantes; entrega resultados REALES. No marques omitidos como superados.
6) Cierra con tabla: criterios de aceptación, PASS/FAIL/SKIPPED, evidencia, pendientes y siguiente fase.

No implementes fases futuras, no crees datos bancarios reales, no uses endpoints de pago automatizado, no hagas deploy ni cambios destructivos en producción. Si falta servicio externo, usa adaptador local/demo claramente señalado.
```

## Primer sprint práctico — Backend B0

```text
Implementa fase B0 de docs/PLAN_BACKEND.md. Necesito backend NestJS con estructura modular, configuración tipada, validación, manejo central de errores, health checks, Swagger/OpenAPI, lint, typecheck, tests, CI y .env.example. Reutiliza código existente si lo hay. No crees todavía órdenes ni lógica simulada de pagos. Documenta cómo arrancar y verificar el servicio.
```

## Segundo sprint — Backend B1

```text
Implementa fase B1: esquema PostgreSQL de rifas, tickets, pre-reservas, órdenes, clientes, reportes de pago, cuentas bancarias, admins y auditoría. Revisa las entidades y transiciones en AGENTS.md/CONTRATO_API.md. Crea migraciones versionadas y tests de integridad. Agrega seed DEMO (sin cuentas reales). Verifica que N boletos 0..N-1 existan sin duplicados. No construyas todavía el checkout HTTP.
```

## Sprint de catálogo — Backend B2 y Frontend F1/F2

```text
Implementa B2 y/o F1/F2 según el rol de este agente. Backend: auth real de admin, CRUD de rifas y lectura pública, Swagger y tests. Frontend: páginas de catálogo y detalle responsive que consumen el cliente tipado. Si un endpoint todavía no existe, usa mocks SOLO en desarrollo. El visitante NO elige números. No construir el proceso de compra en este sprint.
```

## Sprint crítico — Backend B3

```text
Implementa exactamente B3, motor de holds. Debe reservar aleatoriamente y sin reemplazo q números mediante transacción PostgreSQL con bloqueo coherente por rifa y CSPRNG, devolviendo cantidad/precio/vencimiento SIN revelar números. Expiración automática SOLO para holds; jamás para órdenes con comprobante. Añade pruebas de concurrencia de últimos boletos, idempotencia, abuso y caducidad. Reporta métricas medidas.
```

## Sprint crítico — Backend B4 + Frontend F4

```text
Implementa fase B4 o F4 según el rol. Regla central: una misma acción del comprador envía datos personales + referencia de transferencia + comprobante obligatorio, crea UNA orden y devuelve números aleatorios reservados. No inventar flujo de crear orden y luego subir comprobante. Al terminar mostrar 'Orden y comprobante recibidos — pago pendiente de verificación'. Doble clic/reintentos jamás duplican pedidos. Validar formatos JPG/PNG/PDF y privacidad del almacenamiento. Ejecutar escenarios O01-O14 de MATRIZ_QA.md aplicables.
```

## Revisión — Backend B5 + Frontend F5

```text
Implementa fase B5 o F5. El administrador autentificado verifica manualmente en el banco, aprueba o solicita resolución. Una orden en revisión/NEEDS_RESOLUTION conserva indefinidamente sus números; rechazo del comprobante NO libera boletos automáticamente. La cancelación exige motivo y conciliación; toda transición queda auditada. Añadir pruebas ante dos admins concurrentes e intentos no autorizados.
```

## Revisión obligatoria al final de CADA hito

```text
Compara el estado del repo con AGENTS.md, docs/CONTRATO_API.md, docs/PLAN_BACKEND.md, docs/PLAN_FRONTEND.md y docs/MATRIZ_QA.md. Señala desviaciones de reglas de negocio, deuda técnica, pruebas faltantes y riesgos. Corrige únicamente problemas dentro del hito solicitado, conservando compatibilidad. No marques MVP listo si no hay flujo real e2e en staging con datos demo.
```

## Cómo trabajar con dos agentes / sesiones de Codex

1. Un agente/sesión trabaja backend; otro frontend, cada uno con su rama/worktree propio (ej. `feat/backend-b3`, `feat/frontend-f3`).
2. Compartir `AGENTS.md` y **un único** `CONTRATO_API.md`; backend es dueño del esquema OpenAPI; frontend consume cliente generado y nunca inventa payloads.
3. No tocar simultáneamente el mismo archivo. Integrar ramas pequeñas tras CI y pruebas del contrato.
4. Dependencias: no integrar F3 sin contrato B3 implementado; F4 requiere B4; F5 requiere B5.
5. Para tareas del mismo repo, primero acordar nombres de endpoints/DTO y versión; luego codificar. No dejar que dos agentes creen estados distintos.
6. Revisar diff y tests tras cada PR; no autorizar despliegue automáticamente.

## Formato de respuesta final que se exigirá a Codex

```text
Fase:
Resumen:
Archivos modificados:
Migraciones/contratos:
Cómo ejecutar:
Pruebas realizadas y resultados:
Criterios PASS/FAIL/SKIPPED:
Advertencias de seguridad y datos:
Decisiones abiertas (ADR):
Siguiente fase desbloqueada:
```

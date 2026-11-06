# Prompts para Codex — una sesión y una secuencia integrada

El orden vigente está en [PLAN_DESARROLLO.md](PLAN_DESARROLLO.md). B/F son referencias técnicas dentro de cada hito M0–M7. Una misma sesión implementa backend y frontend; no hace falta repartirlos entre agentes o worktrees. Estos prompts no autorizan despliegues ni operaciones remotas.

**Política Git permanente:** trabajar exclusivamente en `main` y en la carpeta principal. No crear ramas adicionales ni worktrees. Guardar avances en commits claros sobre `main`; las referencias históricas a ramas describen trabajo anterior.

## Retomar el proyecto

~~~text
Retoma App Sorteos desde esta carpeta principal y en una sola sesión de trabajo para backend y frontend.

Lee AGENTS.md, README.md, docs/PLAN_DESARROLLO.md, docs/CONTRATO_API.md, docs/ESTADO_BACKEND.md, docs/ESTADO_FRONTEND.md y docs/MATRIZ_QA.md. Consulta PLAN_BACKEND.md y PLAN_FRONTEND.md como especificaciones técnicas del hito.

Revisa git status, estructura, dependencias, migraciones, tests y cambios locales. Conserva el trabajo existente. Identifica el hito integrado activo y qué partes ya están implementadas, cuáles faltan y qué evidencia es histórica. No reinicies fases anteriores ni avances una capa sin conectar la otra. Presenta el alcance concreto antes de modificar.

No crees sesiones, agentes o worktrees por capa. Mantén contrato único, escrituras de negocio por NestJS, formulario único con comprobante obligatorio y reservas de órdenes sin expiración automática. No despliegues ni modifiques servicios remotos sin autorización explícita.
~~~

## Implementar o continuar un hito integrado

~~~text
Implementa o continúa únicamente el hito [M0–M7] de docs/PLAN_DESARROLLO.md, incluyendo backend y frontend en esta misma sesión y carpeta.

1) Lee reglas, contrato, estados y QA. Revisa el repositorio y conserva cambios locales.
2) Define las diferencias pendientes del hito: tablas/migraciones, endpoints/DTO, cliente generado, pantallas, acceso, errores y pruebas conjuntas. Reutiliza lo ya funcional.
3) Implementa una entrega conectada entre PostgreSQL, NestJS y Next.js. Si cambia la API, sincroniza CONTRATO_API.md, OpenAPI y cliente antes de integrarla en la UI. No aceptes mocks como evidencia de flujo real.
4) Ejecuta lint de API/cliente y de web, typecheck/build de ambas capas y tests relevantes. Ejecuta integración PostgreSQL y navegador para los flujos afectados; no declares PASS si falta infraestructura o la prueba se omite. Distingue fixtures locales de servicios reales autorizados.
5) Actualiza docs/PLAN_DESARROLLO.md, los estados de ambas capas, README, changelog, ADR y variables cuando corresponda. Los cambios de datos requieren migración nueva, seed DEMO y recuperación.
6) Entrega resultados reales con criterios PASS/FAIL/SKIPPED, comandos, entorno, evidencia de integración, limitaciones y siguiente hito.

No amplíes a otros hitos sin alcance autorizado. No inventes bancos, credenciales, canales de soporte, aprobaciones legales o ganador. No despliegues ni hagas operaciones remotas/destructivas. Si falta una dependencia, avanza el trabajo independiente y registra el bloqueo concreto.
~~~

## Siguiente hito propuesto — M5

M4 está implementado y verificado localmente. Para continuar, solicitar M5 con el prompt general y su alcance en PLAN_DESARROLLO.md: operación B6 + F6 reutilizando la revisión M4 y el CRUD B2. No reconstruir login, MFA o pagos ni implementar sorteo. Las verificaciones pendientes del proyecto remoto requieren un entorno y autorización adecuados; no se asumen concedidos por este prompt.

## Referencia de implementación — M4, revisión administrativa integrada

El siguiente prompt conserva el alcance implementado; consultar los estados antes de reutilizarlo para no reiniciar trabajo terminado.

~~~text
Implementa M4 de docs/PLAN_DESARROLLO.md en esta misma sesión, trabajando backend y frontend juntos. El backend B5 ya existe; la administración web F5 está pendiente.

Comprueba primero de forma acotada que catálogo, hold y formulario con comprobante incorporados (M1–M3) siguen conectados en esta carpeta. Reutiliza B5, su OpenAPI y su cliente actual; corrige las diferencias necesarias para el flujo M4 sin reconstruir B0–B5 ni adelantar B6.

Entrega login real de Supabase Auth con sesión SSR protegida, logout, allowlist y MFA TOTP reciente según CONTRATO_API.md. Implementa bandeja filtrada/paginada, detalle, historial/incidencias, visor del proxy privado y acciones de revisión, aprobación, solicitud de resolución y cancelación conciliada. No inventes dashboard agregado o editor completo: corresponden a M5.

Respeta OWNER para aprobar/cancelar, expectedVersion, Idempotency-Key por intención, confirmaciones e importe bancario exacto, conflictos y permisos revocados. NEEDS_RESOLUTION mantiene boletos RESERVED; el archivo no equivale a pago recibido. No liberes boletos por rechazo o antigüedad.

Prueba creación de orden desde web y revisión desde admin, consulta protegida del comprador y disponibilidad después de cada decisión. Incluye MFA/sesión/rol inválidos, descarga privada, dos revisores concurrentes y reintentos sin duplicados. Ejecuta los controles de ambas capas y la matriz QA relevante. Identifica qué pruebas usan fixtures; Auth/Storage reales y aplicación remota de migraciones necesitan entorno y autorización adecuados. No inventes configuración ni declares cerrado M4 sin evidencia conjunta.

Documenta cambios, comandos/resultados, pendientes y riesgos. No despliegues, no realices transferencias ni modifiques servicios remotos sin autorización explícita.
~~~

## Continuidad de los hitos posteriores

| Solicitud | Trabajo conjunto |
|---|---|
| Continuar M5 | Operación B6 + interfaz F6, reutilizando CRUD B2 y revisión M4 |
| Continuar M6 | Seguridad/resiliencia B7 + accesibilidad/UX/E2E F7, con métricas y restauración reales |
| Preparar M7 | Configuración, manuales y plan B8 + F8 revisables; despliegue solo con permiso explícito |

Usar el prompt general con el hito autorizado. Si el anterior está incompleto, exponer la dependencia y su alcance antes de ampliarlo; nunca asumir que una capa implementada cierra el hito.

## Revisión al cerrar un hito

~~~text
Compara el hito [M0–M7] con AGENTS.md, PLAN_DESARROLLO.md, CONTRATO_API.md, las especificaciones B/F y MATRIZ_QA.md. Revisa reglas de negocio, consistencia del contrato/cliente, acceso, privacidad, datos y experiencia del comprador/admin.

Corrige los problemas dentro del alcance autorizado y conserva compatibilidad y cambios existentes. Comprueba evidencia de API, web e integración; distingue resultados históricos, pruebas de esta sesión y verificaciones externas pendientes. No declares el MVP listo sin flujo conjunto probado ni listo para operar sin el ensayo autorizado en staging y los requisitos de M5–M7.
~~~

## Formato de entrega

~~~text
Hito integrado y referencias B/F:
Resumen y comportamiento conectado:
Archivos modificados:
Migraciones, recuperación y contratos:
Cómo ejecutar API y web:
Comandos, resultados y entorno:
Criterios PASS/FAIL/SKIPPED y evidencia de integración:
Limitaciones, riesgos y decisiones ADR:
Pendientes del hito y siguiente hito:
~~~

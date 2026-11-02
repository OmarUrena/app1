# Estado del backend B2

Fecha: 2026-11-01. Rama: `feat/backend-b2`.

## Entrega

Catálogo público y gestión de rifas funcionales, JWT verificado con JWKS de
Supabase, consulta autoritativa de usuario y allowlist activa en PostgreSQL.
El runtime no tiene flags de autenticación simulada. Sin las variables del
proyecto propio, las rutas admin fallan cerrado con 503.

## Verificación

| Criterio | Resultado | Evidencia |
|---|---|---|
| Lint | PASS | npm run lint |
| Typecheck API/cliente | PASS | npm run typecheck:api |
| Build API/cliente | PASS | npm run build:api |
| OpenAPI y cliente | PASS | npm run generate:api, 11 operaciones nuevas B2 y 2 de salud |
| Compatibilidad tipada frontend | PASS | npm run typecheck --workspace apps/web |
| Configuración | PASS | npm run test:config: 7 pruebas |
| Fundamentos y herramientas | PASS | npm test: 13 pruebas |
| Persistencia y HTTP B2 | PASS | test-backend-local.ps1: 40 pruebas, 20 de B2 y 20 previas |
| Producción: auditoría | PASS | pnpm audit --prod: 0 alertas, 237 dependencias |
| Auditoría completa | WARN | Aviso moderado minimatch en 3 rutas de herramientas, ya registrado en B1 |
| Supabase remoto: esquema y lecturas | PASS | B1/B2 aplicadas con autorización; 13 tablas RLS y pruebas HTTP del API correctas |
| Supabase remoto: login de administrador | SKIPPED | Falta elegir/provisionar un UUID Auth real como OWNER |
| CI remoto B2 | SKIPPED | Sin publicación de la rama |

Las suites SQL previas de B1 pasan con ambas migraciones. Las 20 pruebas nuevas
de B2 verifican JWT firmado, firma ajena/expiry/aud/iss/HS256, allowlist/metadata,
usuario eliminado, rol DB limitado, creación de N boletos, validaciones atómicas,
catálogo/paginación, derechos/publicación, pausa/edición/resume, campos bloqueados,
venta vs reserva, HELD vencido, cuentas públicas, concurrencia HEAD, bootstrap y
recuperación con reparación oficial/reaplicación.

Total verificado: **60 pruebas aprobadas**, sin omitidas en las suites ejecutadas.

El proveedor Auth/Storage de tests solo existe dentro del archivo de integración;
no hay uno disponible para el producto. Usa firmas reales ES256, un endpoint JWKS
y una comprobación de usuario independiente con la misma identidad. La aplicación
no omite verificaciones para NODE_ENV=test.

## Uso

Configurar apps/api/.env con DATABASE_URL del entorno local, SUPABASE_URL y
SUPABASE_PUBLISHABLE_KEY del mismo proyecto, además de PUBLIC_RAFFLE_BUCKET.
No usar service_role ni sb_secret_. El proyecto debe tener claves asimétricas
ES256/RS256; un proyecto con solo HS256 necesita habilitarlas antes de usar admin.

Aplicar migraciones con `npm run db:migrate:local` en DB local sorteos_dev o
sorteos_test. Para configurar un OWNER real de desarrollo, usar una DB migrada
sin seed y ejecutar el bootstrap manual descrito en README. El fixture DEMO
permanece desactivado; no sirve como login ni como permiso legal o bancario.

Arranque: `npm run dev:api`. Swagger: /api/v1/docs. Público: /api/v1/raffles.
Para admin, enviar Bearer access_token de Supabase de una sesión protegida.
Mantener tokens fuera de URLs, logs y almacenamiento persistente del comprador.

## Cambios y límites

- Migración 20261102020713_catalog_admin_b2.sql, rol servidor, RLS, versión y
  aprobación de publicación, metadatos de derechos e índices.
- Servicios/controladores catalog y guard auth; transacciones acotadas, auditoría
  sin PII, errores uniformes y generación de cliente actualizada.
- Seed B1 se conserva sin publicar rifas ni activar administradores/cuentas.
- Recuperación b2-down-empty.sql probada; no destruye datos de negocio ni el rol
  global que podría compartirse con otra DB. Con datos se exige forward-only.
- El alta de Auth y los objetos del bucket deben prepararlos los operadores del
  proyecto propio; no se crearon usuarios ni imágenes en Supabase remoto.
- Verificada conexión TLS a Supabase y aceptación de clave publicable/JWKS ES256.
  Tras autorización, B1/B2 quedaron aplicadas y el runtime accede correctamente
  al esquema privado. Falta provisionar un OWNER y verificar su login real.
  Reautenticación/MFA y políticas de sesión financiera corresponden a B5.
- Se conservó el cambio previo de apps/web/next-env.d.ts; no se implementó F2.

B2 habilita F2 (catálogo real). Próxima fase backend: B3, pre-reservas técnicas,
CSPRNG, TTL, límites antiacaparamiento y concurrencia del inventario.

## Configuración remota de solo lectura

Se guardó la configuración suministrada en apps/api/.env, excluido de Git,
sin imprimir contraseña ni claves. Se interpretaron los corchetes como formato
de plantilla de la cadena PostgreSQL. La conexión autenticada resultó exitosa.
Se configuró la CA oficial Supabase Root 2021 en DATABASE_CA manteniendo verificación
de cadena y hostname. Auth settings y JWKS respondieron 200, con clave ES256.

La inspección inicial READ ONLY confirmó ausencia del esquema/historial. Después
de la autorización explícita se aplicaron B1/B2 con el CLI oficial, preservando
sus versiones. No se ejecutaron seed, bootstrap, creación de usuarios o cambios
de Storage. El API conectado a Supabase pasó health/readiness, catálogo y cuentas
vacías, y rechazó acceso admin sin JWT. Detalles y avisos del asesor en
[MIGRACIONES_SUPABASE_B1_B2.md](MIGRACIONES_SUPABASE_B1_B2.md).

# ADR 0005 — Catálogo y administración B2

Fecha: 2026-11-01. Estado: implementado, verificado localmente.

## Alcance y contrato

B2 añade catálogo PUBLISHED, detalle, conteos, cuentas públicas y administración
de rifas. Se preserva B1 y el frontend existente. Nueva rama feat/backend-b2 con
el trabajo no confirmado previo conservado. No se implementan holds, compras,
pagos, cierre o sorteo. OpenAPI y cliente tipado se generan del backend.

Se añade GET /admin/raffles/:id para edición. Alta 201; lectura/PATCH/acciones
200. Publicación y reanudación requieren confirmaciones explícitas y OWNER.
El resto del CRUD permitido acepta OWNER/ADMIN; no existe DELETE de rifas.
Estos detalles de payload antes no estaban especificados y se documentan en el
contrato compartido, además del cliente generado.

## Autenticación real y bootstrap

JOSE 6.2.10 fijado como dependencia directa verifica JWT asimétrico de Supabase
contra JWKS del SUPABASE_URL configurado, nunca contra un jku enviado por el token.
Emisor exacto /auth/v1, audiencia authenticated, exp/iat/sub/session_id requeridos,
algoritmos ES256/RS256, máximo 8 KiB. Se rechazan tokens anónimos y HS256 legado.
No se introduce una clave simétrica de firma ni un modo mock de autenticación.

Antes de abrir transacciones se consulta GET /auth/v1/user con Authorization y
SUPABASE_PUBLISHABLE_KEY para confirmar que el usuario todavía existe y su UUID
coincide. Sin configuración o con proveedor no disponible, se falla cerrado.
La autorización proviene de admin_users activo y roles de DB, nunca de email ni
metadata editable. Desactivar la allowlist bloquea la solicitud siguiente.
Los errores no reflejan token, datos del usuario o errores internos del proveedor.

Para operaciones financieras B5 se deberá definir reautenticación/MFA y validación
estricta de sesión. No se promete invalidación instantánea de JWT por logout o
rotación de claves; se respetan expiración y caché JWKS (10 minutos, cooldown 30 s).
Desactivar la allowlist es el control de revocación administrativa de B2.

El primer administrador se provisiona manualmente desde herramienta del servidor,
con opt-in y UUID Auth explícitos, solo sobre DB loopback de desarrollo/prueba.
No se autoconcede rol al registrarse ni existe endpoint de bootstrap. Se requiere
DB migrada sin seed: el OWNER desactivado del fixture DEMO no se reemplaza ni se
eleva automáticamente. El seed de B1 permanece reejecutable e inactivo.

## Rol PostgreSQL y auditoría

La migración B2 crea/verifica sorteos_runtime como grupo NOLOGIN sin superusuario,
BYPASSRLS, creación de bases/roles ni replicación. Se concede membresía al usuario
de migración y se configuran políticas de servidor en el esquema privado sorteos.
Todas las consultas/transacciones de negocio hacen SET LOCAL ROLE sorteos_runtime.

El rol consulta catálogo, boletos, cuentas y allowlist; de holds solo columnas
necesarias para conteo/compromisos. Escribe rifas, medios, inventario inicial y
auditoría; no modifica allowlist, clientes, órdenes, pagos o pre-reservas.
No tiene login ni se entrega al browser. El deployment debe usar un login
separado con membresía al grupo, no las credenciales del migrador. Las pruebas
HTTP efectivamente conectan con un login limitado, sin privilegios de propietario.

Accesos admin permitidos/denegados se guardan en audit_logs con actor UUID y
requestId. Mutaciones usan contexto local ADMIN; los triggers de B1 registran
escrituras y el evento PUBLICATION_ATTESTATION referencia la rifa. No se guardan
JWT, cuerpos de Auth, comprobantes ni nombres/teléfonos en esos eventos.

## Imágenes y publicación

Referencias relativas en prizes/ o raffles/, extensiones JPG/PNG/WebP/AVIF y alt
obligatorio. Bucket público de premios separado de cualquier bucket privado de
comprobantes. No se expone upload en B2: el operador carga material propio en
Storage y registra las claves; la carga administrada corresponde a una fase posterior.

Publicar/reanudar exige OWNER, las tres confirmaciones true, derechos de todas
las imágenes, al menos una imagen y fecha final no vencida. HEAD confirma acceso
y MIME, con timeout y sin seguir redirects. Se libera la conexión de lectura
antes de ese I/O y luego se bloquea la rifa, revalida versión y actualiza estado
en una sola transacción. Una edición concurrente devuelve 409.

Los campos aprobados/version se añaden por migración y PostgreSQL exige aprobación
de un OWNER activo, versión de reglas coincidente e imágenes con derechos.
La confirmación guarda una declaración del propietario; no inventa licencia ni
realiza una comprobación legal automática. No se publicó ninguna rifa real.

## Lecturas y dinero

Paginación acotada 1..100, orden determinista y snapshot REPEATABLE READ en listas.
Solo PUBLISHED llega al público, sin datos de compradores ni números. Conteos
separados de AVAILABLE, HELD vigente, RESERVED y SOLD. HELD vencido se computa
elegible sin mutarlo; B3 deberá liberar bajo bloqueo y revalidar al comprar.
RESERVED no se reclasifica por tiempo. No se implementa un job de expiración.

Precio dentro de enteros seguros, producto validado con BigInt y total de orden
calculado por PostgreSQL como en B1. Las respuestas monetarias siguen el contrato
numérico en centavos. N continúa inmutable incluso sin compromisos: crear otra rifa.

## Recuperación y límites de verificación

Se ensaya down B2 únicamente en DB vacía, conservación de tablas B1, reparación
del historial con el mismo CLI Supabase y reaplicación. Con datos, down se bloquea
y se exige migración correctiva. No se elimina el grupo global compartido.

Auth e imágenes se probaron con HTTP local de protocolo equivalente y claves
criptográficas generadas para tests. Posteriormente se verificaron en el proyecto
real la aceptación de la clave publicable, JWKS ES256 y conexión TLS autenticada
a PostgreSQL mediante lecturas. Tras autorización explícita se aplicaron B1/B2,
se verificaron roles/RLS y se probaron lecturas HTTP del backend sobre Supabase.
El login con una identidad real sigue pendiente de elegir/provisionar OWNER.
No se modificaron usuarios, Storage ni filas de negocio; las credenciales están
solo en el .env ignorado por Git. Ver MIGRACIONES_SUPABASE_B1_B2.md.

Referencias revisadas: [JWT](https://supabase.com/docs/guides/auth/jwts),
[claves de firma](https://supabase.com/docs/guides/auth/signing-keys),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

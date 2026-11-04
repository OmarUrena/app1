# ADR 0008 — Orden y comprobante B4

Fecha: 2026-11-03. Rama: feat/backend-b4. Alcance exclusivamente backend B4.

## Contrato y dominio

POST /orders es multipart con datos del comprador, correo obligatorio, banco,
referencia, fecha, versión aceptada de reglas, hold y archivo. Cookie propietaria
de B3; Origin y sesión se validan antes de procesar multipart. No se abre POST
payments ni se admiten precios/números desde cliente. El correo no equivale a
identidad verificada y no se envían mensajes automáticamente.

Idempotencia UUID por sesión en cabecera o body; si ambos, deben coincidir.
Fingerprint SHA-256 de campos normalizados, instante UTC y hash/MIME del archivo
original. No incluye nombre del archivo. Reintento con igual intención recupera
orden y números; distinto payload falla. Código público con 128 bits aleatorios
(RF- y 32 caracteres hex) no es credencial. GET usa cookie propietaria y audita.
Submit y consulta comparten OrderDto, sin PII ni referencias de Storage.

Se acepta terminar holds PUBLISHED/PAUSED vigentes; la pausa de B2 corta nuevos
holds. Reglas actuales y snapshot deben coincidir. Cambios durante el upload
se revalidan; si venció, no sustituir números ni crear una orden ficticia.
La incidencia de una transferencia ya realizada requiere conciliación posterior.

## Persistencia

Nueva migración 20261104030210_order_receipts_b4.sql. B1/B2/B3 no se editan.
CHECK email IS NOT NULL NOT VALID impide nuevas escrituras sin correo sin
inventar valores históricos. El constraint nuevo diferido exige email y staging
adjunto coherente para órdenes creadas por el runtime; el seed privilegiado B1
continúa siendo reejecutable como fixture histórico, no prueba de archivo real.

Se crea un customer por orden, sin identificar/upsert por teléfono o correo.
Cada orden congela cantidad, precio, reglas y total exacto. No se crea cliente
hasta la transacción final; rollback elimina todos esos cambios. Secuencia:
lock de sesión compartido con B3 -> rifa -> hold -> staging -> inserciones y
actualizaciones. SELECT de hold vigente usa clock_timestamp tras adquirir lock.
Commit crea PENDING_REVIEW/REPORTED, relaciones e inventario RESERVED y marca
CONSUMED. No hay transición a PAID ni job de expiración de órdenes.
Solo se envía la respuesta tras terminar COMMIT y constraints diferidas.

## Archivos y límites

Dependencias fijadas: Supabase JS 2.118.0, sharp 0.35.5 y pdf-lib 1.17.1.
Multer usa memoria limitada (5 MiB configurables, un archivo, campos/partes
acotados). Guard comprueba Origin/sesión antes; máximo 4 uploads por instancia.
Validación en worker con heap 256 MiB y 10 s, dos workers simultáneos y cola
acotada por el interceptor. Imágenes con firma/MIME y decodificación completa,
10 MP y sin animación. PDF 1.0–1.7, xref/EOF, parseo, 1–20 páginas, sin cifrado;
se rechazan acciones/JavaScript, formularios, links externos y adjuntos activos
identificados. Se conserva el original y se almacena su SHA-256.
No se afirma cubrir todo malware; no hay antivirus integrado ni certificado.
Salida/errores de parsers no se propagan a logs, HTTP o PII.

En desarrollo se transpila una vez el código local del worker y se ejecuta en
otro hilo con require resuelto desde la API; evita arrancar ts-node por archivo.
Producción ejecuta el JS del build, con el mismo parser y límites. No hay un
modo que omita validación para test. Se verifica también el worker compilado.

## Storage y compensación

Adapter real Supabase Storage con clave secreta de servidor y Auth sin persistir
sesiones; fetch con timeout 5 s y sin redirects. Ninguna clave privilegiada va
al cliente. getBucket exige public=false y distinto bucket que premios antes
de upload; no se autocrea bucket, usuario o política. El operador debe mantener
políticas privadas sin acceso anon/authenticated no autorizado.

receipt_staging conserva UUID/path/hash/sesión/estado y plazo de limpieza; no
contiene nombre del archivo o datos bancarios. Registrar antes del I/O, liberar
transacción y subir con upsert=false. Path aleatorio pending/uuid.ext, sin PII.
La ubicación permanece privada tras commit; ATTACHED significa definitivo y no
necesita un move externo que pudiera romper una referencia ya confirmada.

La segunda transacción revalida sesión, reglas, banco, hold y staging. Dos
uploads concurrentes pueden existir temporalmente; solo uno se adjunta a la
orden. Los perdedores se limpian. UNIQUE por hold y sesión/key, lock y constraints
previenen doble orden/reserva. PENDING -> ATTACHED se confirma en el mismo commit
que el reporte. Ante error/COMMIT ambiguo, la compensación primero reclama el
staging en DB: ATTACHED nunca se borra, aunque el cliente no recibiera el éxito.

Si la subida falla o su respuesta se pierde, no borrar inmediatamente: mantener
registro y margen de 10 minutos frente a una escritura tardía del proveedor.
Job interno cada 60 s, hasta 20 filas, reclama PENDING vencido o CLEANING vencido,
libera transacción, elimina por Storage API y marca CLEANED. Fallo conserva
CLEANING para reintentar después de 10 min. Nuevos commits no pueden usar un
staging reclamado. Sin procesos API activos la limpieza espera el reinicio.
Cuotas persistentes: 2 pendientes vigentes/sesión y 20 intentos de staging/hora.
Conservar metadatos de intentos permite recuperación tras crash; retención y
reconciliación adicional de huérfanos quedan para operación B7/B8.

## Permisos, recuperación y límites

RLS en nueva tabla, sin grants de browser. Runtime añade INSERT de orden,
cliente, reporte y relaciones, UPDATE de current_order_id y lectura necesaria
para constraints/consulta. Customers solo SELECT id/email; reportes lectura de
metadatos de comprobante/estado, sin datos bancarios de conciliación. No puede
aprobar órdenes, cambiar administradores ni consultar SELECT * de PII/reportes.
Todas las rutas filtran por sesión desde credencial secreta, nunca por código solo.

Down B4 exige DB enteramente vacía, retira solo B4 y restaura permisos B3; las
pruebas antiguas revierten fases nuevas primero y reparan historial con CLI.
Con datos usar migración correctiva. Seed B1 sin cambios, siempre DEMO.

La prueba local usa PostgreSQL 17 con SCRAM, dos instancias Nest y un servidor
HTTP de protocolo Storage que conserva bytes y permite inducir fallos. El
producto siempre usa el SDK/adaptador real; no existe un storage mock de runtime.
Esto no certifica un bucket remoto: faltan su configuración privada, clave de
servidor y verificación remota aprobada. No se aplica B3/B4 a Supabase ni se
publica una rifa. F4 implementará la pantalla; B5 revisión/MFA/conciliación.

Referencias: [subidas NestJS](https://docs.nestjs.com/techniques/file-upload),
[Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[SDK getBucket](https://supabase.com/docs/reference/javascript/file-buckets-getbucket).

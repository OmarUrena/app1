# ADR 0009 — Revisión manual y conciliación B5

Fecha: 2026-11-05. Estado: implementado localmente; validación remota pendiente.

## Decisión

NestJS concentra la bandeja administrativa, el detalle privado, la descarga del
comprobante y las cuatro acciones de revisión. Ningún análisis del archivo
aprueba una transferencia: el propietario confirma el ingreso fuera del sistema.

Todas las rutas B5 requieren JWT asimétrico verificado, usuario Auth vigente,
allowlist activa, `aal2` y verificación TOTP de los últimos 15 minutos. Se usa
el instante firmado `amr` de TOTP, no la fecha de emisión o renovación del JWT.
En cada transacción se vuelve a comprobar la sesión por `session_id`, su usuario,
vencimiento, nivel y factor TOTP verificado en Auth. Tras descargar un archivo
de Storage se repite la autorización antes de entregar bytes.

OWNER puede aprobar y cancelar. ADMIN también puede listar, consultar, descargar,
iniciar revisión y solicitar resolución. No se confía en metadatos editables.
La comprobación SQL es invoker, con permisos de lectura por columna y políticas
SELECT propias sobre metadatos de `auth.sessions` y `auth.mfa_factors`. No permite
leer secretos TOTP ni tokens. Sin tablas/permisos Auth válidos se falla cerrado.
Estos permisos sobre tablas administradas por Supabase requieren verificación
en staging antes de publicar; no se aplicaron remotamente en esta fase.

Cada acción exige `expectedVersion` y un UUID `Idempotency-Key`. La clave tiene
alcance por administrador; repetir contenido devuelve el resultado persistido,
y cambiarlo produce conflicto. El bloqueo sigue rifa → hold → orden → reporte;
una versión obsoleta impide sobrescribir la revisión de otro administrador.

Se incorpora `admin_actions`, ledger inmutable de entrada validada y resultado.
Las restricciones diferidas requieren una acción coherente al confirmar cambios
financieros. La auditoría general conserva IDs y estados, sin copiar datos del
comprador, archivos ni tokens. Las notas financieras privadas sí se conservan
en el ledger, por lo que no deben incluir credenciales.

## Transiciones y evidencia

- Aprobar exige importe entero igual al snapshot, fecha, referencia bancaria,
  nota y confirmación humana explícita. Orden, reporte, incidencias y todos los
  boletos pasan a PAID/VERIFIED/SOLD en una transacción.
- Referencias o hashes repetidos generan señales, sin determinar fraude. Si
  existen, la aprobación exige reconocer su revisión explícitamente.
- Solicitar resolución marca NEEDS_RESOLUTION, crea una incidencia y conserva
  RESERVED. Reabrir una revisión no cambia los números.
- Cancelar requiere conciliación, motivo y evidencia. NOT_PAID_CONFIRMED declara
  ausencia de ingreso; REFUNDED exige recibido=devuelto, fecha y referencia;
  DUPLICATE_RESOLVED enlaza otra orden PAID del mismo banco y referencia verificada.
  El API registra esa comprobación; no ejecuta transferencias o devoluciones.
- La cancelación libera exactamente q boletos, conserva sus vínculos históricos
  y el comprobante ATTACHED. PAID no admite cancelación directa.

## Comprobantes y recuperación

Se elige proxy autenticado en lugar de URL firmada. `receipt-url` devuelve una
ruta de API que exige Bearer vigente en cada descarga; no sirve como enlace
público ni como `src` sin autorización. Respuestas binarias sin caché, con
`nosniff` y nombre de archivo genérico; Storage ocurre fuera de transacciones.

La migración B5 añade la tabla 16 sin editar migraciones anteriores. El down
solo admite un esquema de negocio vacío, preserva filas Auth y retira los
permisos/políticas propios. Con histórico se exige corrección forward-only y
backup/restauración ensayados. El seed DEMO B1 se conserva sin activar usuarios,
crear sesiones MFA, subir archivos ni simular verificación bancaria.

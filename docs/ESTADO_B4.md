# Estado del backend B4

Fecha: 2026-11-03. Rama: feat/backend-b4. Implementado y verificado localmente.
Se conservaron los cambios pendientes de B2/B3 y no se modificó frontend.

## Entrega

POST /api/v1/orders multipart recibe datos y comprobante en la misma acción.
Correo obligatorio, teléfono E.164 normalizado, banco activo, referencia, fecha
con zona horaria y reglas aceptadas. Requiere Origin y cookie de B3. No admite
números, precio o total del cliente. Archivo obligatorio JPG/PNG/PDF válido.

Validación aislada, Storage privado y registro durable de intentos. Segunda
transacción con bloqueo de sesión/rifa/hold/staging revalida después del upload,
crea cliente, orden PENDING_REVIEW, reporte REPORTED y vínculos, convierte HELD
en RESERVED y marca el hold CONSUMED. Solo después del commit se devuelven los
mismos números del hold, con ancho y ceros de la rifa. No hay aprobación de pago.

GET /orders/:code requiere sesión propietaria y devuelve estado/números/importe;
no PII ni acceso al comprobante. El código solo no autoriza. Idempotencia por
sesión + UUID + fingerprint del payload/archivo original; retry recupera orden
sin otro upload, payload distinto falla. Dos claves no pueden consumir un hold.

receipt_staging y job de compensación impiden referencias a cargas reclamadas
para limpieza y conservan ATTACHED incluso ante error ambiguo del commit.
Storage siempre está fuera de la transacción de inventario. Órdenes pendientes
y sus RESERVED no expiran automáticamente. Pausa permite finalizar hold válido;
si cambian reglas/banco/vigencia durante carga, se revalida antes de confirmar.

## Verificación

| Comando / criterio | Resultado |
|---|---|
| npm run generate:api | PASS, OpenAPI 0.4.0 y 2 operaciones B4 nuevas |
| npm run lint | PASS |
| npm run typecheck:api | PASS |
| npm run build:api | PASS |
| npm run typecheck --workspace apps/web | PASS |
| npm run test:config | PASS, 9 pruebas |
| npm test | PASS, 13 pruebas |
| Integración completa con SCRAM | PASS, 69 pruebas (18 de B4 y 51 previas) |
| Worker de validación desde dist JS | PASS, PNG válido y bytes originales conservados |
| Cliente tipado: multipart/boundary/cookie SSR | PASS, incluido en integración |
| Down B4 vacío / rechazo con datos / repair y reapply | PASS, incluido en integración |
| Recuperaciones previas B2/B3 con cuatro migraciones | PASS |
| pnpm install --frozen-lockfile --offline --store-dir .pnpm-store --ignore-scripts | PASS |
| pnpm audit --prod | PASS, 0 vulnerabilidades en 250 dependencias de producción |
| git diff --check | PASS |
| Migraciones remotas, bucket/clave Storage real y CI remoto B4 | PENDIENTE, no ejecutados |

**91 pruebas aprobadas**, sin fallos ni omitidas en la ejecución final. Integración
completa: aproximadamente 169 s. Evidencia local ignorada:
.tmp/b4-final-integration.txt y .tmp/b4-prod-audit.json. Una pasada previa detectó
timeout de arranque ts-node del worker en carga paralela; se corrigió compilando
una vez el código local antes de ejecutar el worker, sin ampliar timeout ni
omitir validación. La suite final volvió a aceptar JPG/PDF válidos y rechazar
comprobantes corruptos/activos. Registro anterior conservado en .tmp para diagnóstico.

Casos B4 cubiertos: correo ausente/incorrecto; sin archivo; tipo falso/SVG/
truncado/tamaño; PDF activo; JPG/PNG/PDF válidos; números exactos y dinero entero;
retry tras respuesta perdida; concurrencia con misma/distinta clave en dos APIs;
Storage público/fallido/ambiguo; limpieza con reintento; hold vencido durante
upload sin lock abierto; rollback después de insertar cliente/orden; consulta
ajena; reglas/banco/fecha; permisos; DB rechaza reporte inventado sin staging;
carrera limpieza/commit; reglas cambiadas durante I/O; cliente multipart y recovery.

## Reproducir

```powershell
powershell -NoProfile -File scripts/test-backend-local.ps1 -PasswordAuthentication -Port 54342
# Solo B4:
powershell -NoProfile -File scripts/test-backend-local.ps1 -PasswordAuthentication -TestScript test:orders -Port 54342
```

Se utilizó otro puerto porque 54339 estaba ocupado; no se detuvo esa instancia.
Las instancias creadas por las pruebas se detuvieron y las suites eliminaron sus
DB/roles. Storage de prueba vive solo en test/orders.integration.ts y conserva
los bytes enviados para comprobar hash, compensación y concurrencia. El producto
utiliza SDK real, nunca un modo de éxito simulado. Seed B1 sigue reejecutable y
no introduce archivos reales ni datos bancarios reales.

## Configuración y pendientes

- Nuevas variables: PRIVATE_RECEIPT_BUCKET, SUPABASE_STORAGE_KEY y
  RECEIPT_MAX_BYTES; ejemplos sin secretos. Se verifica public=false antes de
  upload, sin upsert ni URLs públicas. El bucket debe tener políticas privadas.
- Falta preparar/verificar bucket y clave de servidor en Supabase real, aplicar
  B3/B4 con autorización y probar el flujo remoto. No se crearon recursos remotos,
  se modificaron B1/B2 aplicadas, se cargó seed remoto ni se publicaron rifas.
- B2: OWNER provisionado, prueba de login real aún pendiente. CI remoto anterior
  no equivale a validar esta rama; no se ha publicado ni vuelto a ejecutar aquí.
- La interfaz del formulario corresponde a F4. No se añadió UI al backend.
- Sin antivirus externo ni garantía universal contra malware; límites de páginas,
  píxeles, tiempo, memoria, tipos y PDF activo documentados. Sin protección DDoS
  certificada; WAF/proxy/timeouts de ingreso y observabilidad corresponden a B7/B8.
- Job requiere API activa y Storage accesible; pendiente retención/reconciliación
  operativa adicional de huérfanos. Nunca borrar ATTACHED como limpieza temporal.
- Perder cookie no elimina orden/números; recuperación verificada y notificaciones
  por correo no se implementan automáticamente por exigir email.

Siguiente fase backend: **B5**, revisión manual, visor privado autorizado,
aprobación, resolución/cancelación documentada y requisitos de sesión/MFA.
Decisiones: [ADR 0008](decisions/0008-backend-b4-order-receipts.md).

> Integración 2026-11-05: este trabajo ya está en la carpeta principal. Inicio vigente: npm run dev:web, http://127.0.0.1:3000. Las referencias a ramas y worktrees documentan el desarrollo original. Ver [verificación integrada](../ESTADO_FRONTEND.md#integracion-f4).

# Frontend F4 — formulario único y confirmación protegida

## Evidencia adicional recuperada al consolidar main

El cierre local del worktree antiguo registró contrato regenerado sin diferencias con el backend 60736fb, typecheck de API/cliente, 34 pruebas unitarias, 6 de núcleo, lint/typecheck web y build aprobados. Su escenario integrado pasó en aproximadamente 97 segundos (sin setup/cleanup), incluido el bloqueo de fecha futura. Las capturas F4 actualizadas de ese cierre se conservan en screenshots/f4; no son pruebas repetidas durante la consolidación Git.

La recuperación se renderiza por solicitud y no congela la URL API del build; live sin API presenta indisponibilidad. Esos ajustes de código ya estaban incorporados a la raíz. El cierre antiguo utilizó web 3105 y regresión demo 3112 para conservar otros servidores. Se corrigió el desacuerdo localhost/127.0.0.1 manteniendo la validación de origen y se comprobaron limpieza de DB efímeras y parada de su PostgreSQL. La verificación posterior del proyecto integrado corresponde a [M4](../ESTADO_FRONTEND.md#m4).

Última revisión: **2026-11-05**. Rama `feat/frontend-f4`. Worktree `.tmp/frontend-f2`.

## Alcance implementado

- `/rifas/[slug]/participar` conserva la selección y el cupo F3 y añade **un solo formulario**: nombre, teléfono internacional, correo obligatorio, cuenta publicada, referencia, fecha/hora de transferencia de Santo Domingo, archivo JPG/PNG/PDF obligatorio y aceptación de reglas/privacidad. Un botón envía todo junto; sin archivo/datos válidos no se envía una orden.
- Precio, cantidad e importe se toman del snapshot de NestJS. El POST multipart tipado B4 solo envía campos permitidos y archivo, nunca precios o números del cliente. El servidor valida y almacena el comprobante en privado.
- Vista previa de imagen `blob:` local, selección táctil, quitar/reemplazar y límite configurable de 5 MiB por defecto. El PDF no se incrusta ni abre en un visor externo. Se validan formato/tamaño y fecha antes de enviar; la validación definitiva del contenido pertenece a B4.
- UUID estable y huella de payload/archivo; bloqueo de doble clic. Durante un resultado ambiguo se conservan la misma intención y los bytes en memoria. Recargar requiere reintroducir los datos originales y seleccionar el mismo archivo; no se guardan PII ni comprobantes en localStorage/sessionStorage.
- `/orden/recuperar` permite recuperar el mismo intento incluso con hold CONSUMED o rifa PAUSED. Una huella distinta no genera un nuevo POST. No se sustituye la sesión perdida ni se crea otro cupo para vincular un pago anterior.
- `/orden/confirmacion` muestra únicamente un POST 201 válido o un GET 200 de la sesión propietaria: código, números reservados con ceros, cantidad, importe y estado **Pendiente de verificación**. Nunca presenta un archivo como pago aprobado. Un 401/404 no muestra números.
- Localizador de la última orden en cookie web HttpOnly, Secure en producción y SameSite=Strict, sin código en query/localStorage. El setter web no registra negocio ni concede acceso; NestJS sigue exigiendo la cookie de B3. Si guardar el localizador falla después del 201, la orden permanece visible y se continúa a consulta sin repetir el POST de compra.
- Errores seguros, correlación y recuperación ante archivo inválido, Storage fallido, sesión perdida, reglas/cuenta cambiadas, expiración y respuesta perdida. Al vencer se bloquea un nuevo envío; el formulario conserva sus campos para orientar al comprador. Solo un intento incierto puede reintentar sus datos originales para recuperar una orden existente.
- Cuenta pública copiable, foco al título de confirmación, resumen móvil y aviso de privacidad. Se retiró el aviso general de compra inhabilitada en live; demo continúa sin crear sesiones, órdenes o números ficticios.

## Inicio correcto desde PowerShell

Frontend F4 y backend B5 están incorporados en la carpeta principal. Desde la raíz, ejecutar:

```powershell
npm run dev:web
```

Abrir **http://127.0.0.1:3000**. El script usa esta raíz, modo live y API `http://127.0.0.1:3001/api/v1`. `-Demo` permite revisar solo la demostración, sin órdenes. `-Port` y `-ApiBaseUrl` cambian esos valores; el script no inicia API, aplica migraciones ni crea datos.

El backend debe estar iniciado en otra terminal con `npm run dev:api`, `CORS_ORIGINS=http://127.0.0.1:3000`, su DB migrada y Storage privado configurado según [estado B4](../ESTADO_BACKEND.md#b4). No mezclar localhost y 127.0.0.1. El catálogo solo muestra rifas publicadas por un administrador; el seed no las publica. Sin cuentas activas no puede completarse el formulario.

Variables web: `API_MODE`, `APP_ENV`, `API_BASE_URL` público, `PUBLIC_PRIZE_IMAGE_BASE_URL`, `RECEIPT_MAX_BYTES` (igualar al backend, máximo 10 MiB) y `WEB_ORIGIN` opcional para el origen externo exacto si un proxy reescribe Host. Nunca poner una clave privilegiada o de Storage en variables del frontend. En despliegue, API/web deben pertenecer al mismo sitio y usar HTTPS.

## Integración de ramas

Se incorporó el backend confirmado en `60736fb`, conservando los archivos de backend y sus migraciones. Sus endpoints B5 permanecen disponibles como parte de esa dependencia; no se implementó F5 administrativo. OpenAPI y cliente se regeneran ahora desde NestJS de **esta misma rama**, sin sustituir el contrato por B0 ni editar DTOs a mano. Los conflictos documentales conservaron ambas entregas y el esquema backend completo.

El worktree usa su lockfile integrado y dependencias instaladas offline. No se cambiaron claves, DB o archivos de configuración privados del checkout principal. No se publicaron ramas ni despliegues desde esta sesión.

## Validación local

Resultados finales en cierre; comandos del worktree:

| Comando | Criterio |
| --- | --- |
| `npm run generate:api` | Contrato y cliente generados desde el backend integrado |
| `npm run typecheck:api` | API y paquete compartido compatibles |
| `npm run lint --workspace @sorteos/web` | Sin advertencias ESLint |
| `npm run typecheck --workspace @sorteos/web` | TypeScript estricto |
| `npm run test --workspace @sorteos/web` | Cliente, multipart, seguridad de localizador, huella, archivo y fechas |
| `npm run test:core --workspace @sorteos/web` | Dinero, zona horaria, configuración y redacción |
| `npm run api:check-catalog --workspace @sorteos/web` | Rutas públicas compartidas presentes |
| `npm run test:e2e --workspace @sorteos/web -- --max-failures=3` | Regresión en cinco perfiles y demo sin órdenes falsas |
| `npm run test:orders:live --workspace @sorteos/web` | Escenario integrado con NestJS, DB efímera y tres motores |
| `npm run build --workspace @sorteos/web` | Producción live, rutas dinámicas y privacidad |

El escenario integrado usa NestJS y PostgreSQL reales más el proveedor **privado de test B4**, no Supabase remoto. Comprueba ausencia de orden sin archivo/email, doble clic, un único POST, PNG/JPG/PDF válidos, rechazo de comprobante corrupto conservando campos, precio/números exactos, recarga de confirmación sin nuevo upload, cookie perdida sin números, respuesta perdida seguida de pausa/recarga y recuperación exacta sin otra orden/carga, fallo de Storage con la misma intención y vencimiento bloqueando envío. Axe y ausencia de desbordamiento se comprueban sobre el formulario móvil. Capturas en [screenshots/f4](screenshots/f4).

Para repetirlo, iniciar Next en 3105 apuntando a `http://127.0.0.1:3106/api/v1` y PostgreSQL de pruebas local. El harness inicia su NestJS en 3106 y crea/elimina DB/rol efímeros:

```powershell
.\scripts\start-web.ps1 -Port 3105 -ApiBaseUrl 'http://127.0.0.1:3106/api/v1'
# Otra terminal, desde el mismo worktree:
$env:TEST_DATABASE_URL = 'postgres://demo_test@127.0.0.1:54339/postgres'
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\Users\Omar Ureña\Desktop\AppRifas\.tmp\playwright-browsers'
npm run test:orders:live --workspace @sorteos/web
```

No ejecutar la regresión demo y otro `next dev` simultáneamente en el mismo checkout. El test toma el setup/cleanup de `apps/api/test/orders.integration.ts`; falla si ese punto cambia. Antes de reutilizar una instancia PostgreSQL externa, comprobar que sea de pruebas; nunca indicar una base operativa o remota.

## Límites externos y siguiente fase

No se verificaron bucket/clave/migraciones de Supabase remoto, cookies en dominios desplegados, CI remota, Safari en iPhone físico ni lector humano. La política operativa de privacidad, identidad/canal del organizador y requisitos para operar rifas reales requieren revisión del propietario. La UI no inventa autorizaciones, datos bancarios o un contacto de soporte.

El correo es obligatorio como dato de contacto; no se implementan envío de mensajes, OTP ni recuperación de identidad por email. Perder cookie o metadatos puede impedir recuperación autónoma; no borra la orden ni libera números RESERVED. **F5** será la interfaz administrativa para revisión y resolución, sobre los endpoints B5 ya existentes.

Decisiones: [ADR F004](../decisions/F004-order-receipt-form.md). Las entregas F2/F3 quedan como registros históricos.

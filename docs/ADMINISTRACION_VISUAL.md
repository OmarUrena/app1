# Administración: estructura de trabajo empresarial

Revisión solicitada por el propietario el 2026-11-06, después de M5. Se trabaja sobre main en la misma carpeta.

## Estructura

- `/admin`: visión general con importes confirmados y pendientes separados, rifas publicadas, ocupación e inventario real.
- `/admin/ordenes`: tabla de órdenes con fecha, rifa, boletos, importe, estado, alertas y acceso individual a revisión. Filtros por estado, nombre de rifa e intervalo de fechas; paginación real.
- `/admin/ordenes/:id`: encabezado de la orden, datos de compra/comprador/transferencia separados, comprobante privado, decisiones, historial e incidencias.
- `/admin/rifas`: tabla de inventario y publicación, filtro por estado y acción Crear rifa.
- Editor: Información general, Configuración de venta, Reglas y condiciones y Fotografías del premio. Guardado y vista previa al pie; publicación, pausa/reanudación y cierre en un panel separado.
- `/admin/reportes`: selección por nombre de rifa, estado y fechas; explicación del archivo CSV y su tratamiento privado.
- Login, MFA, errores, carga y página no encontrada tienen presentación administrativa propia.

La navegación lateral indica la sección actual y el permiso real. En móvil se despliega mediante Abrir navegación; la tabla se desplaza dentro de una región accesible. Se mantienen títulos jerárquicos, etiquetas visibles, estados textuales, foco de teclado y mensajes de carga/error/vacío.

## Separación visual

Las páginas públicas se agrupan en `app/(public)` conservando sus URLs y presentación. Solo ese layout renderiza Header/Footer, aviso de participación y navegación de compradores. `/admin` usa `admin.css`, limitado por `.admin-app`: gris claro/blanco, azul y tipografía sans serif. No se oculta la cabecera pública con JavaScript ni se mezcla navegación comercial en las pantallas privadas.

Los componentes de sesión, permisos, MFA, confirmaciones, importes enteros, versiones y claves de idempotencia conservan su lógica. Los filtros muestran títulos y envían internamente identificadores. No hay cambios de datos, contrato OpenAPI, cliente generado ni migraciones. No se amplían plazos temporales de autenticación.

Decisión: [ADR 0021](decisions/0021-admin-workspace.md).

## Verificación de esta revisión

| Comprobación | Resultado |
|---|---|
| Frontend unitario | PASS 49/49; nuevas comprobaciones de tabla, filtro y navegación activa |
| Lint y typecheck web | PASS, incluido el formato compacto de fechas y la tabla final |
| Login local en 3000 | PASS HTTP 200, campos habilitados tras hidratación, sin cabecera pública ni desbordamiento móvil |
| Integración M5 | PASS 5/5 sobre PostgreSQL/Nest/Next aislados, sin omitidas; repetida con columnas y capturas definitivas |
| Regresión M4 | PASS 16/16, sin omitidas; permisos, MFA, idempotencia, decisiones, archivo privado y perfiles temporales de prueba; incluye Firefox/WebKit |
| Catálogo público y accesibilidad | PASS 75 casos públicos en Chromium móvil/tablet/escritorio, Firefox y WebKit; 5/5 casos de login al repetir con independencia visual y contraste corregido |
| Build producción | PASS con configuración live/production explícita y sin depender de credenciales ni fotos locales |

La integración utiliza cuentas y archivos sintéticos en bases locales desechables. No se usa la contraseña del propietario para generar capturas. Las pruebas históricas de M4/M5 no sustituyen la regresión de esta revisión.

Comandos: `npm test --workspace @sorteos/web`, `npm run typecheck --workspace @sorteos/web`, `npm run lint --workspace @sorteos/web`, `npm run test:e2e --workspace @sorteos/web` y su repetición `-- --last-failed` para los cinco casos del login. Integración: `powershell -NoProfile -File scripts/test-backend-local.ps1 -PasswordAuthentication -Port 54346 -TestScript test:m4` y `test:m5`; para guardar capturas nuevas de M5 se establece ADMIN_VISUAL_QA=1. El build usa API_MODE=live, APP_ENV/NODE_ENV=production, API HTTPS de ejemplo y variables Auth/fotos explícitamente vacías mediante entorno Node, para evitar que PowerShell elimine variables vacías y vuelva a cargar valores locales de desarrollo.

Las pruebas iniciales detectaron expectativas del antiguo banner público, un contraste de 4.43:1 en el enlace de regreso del login y de 4.38:1 en las etiquetas del detalle. Se actualizaron las expectativas a la nueva estructura y se oscurecieron los textos; se mantienen todas las comprobaciones de accesibilidad, permisos y decisiones financieras.

Capturas de la revisión en `docs/frontend/screenshots/admin-redesign/`. No se despliega ni se altera Supabase durante este trabajo. Próximo alcance posible: revisar la presentación pública cuando el propietario lo solicite; no se da por iniciado M6 ni la salida a producción.

Verificación terminada el 2026-11-07, hora de Santo Domingo. Se conserva la evidencia histórica M4/M5; las nuevas capturas documentan esta revisión. La aprobación de pagos y las transferencias de los tests pertenecen exclusivamente a datos sintéticos locales. El ensayo con la cuenta personal sigue requiriendo su autenticación habitual; no se prolonga la ventana anterior sin TOTP.

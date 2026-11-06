# ADR 0018 — Proceso completo de desarrollo sin TOTP

Fecha: 2026-11-06. Estado: implementado y aplicado al proyecto de desarrollo por petición explícita «Permite también hacer todo el proceso, este proyecto todavía no se lanza a producción».

La excepción de ADR 0017 permitía comprobar login/logout pero mantenía MFA financiero. Se amplía al flujo M1–M4 disponible: pre-reserva, formulario con archivo, consulta privada, revisión, aprobación, resolución y cancelación. No implementa el editor M5, cierre o sorteo, ni publica una versión productiva.

## Capacidad privada con vencimiento

La API exige `ADMIN_DEVELOPMENT_MFA_TOKEN` de 256 bits y `ADMIN_DEVELOPMENT_MFA_UNTIL`, solo en development/test con HOST y orígenes CORS HTTP loopback. Staging/production rechazan esas variables al arrancar. La capacidad queda únicamente en el entorno privado de NestJS, no en Next.js, cookies, cliente generado ni respuestas.

La migración `20261106203619_development_admin_access` añade una tabla privada RLS que conserva solo SHA-256 de la capacidad, administrador y plazo. El plazo está limitado por CHECK a ocho horas desde creación; la activación actual dura dos horas. Runtime no puede leer ni modificar concesiones; su política es denegatoria. La preparación NestJS autorizada inserta la concesión para el único OWNER activo y genera auditoría. No se añaden roles ni BYPASSRLS.

La función booleana privada `development_mfa_access_valid()` requiere contexto de administrador, sesión Auth real vigente y capacidad coincidente/no vencida. La comprobación de sesión continúa usando ADR 0016. Es SECURITY DEFINER con search_path vacío y ejecución limitada a propietario/runtime para encapsular la lectura de la tabla protegida. La autorización financiera sigue SECURITY INVOKER y comprueba primero identidad/allowlist; la rama de desarrollo queda auditada como `DEVELOPMENT_MFA_ACCESS`. Los límites OWNER/ADMIN permanecen: una concesión no convierte ADMIN en OWNER.

Los JWT se verifican normalmente y no se inventan factores, AAL2 o una fecha de MFA. `GET /admin/session` incorpora `developmentAccessUntil`; cuando se utiliza la excepción, `mfaVerifiedUntil` es null. OpenAPI/cliente pasan a contrato 0.5.2. La web presenta el aviso de desarrollo y revalida al vencer el plazo. Sin concesión/capacidad válida continúa el MFA habitual. Una sesión revocada responde 401 incluso durante la excepción.

## Compra DEMO sin cuentas reales

La migración `20261106205731_development_demo_checkout` añade una comprobación privada de la capacidad para el checkout invitado. La API configura el token transaccionalmente desde su entorno; el navegador no lo suministra. La función valida hash/plazo y OWNER activo sin exponer filas.

Se conserva el CHECK original que impide activar una cuenta `is_demo`. Las cuentas DEMO siguen inactivas y no aparecen por defecto; solo se ofrecen durante la capacidad vigente. OrdersService las acepta exclusivamente para `demo-prueba-completa` con reglas `DEMO-PRUEBA-1`, revalidando dentro de ambas transacciones de envío. El comprador creado en esa ruta queda `is_demo=true`. Fuera de esa ventana/rifa se mantienen los filtros de banco real activo. No se introducen números bancarios ni permisos legales ficticios.

La herramienta NestJS `dev:prepare`, con `DEVELOPMENT_SETUP_ENABLED=true`, prepara idempotentemente una rifa de 100 números y RD$100 por número, cuenta claramente DEMO y concesión para el OWNER existente. No crea usuarios, clientes, órdenes o pagos ficticios. La rifa indica que no hay premio comercial, transferencia ni sorteo real y termina al vencer la ventana. La aprobación de publicación se refiere únicamente al fixture de desarrollo autorizado por el propietario.

El CLI ejecuta las escrituras mediante un contexto NestJS y una transacción con bloqueo consistente. Genera imagen propia y PDF «COMPROBANTE DEMO - NO ES UN PAGO» antes de abrir la transacción. Son artefactos públicos sintéticos sin datos bancarios; no son comprobantes de clientes. `.gitignore` excluye estos archivos generados. La cantidad/números de las compras siguen calculándose y asignándose en servidor; no se altera inventario para fingir órdenes.

## Archivos privados locales

El perfil CLI no está autenticado para revelar una clave de Storage; el conector disponible solo permite claves publicables. No se imprime ni se copia una clave privilegiada al cliente. `DEVELOPMENT_LOCAL_RECEIPTS=true` activa un adaptador de archivos para esta prueba, rechazado en staging/production o HOST/orígenes externos.

Los comprobantes se guardan realmente en `.tmp/development-receipts/pending`, fuera de Next public. Solo se admiten claves UUID con extensión JPG/PNG/PDF, tamaños y tipos permitidos; no hay sobrescritura. Se rechazan traversal y enlaces simbólicos en el directorio privado. Upload, descarga y compensación/limpieza usan el mismo contrato del servicio. El acceso HTTP permanece exclusivamente en el proxy autenticado financiero y no expone rutas del sistema ni URLs públicas. Supabase Storage privado sigue siendo el adaptador normal y debe configurarse antes de un entorno productivo.

La prueba real descubrió un fallo anterior en Node --watch: sus workers envían avisos internos `watch:require`/`watch:import`, incluso para módulos sin nombre. El parser confundía el primer aviso con un comprobante y podía cerrar la API. Se ignoran únicamente esos avisos, se valida el payload de resultado y se conserva el timeout. Un mensaje inválido produce 422, sin registrar el archivo ni cerrar la API. Hay regresión con WATCH_REPORT_DEPENDENCIES y un PDF real.

## Recuperación y límites

Para finalizar antes, retirar las variables de capacidad y reiniciar la API, o vencer la concesión mediante una actualización autorizada. Conservar el registro y su auditoría; no borrarlos. Para producción, retirar también `DEVELOPMENT_LOCAL_RECEIPTS` y configurar bucket/claves privados reales. Una migración correctiva puede restaurar la implementación anterior de las funciones, sin borrar las órdenes/reservas creadas durante las pruebas.

El down B5 local vacío retira primero las extensiones y repara sus versiones en orden inverso con el CLI oficial; exige ausencia total de datos, incluida auditoría/concesiones. Nunca aplicarlo para borrar la preparación remota. Los SQL ya aplicados permanecen intactos; el historial tiene ocho migraciones y 17 tablas RLS.

Resultados, comandos y operación actual en [DESARROLLO_PRUEBA_COMPLETA.md](../DESARROLLO_PRUEBA_COMPLETA.md). Las simulaciones de pago son exclusivamente DEMO; no se afirma ingreso bancario real ni validación personal de la contraseña del propietario.

# ADR 0019 — Reinicio de API por contenido, no por avisos de dependencias

Fecha: 2026-11-06. Estado: aplicado como corrección de disponibilidad administrativa local.

El intento real de login a las 22:43 UTC obtuvo Auth 200 y terminó en 503 del servidor web en aproximadamente 1,8 segundos, sin una solicitud administrativa registrada en NestJS. El supervisor `node --watch` mostró reinicios por archivos de node_modules (jose, RxJS, Swagger y otros); durante esos reinicios el puerto no estaba disponible. No hubo un nuevo error SQL de permisos correspondiente al intento. La API volvía a responder después, por lo que comprobar únicamente ready no reproducía la interrupción del login.

`npm run dev:api` utiliza ahora `src/dev.ts`. Cada 750 ms calcula una huella de contenido de fuentes TypeScript/JSON dentro de src y de .env/package.json/tsconfig. No inspecciona dependencias, dist, Git o archivos de comprobantes. Cambios de fechas/metadatos sin cambio de bytes no provocan reinicio. Las huellas y valores de entorno no se imprimen.

Un cambio real detiene el hijo y espera su cierre antes de iniciarlo de nuevo; los cambios simultáneos se agrupan para mantener una sola instancia. El hijo ejecuta el mismo main/configuración/Auth reales, sin WATCH_REPORT_DEPENDENCIES heredado. SIGINT/SIGTERM detienen observador e hijo. Un fallo de arranque se informa y espera a una corrección de código/configuración; no se oculta adoptando otro puerto. Al cambiar dependencias instaladas o el propio supervisor se debe reiniciar el comando de desarrollo.

Se retiró exclusivamente el supervisor anterior iniciado por el agente y se conservó la web abierta. La prueba real realizó cuatro consultas ready 200 y lecturas de fuentes, comprobando que el proceso que escucha permanecía con el mismo PID. La prueba automatizada usa archivos reales: modifica una dependencia y fechas de fuente sin callback; luego verifica cambios de código, .env y creación/eliminación de fuentes. Se verifica que el directorio de prueba esté dentro de .tmp antes de eliminarlo.

Verificación: 20/20 pruebas base API, lint, typecheck y build API/cliente aprobados; 19/19 financieras al verificar la renovación de la ventana de desarrollo. No cambia el contrato HTTP, TLS, autorización o migraciones. Los logs de esta corrección están ignorados en `.tmp/admin-api-watch-fix-*.txt`; los nuevos logs del servicio son `api-content.stdout.log`/`api-content.stderr.log` en `.tmp/admin-login-test-runtime/`.

Para recuperar el tiempo de prueba se renovó la capacidad de desarrollo mediante la preparación NestJS ya autorizada hasta `2026-11-07T00:53:11.000Z` (8:53 p. m. del 6 de noviembre, Santo Domingo). La herramienta puede extender únicamente la fecha de fin de su rifa DEMO publicada, sin cambiar precio, números, reglas ni órdenes. La prueba financiera verifica esa conservación y que una concesión diferente no permita utilizar una capacidad vencida. Se conservaron las concesiones previas y la auditoría; no se creó otra orden ni se modificaron estados de pago.

El login personal corresponde al propietario; no se solicitaron ni utilizaron su contraseña o TOTP. Los controles de producción permanecen intactos. Esta corrección sustituye la suposición anterior de que mantener un proceso `node --watch` bastaba para disponer de una API estable durante la prueba local.

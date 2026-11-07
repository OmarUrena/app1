# M5: operación diaria y cierre

Fecha: 2026-11-06.

El cierre es irreversible y exige una rifa PAUSED sin pre-reservas ACTIVE cuyo vencimiento esté en el futuro. Pausar impide nuevos holds, pero permite terminar los ya concedidos. Cerrar rechaza también el envío de órdenes; por ello no se fuerza el cierre ni se liberan holds para conseguirlo. La comprobación y el cambio comparten el bloqueo de la rifa utilizado por checkout; PostgreSQL vuelve a exigir la regla.

Las órdenes existentes conservan reservas e histórico y pueden conciliarse después del cierre. El cierre no declara ganador ni habilita DRAWN. Las órdenes pendientes y las incidencias monetarias se muestran separadamente; cualquier futura función de resultados deberá exigir que ambas cifras sean cero.

Los indicadores se consultan en una única instantánea REPEATABLE READ. HELD cuenta exclusivamente holds vigentes; sus boletos vencidos se computan disponibles, sin modificar reservas de órdenes. Ingresos confirmados significa suma de órdenes PAID, no archivos recibidos. Importes agregados viajan como cadenas enteras de unidades menores para evitar pérdida de precisión. La ocupación comprende HELD + RESERVED + SOLD.

CSV: solo propietario con sesión financiera vigente, filtros de órdenes, máximo 10 000 filas; si se supera, se rechaza sin truncar y se pide acotar fechas/rifa. No contiene identidad/contacto del comprador, credenciales, números asignados, referencias bancarias ni comprobantes. Se auditan filtros y cantidad, nunca contenido privado. Texto escapado para CSV y fórmulas de hojas de cálculo. Las exportaciones se descargan con no-store y deben eliminarse cuando termine su finalidad.

Las imágenes propias se normalizan en servidor a WebP, sin metadatos; máximo 5 MiB y 20 millones de píxeles. Se generan claves UUID y se prohíbe sobrescribir. En entornos desplegados se usa exclusivamente Storage público para fotos del premio, separado del bucket privado de comprobantes. Un adaptador local explícito y restringido a loopback permite probar las fotos sin credenciales privilegiadas. No se incluyen archivos de compradores en ese adaptador.

No se añade recuperación por teléfono/correo ni OTP sin proveedor verificado. Se conserva la consulta por sesión protegida existente. No existe eliminación automática del histórico contable: cualquier futura política legal de retención/anonimización debe aprobarse antes de producción.

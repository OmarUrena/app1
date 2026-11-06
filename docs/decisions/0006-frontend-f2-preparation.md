# ADR 0006 — Cierre de F1 y preparación F2 sin contrato B2

Renumerada al integrar B2 para conservar el número 0005 del ADR de catálogo backend. El contexto siguiente corresponde a la preparación anterior a B2.

Fecha: 2026-11-01. Estado: aceptada para preparación; integración F2 pendiente de B2.

## Contexto

El propietario autorizó la siguiente fase y el cierre de pendientes. La API disponible solo implementa B0. Se confirmó que la otra sesión continuará B1/B2. La creación de un worktree ahora es posible: feat/frontend-f2 trabaja en .tmp/frontend-f2, sin modificar la rama backend.

## Decisiones

1. No implementar endpoints backend, tipos de negocio manuales o casts de paths inexistentes. Un script comprueba las rutas del OpenAPI existente y comunica explícitamente el bloqueo de F2.
2. Conservar la variable API_BASE_URL versionada, pero pasar únicamente su origen al cliente compartido, porque sus paths ya incluyen /api/v1. Verificar contra la operación health generada. El backend y su cliente no se modifican.
3. Mantener no-store y cookies; no introducir reintentos automáticos. Traducir errores sin exponer cuerpos internos y aceptar solo correlación segura de respuesta.
4. Usar retry en error.tsx conforme a la documentación y tipos instalados de Next.js 16.4.3: reintenta el segmento mediante refresh, además de limpiar la frontera. Mantener prueba de recuperación.
5. Cerrar F1 en Chromium, Firefox y WebKit móvil. WebKit es emulación de motor/configuración, no certificación de Safari en un iPhone físico. Ejecutar un servidor de pruebas propio en 3102, configurable con PLAYWRIGHT_PORT; conservar el puerto 3000 para el usuario.
6. Impedir interacción con buscador, filtros, cantidad, menú y galería antes de que se instalen sus handlers de React. El HTML SSR permanece navegable con sus enlaces. useSyncExternalStore diferencia el snapshot inicial servidor/cliente: [referencia oficial de React](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering). Una regresión retiene los scripts de red, comprueba el control deshabilitado y verifica la primera búsqueda al liberarlos.
7. Hacer explícito tabIndex=0 en el enlace de salto: la comprobación local de WebKit omite los enlaces implícitos bajo su preferencia de tabulación por defecto, pero alcanza el enlace explícito. No se usa tabindex positivo ni se omiten las pruebas de teclado.
8. Retirar el scroll suave global para evitar carreras entre desplazamiento, foco y activación en navegadores. Mantener foco visible y padding de los destinos. Priorizar la primera fila de imágenes del catálogo y conservar lazy loading en el resto.
9. Fijar turbopack.root al monorepo de cada checkout para evitar que un worktree anidado resuelva contra el árbol de dependencias de la otra sesión.

## Consecuencias

El trabajo independiente de F2 puede revisarse y probarse sin inventar integración. ESTADO_F2.md enumera lo que backend debe entregar y los controles de consumo pendientes. F1 conserva su dirección visual; se corrigen únicamente carga inicial, compatibilidad y recuperación. Dispositivos reales y revisión humana siguen siendo verificaciones externas pendientes, sin afirmar que se hayan ejecutado.

# 0021 — Espacio visual independiente para administración

Fecha: 2026-11-06. Solicitud del propietario: reorganizar primero la administración con estructura empresarial, navegación clara, órdenes en tabla y formularios legibles.

La presentación pública permanece dentro de `app/(public)`, con sus mismas URLs y su propia cabecera, pie, aviso de participación y navegación móvil. El layout raíz conserva HTML, idioma y proveedor de notificaciones. `/admin` tiene un layout propio y estilos limitados por `.admin-app`: fondo claro, tipografía sans serif, controles compactos, navegación lateral y estados legibles. No se decide la estructura mediante CSS que esconda la cabecera pública después de cargar.

El marco administrativo conserva la comprobación periódica de sesión, revocación, caducidad y perfil de desarrollo existente. La navegación móvil se despliega con un botón real y expone aria-expanded/aria-controls. El inicio de sesión y MFA tienen su propia presentación administrativa, sin navegación de compradores.

Órdenes y rifas usan tablas semánticas con cabeceras, estado textual, importes alineados y acciones por fila. En pantallas estrechas, la tabla desplaza horizontalmente dentro de una región accesible; el documento no debe desbordarse. No se incorporan selección masiva, búsqueda global, tendencias ni métricas sin respaldo del contrato.

Los filtros de rifa muestran títulos y cargan más resultados mediante paginación real; el UUID se envía internamente a la API. El editor agrupa información general, venta, reglas y fotografías, mantiene explicaciones de los campos bloqueados y separa el guardado de la publicación. Las confirmaciones y claves de idempotencia de pagos permanecen intactas.

Este trabajo refina la interfaz existente de M4/M5. No inicia M6/M7, no cambia contratos ni datos, no requiere migración y no modifica los plazos de acceso temporal. Validar frontend, integración de administración y regresión pública con datos sintéticos aislados. No se utilizan credenciales personales ni sesiones inventadas para capturar el panel.

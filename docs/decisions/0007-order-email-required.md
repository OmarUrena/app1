# ADR 0007 — Correo obligatorio del comprador

Fecha: 2026-11-03. Estado: acordado para B4/F4, implementación pendiente.

Actualización B4: validación backend y CHECK para nuevas escrituras implementados;
ver ADR 0008. La interfaz F4 sigue pendiente.

El usuario exige correo obligatorio en el formulario único de orden. Se actualizan
contrato, planes backend/frontend y matriz QA: customerEmail debe estar presente,
no vacío y tener formato válido, máximo 254 caracteres. API valida antes del
upload y de cualquier creación de orden; la validación del navegador no basta.

No se modifica una migración B1 aplicada ni se inventan direcciones para clientes
históricos. B4 deberá implementar la regla en DTO/servicio y la migración compatible
que corresponda para los datos existentes. En esta tarea no se implementa B4.

Un correo recogido no prueba titularidad, concede autorización ni sustituye la
sesión secreta. Verificación de email, OTP o envío de confirmaciones requieren
definir su flujo/proveedor; esta decisión no los activa automáticamente.

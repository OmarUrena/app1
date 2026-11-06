# ADR 0010 — Proyecto integrado en una carpeta

Fecha: 2026-11-05. Estado: aceptada por petición del propietario.

El checkout principal contenía backend B5 y frontend F1, mientras feat/frontend-f4 residía en .tmp/frontend-f2. Se incorporan los cambios frontend F2–F4, pruebas, capturas y decisiones en la raíz sin sobrescribir el backend ni los cambios documentales locales. Se conserva OpenAPI generado desde NestJS B5 y su cliente compartido; no se toma una versión anterior desde la rama frontend.

Se añade npm run dev:web, que inicia Next live en 3000 con API en 3001, sin modificar secretos ni .env.local. Los dos servicios trabajan desde esta raíz. El worktree antiguo se conserva por contener trabajo pendiente de otra sesión; ya no es necesario para ejecutar el proyecto.

No hay migraciones nuevas, despliegue ni cambios de Supabase remoto. El flujo de compra necesita configuración real de desarrollo; el modo demo sigue sin mutaciones. La integración se entrega sin commit automático para conservar el control de los cambios pendientes del usuario. Resultados en docs/ESTADO_FRONTEND.md.

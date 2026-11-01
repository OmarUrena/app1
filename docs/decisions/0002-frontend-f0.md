# ADR 0002 — Base frontend F0 e integración entre sesiones

Fecha: 2026-10-27. Actualización: 2026-10-29. Estado: aceptada; F0 validado localmente.

## Contexto

El repositorio comenzó con documentos y una rama backend sin commits. La sesión backend agregó el workspace mientras se construía F0. El entorno deniega escritura en .git y acceso al registro npm. No fue posible crear un worktree ni instalar dependencias. No se modifican archivos de backend, contrato compartido, scripts raíz ni su configuración de CI.

## Decisiones

1. Mantener todo el frontend en apps/web, con nombre @sorteos/web y consumo de @sorteos/api-client mediante workspace. Backend posee el OpenAPI y su generación. No duplicar esquemas o rutas de negocio. Los archivos propios adicionales son este ADR, docs/frontend y .github/workflows/frontend.yml.
2. Next.js 16, React 19, TypeScript estricto, Tailwind 4 y ESLint 9. Versiones exactas pendientes del lockfile compartido; rangos declarados, no presentar compatibilidad como comprobada. Se consultó documentación oficial de instalación: https://nextjs.org/docs/app/getting-started/installation y https://tailwindcss.com/docs/installation/framework-guides/nextjs.
3. Variables de API solo del servidor. API_MODE=mock explícito, exclusivo de desarrollo/test y bloqueado con NODE_ENV=production. Producción exige API live y HTTPS cuando se configura URL. F0 permite compilar el armazón sin API_BASE_URL, sin inicializar cliente ni inventar origen, para conservar compatibles los builds del workspace. La integración F2 exigirá URL. F0 no realiza peticiones de negocio; el adaptador usa el cliente compartido con cookies y errores normalizados.
4. Fixtures locales vacíos sin datos de personas, cuentas, premios u órdenes. No hay compra simulada. Login explica la falta de autenticación y no captura credenciales. /admin redirige a esa explicación sin exponer información.
5. Identidad visual propia verde oscuro, fondo claro y acento lima; tipografía de sistema sin descarga externa. Ilustración decorativa de CSS/HTML identificada como ilustración, sin números de boleto. Responsive por CSS desde 360px y foco visible; validación de navegador pendiente.
6. Formato DOP a partir de centavos enteros seguros; separación de parte entera con BigInt para evitar perder centavos al presentar valores grandes. No realizar cálculos de compra en navegador. Fechas UTC presentadas en America/Santo_Domingo.
7. Tests de núcleo ejecutables sin paquetes mediante Node 24; Vitest para interacción de componentes y Playwright/axe para navegación, a11y, responsive y capturas. No afirmar aprobación de controles que no pudieron iniciarse.

## Consecuencias y siguientes pasos

La estructura queda disponible para F1. El 29 de octubre se verificaron instalación frozen-lockfile, generación OpenAPI/cliente, lint, typecheck, build y las suites de núcleo, UI y navegador. Chromium se descargó con acceso de red autorizado en una ruta temporal del workspace. Se corrigieron una advertencia de lint y el contraste detectado por axe. Playwright usa npm run dev con dirección 127.0.0.1 para conservar compatibilidad Windows; no depende del ejecutable global pnpm. CI remota pendiente. Separar ramas mediante worktree antes de nuevas fases cuando lo permitan los permisos. No se despliega, no se modifica persistencia y no se habilita autenticación o compra en esta fase.

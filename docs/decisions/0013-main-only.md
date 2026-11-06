# ADR 0013 — main como única rama de trabajo

Fecha: 2026-11-05. Estado: aceptada por instrucción explícita del propietario.

El propietario solicita conservar solo `main` y reunir en ella todo el trabajo actual. La carpeta principal contenía B5, frontend integrado y M4 sin commit; un worktree antiguo conservaba frontend F4 y una incorporación local del backend.

Se compara el contenido de ambas carpetas antes de consolidar. El código funcional antiguo ya está incorporado o ha sido ampliado en M4. Se conservan las actualizaciones documentales y capturas históricas adicionales; los estados B0–B4/F0–F1 separados ya están consolidados en los estados por capa y no se reintroducen como fuentes paralelas.

La rama de la carpeta principal pasa a llamarse `main` y se guarda el estado completo. Se incorpora la ascendencia del frontend mediante un merge de historial que conserva el árbol integrado actual, después de verificar que su contenido vigente está incorporado. Así sus commits no se pierden al eliminar los nombres de ramas anteriores. Las ramas backend anteriores también son ancestros de main.

Antes de retirar referencias se guardan un bundle verificable del historial y copias de cambios staged/unstaged y archivos pendientes en `.tmp/main-consolidation-1793935232041/`, ignorada por Git. La carpeta completa del worktree antiguo se conserva allí como `frontend-workspace`, incluyendo sus archivos locales ignorados; deja de ser un worktree activo. El respaldo permanece solo en esta máquina y no publica secretos ni dependencias.

Se publica `main`, se establece como predeterminada en GitHub y se retiran las ramas anteriores locales/remotas tras verificar su ascendencia. Se mantiene un solo worktree activo: la raíz del proyecto en main. No se reescriben commits antiguos ni se hace force push sobre una rama de desarrollo.

En adelante, trabajar y guardar commits únicamente en `main`. No crear ramas ni worktrees adicionales. Los identificadores B/F permanecen como referencias técnicas, no como nombres de ramas nuevas. Una publicación de código en GitHub no autoriza despliegues, operaciones de Supabase ni ventas reales.

# Infraestructura B0/B1/B2

B0 solo consulta salud de PostgreSQL. B1 añade un único sistema de migraciones:
Supabase CLI 2.122.0 y `supabase/migrations/`. Tablas privadas en `sorteos`, seed
DEMO en `seeds/demo.sql` ejecutado desde las herramientas del backend y recuperación
en `recovery/`. Ver [estado de verificación B1](../docs/ESTADO_B1.md).

Los tests de B1 crean DBs desechables con el usuario de pruebas (requiere CREATEDB
y CREATEROLE para verificar RLS). No aplican migraciones en la DB original que
se proporciona mediante TEST_DATABASE_URL. El script Windows
`scripts/test-backend-local.ps1` prepara su propia instancia en el puerto 54339.
Pruebas B1 ejecutadas y aprobadas con PostgreSQL 17.5: 20/20 de integración.

B2 añade otra migración en el mismo historial: rol NOLOGIN `sorteos_runtime`,
políticas RLS de servidor y metadatos de versión/aprobación/derechos de imágenes.
El API conecta con un login miembro del grupo y hace SET LOCAL ROLE en todas las
operaciones de negocio; las pruebas también usan un login limitado para el API.
No se concede ese rol a anon/authenticated ni se expone sorteos por la Data API.
El usuario que aplica migraciones necesita permisos de propietario y CREATEROLE;
el login de ejecución no los necesita. No reutilizar credenciales del migrador
para desplegar el API. Los comandos suministrados solo operan en bases loopback.

La integración B2 verifica Auth/JWKS/Storage con un proveedor HTTP local y firmas
reales; no crea usuarios ni objetos en Supabase remoto. Usar el proyecto propio
y configuración de servidor para la verificación de staging.

PostgreSQL aislado opcional con Docker:

```powershell
docker compose -f infra/compose.test.yaml up -d --wait
$env:TEST_DATABASE_URL = 'postgres://demo_test:demo_local_only@127.0.0.1:54329/sorteos_test'
pnpm test:integration
docker compose -f infra/compose.test.yaml down
```

Credenciales exclusivamente DEMO para el contenedor local, sin volumen persistente.
La prueba consulta `SELECT 1`; no cambia esquema ni datos. También puede usarse
una instancia PostgreSQL de pruebas ya disponible, mediante `TEST_DATABASE_URL`.
No utilizar conexiones de producción. Docker no es requisito para ejecutar la API.

La descripción anterior de `SELECT 1` corresponde a B0. `test:integration` ahora
incluye también el esquema B1, exclusivamente en nuevas DBs creadas por la suite.

## PostgreSQL instalado en Windows, sin Docker

Verificado con PostgreSQL 17.5. Crear una instancia exclusiva del proyecto (una sola vez):

```powershell
New-Item -ItemType Directory -Force .tmp/postgres-b0 | Out-Null
& 'C:/Program Files/PostgreSQL/17/bin/initdb.exe' -D .tmp/postgres-b0/data -U demo_test --auth=trust --encoding=UTF8 --locale=C
```

El usuario `demo_test` y la autenticación trust se usan solo para esta instancia
de pruebas ligada a loopback. No reutilizar esta configuración fuera del entorno local.
No ejecutar initdb contra un directorio de datos ya existente.

Desde la raíz, iniciar, verificar y detener únicamente esta instancia:

```powershell
$pgToolsPath = 'C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe'
& $pgToolsPath -D .tmp/postgres-b0/data -l .tmp/postgres-b0/server.log -o '-h 127.0.0.1 -p 54329 -c timezone=UTC' -w start
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar PostgreSQL temporal' }
try {
    $env:TEST_DATABASE_URL = 'postgres://demo_test@127.0.0.1:54329/postgres'
    npm.cmd run test:integration
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la prueba de integracion' }
} finally {
    Remove-Item Env:TEST_DATABASE_URL
    & $pgToolsPath -D .tmp/postgres-b0/data -m fast -w stop
}
```

En el sandbox de Windows, initdb/pg_ctl pueden requerir permisos ampliados para
crear procesos. No se detiene ni altera el servicio PostgreSQL instalado del sistema.

# Infraestructura B0

No hay migraciones ni seed: B0 no crea tablas de negocio. El sistema único de
migraciones se elegirá en B1 antes de crear el esquema.

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

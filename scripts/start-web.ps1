
[CmdletBinding()]
param(
    [ValidateRange(1024,65535)]
    [int]$Port = 3000,

    [string]$ApiBaseUrl = 'http://127.0.0.1:3001/api/v1',

    [switch]$Demo
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$frontendWorkspace = [IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..')
)

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Instalar Node.js 22 o 24 antes de iniciar.'
}

if (-not (Get-Command pnpm.cmd -ErrorAction SilentlyContinue)) {
    throw 'No se encontro pnpm. Verificar instalacion.'
}

$nextPackage = Join-Path $frontendWorkspace 'apps/web/node_modules/next/package.json'

if (-not (Test-Path -LiteralPath $nextPackage)) {
    throw 'Faltan dependencias. Ejecutar pnpm install --frozen-lockfile.'
}

$savedWebEnvironment = @{}

foreach ($settingName in @(
    'API_MODE',
    'APP_ENV',
    'API_BASE_URL',
    'WEB_ORIGIN',
    'NEXT_TELEMETRY_DISABLED'
)) {
    $savedWebEnvironment[$settingName] =
        [Environment]::GetEnvironmentVariable(
            $settingName, 'Process'
        )
}

Push-Location -LiteralPath $frontendWorkspace

try {
    $env:API_MODE = if ($Demo) { 'mock' } else { 'live' }
    $env:APP_ENV = 'development'
    $env:API_BASE_URL = $ApiBaseUrl
    $env:WEB_ORIGIN = "http://127.0.0.1:$Port"
    $env:NEXT_TELEMETRY_DISABLED = '1'

    Write-Host "Frontend F4: http://127.0.0.1:$Port"
    Write-Host "Carpeta: $frontendWorkspace"

    if (-not $Demo) {
        Write-Host "Backend separado: $ApiBaseUrl"
        Write-Host "CORS_ORIGINS debe incluir http://127.0.0.1:$Port"
    }

    Write-Host "Iniciando frontend..." -ForegroundColor Cyan

    & pnpm.cmd --filter '@sorteos/web' run dev --port $Port

    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-Warning "El frontend finalizo con codigo $exitCode."
        throw "Fallo al iniciar el frontend. Revisar los errores anteriores de pnpm/Next.js."
    }

} finally {
    Pop-Location

    foreach ($settingName in $savedWebEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable(
            $settingName,
            $savedWebEnvironment[$settingName],
            'Process'
        )
    }
}

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$toolingPath = Join-Path $workspacePath '.tmp/backend-tooling'
$cachePath = Join-Path $workspacePath '.tmp/npm-cache'
$storePath = Join-Path $workspacePath '.pnpm-store'
$pnpmCachePath = Join-Path $workspacePath '.tmp/pnpm-cache'
$pnpmHomePath = Join-Path $workspacePath '.tmp/pnpm-home'

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "El comando $Program fallo (codigo $LASTEXITCODE). Revisar el error anterior; no se considera instalado."
    }
}

$nodeCommand = (Get-Command node -ErrorAction Stop).Source
$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
$manifest = Get-Content -LiteralPath (Join-Path $workspacePath 'package.json') -Raw | ConvertFrom-Json
if ($manifest.packageManager -notmatch '^pnpm@(\d+\.\d+\.\d+)$') {
    throw 'packageManager debe indicar una version exacta de pnpm.'
}
$pnpmVersion = $Matches[1]
$nodeVersion = & $nodeCommand --version
$nodeMajor = [int]($nodeVersion.TrimStart('v').Split('.')[0])
$nodeMinor = [int]($nodeVersion.TrimStart('v').Split('.')[1])
if (-not (($nodeMajor -eq 22 -and $nodeMinor -ge 13) -or $nodeMajor -eq 24)) {
    throw 'Este proyecto requiere Node.js 22.13+ o 24 LTS, segun package.json.'
}

New-Item -ItemType Directory -Force -Path $toolingPath, $cachePath | Out-Null
$previousPnpmHome = [Environment]::GetEnvironmentVariable('PNPM_HOME', 'Process')
Push-Location -LiteralPath $workspacePath
try {
    # Instalar el paquete JS oficial en el proyecto evita el pnpm.exe de PATH.
    # No modifica instalaciones globales ni configura credenciales.
    Write-Host "Instalando pnpm $pnpmVersion local con $nodeVersion..."
    Invoke-Checked -Program $npmCommand -Arguments @(
        'install', '--prefix', $toolingPath, '--cache', $cachePath,
        '--registry=https://registry.npmjs.org/', '--fetch-retries=0', '--fetch-timeout=15000',
        '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false',
        "pnpm@$pnpmVersion"
    )
    $pnpmEntryPath = Join-Path $toolingPath 'node_modules/pnpm/bin/pnpm.cjs'
    if (-not (Test-Path -LiteralPath $pnpmEntryPath)) {
        throw 'No se encontro el entrypoint JavaScript de pnpm.'
    }
    [Environment]::SetEnvironmentVariable('PNPM_HOME', $pnpmHomePath, 'Process')
    Invoke-Checked -Program $nodeCommand -Arguments @($pnpmEntryPath, '--version')

    # La primera instalacion crea pnpm-lock.yaml; posteriormente lo respeta.
    $lockArgument = if (Test-Path -LiteralPath (Join-Path $workspacePath 'pnpm-lock.yaml')) {
        '--frozen-lockfile'
    } else {
        '--no-frozen-lockfile'
    }
    Invoke-Checked -Program $nodeCommand -Arguments @(
        $pnpmEntryPath, 'install', $lockArgument,
        '--store-dir', $storePath, '--cache-dir', $pnpmCachePath,
        '--config.manage-package-manager-versions=false', '--config.update-notifier=false'
    )

    foreach ($scriptName in @('generate:api', 'lint', 'typecheck:api', 'test:config', 'test', 'build:api')) {
        Write-Host "Verificando $scriptName..."
        Invoke-Checked -Program $npmCommand -Arguments @('run', $scriptName)
    }
    Write-Host 'Instalacion y verificaciones del backend completadas. PostgreSQL requiere test:integration por separado.'
} finally {
    [Environment]::SetEnvironmentVariable('PNPM_HOME', $previousPnpmHome, 'Process')
    Pop-Location
}

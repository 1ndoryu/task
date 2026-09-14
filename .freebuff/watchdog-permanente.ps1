# [07-09-2026] Watchdog aislado de la página permanente local de task.
# Vigila únicamente los puertos/PIDs que gestiona start-permanente.ps1. Cada ciclo
# ejecuta el arranque idempotente: si el backend o Vite murió, lo relanza; si
# otro proceso ocupa un puerto, start-permanente aborta sin tocarlo.
# La tarea programada mantiene una sola instancia de este watchdog.
$ErrorActionPreference = 'Continue'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    $pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
    if (-not $pwsh) { throw "watchdog-permanente.ps1 requiere PowerShell 7 (pwsh)." }
    & $pwsh -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath
    exit $LASTEXITCODE
}

$repo = Split-Path $PSScriptRoot -Parent
$start = Join-Path $PSScriptRoot 'start-permanente.ps1'
$runtime = Join-Path $repo '.runtime'
$log = Join-Path $runtime 'watchdog.log'
$pidFile = Join-Path $runtime 'watchdog.pid'
if (-not (Test-Path $runtime)) { New-Item -ItemType Directory -Path $runtime -Force | Out-Null }
Set-Content -Path $pidFile -Value $PID

function Escribir-Log([string]$mensaje) {
    $linea = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $mensaje"
    Add-Content -Path $log -Value $linea
}

Escribir-Log 'Watchdog iniciado.'
try {
    while ($true) {
        try {
            & $PSHOME\pwsh.exe -NoProfile -ExecutionPolicy Bypass -File $start
            if ($LASTEXITCODE -ne 0) {
                Escribir-Log "Arranque devolvió exit code $LASTEXITCODE. Se reintentará en 15 segundos."
            }
        } catch {
            Escribir-Log "Error de arranque: $($_.Exception.Message)"
        }
        Start-Sleep -Seconds 15
    }
} finally {
    if ((Test-Path $pidFile) -and [int](Get-Content $pidFile -ErrorAction SilentlyContinue) -eq $PID) {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
    Escribir-Log 'Watchdog detenido.'
}

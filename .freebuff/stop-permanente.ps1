# [07-09-2026] Detiene el stack permanente local de task (backend + Vite)
# iniciado por start-permanente.ps1. Usa los pid files de .runtime/; NO mata
# procesos ajenos: solo los PID registrados y que sigan siendo nuestros.
$ErrorActionPreference = 'Continue'

$repo = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $repo '.runtime'
if (-not (Test-Path $runtime)) {
    Write-Output "No hay .runtime (nada que detener)."
    exit 0
}

function Stop-Si-Nuestro([string]$pidFile, [string]$patronNombre, [string]$etiqueta) {
    if (-not (Test-Path $pidFile)) { Write-Output "${etiqueta}: sin pid file, nada que hacer."; return }
    $pidVal = [int](Get-Content $pidFile -ErrorAction SilentlyContinue)
    if (-not $pidVal) { Write-Output "${etiqueta}: pid file vacío/ilegible."; return }
    $p = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
    if (-not $p) { Write-Output "${etiqueta}: PID $pidVal ya no existe." }
    elseif ($p.ProcessName -like "*$patronNombre*") {
        Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
        Write-Output "${etiqueta}: PID $pidVal detenido."
    } else {
        Write-Output "${etiqueta}: PID $pidVal ($($p.ProcessName)) NO es nuestro; no se toca."
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
}

# Detener primero el vigilante evita que relance backend/Vite mientras se hace
# una parada manual. Solo se toca si la línea de comandos identifica nuestro
# watchdog; un PID reutilizado por otro pwsh queda intacto.
$watchdogTask = Get-ScheduledTask -TaskName 'task-app-permanente' -ErrorAction SilentlyContinue
if ($watchdogTask -and $watchdogTask.State -eq 'Running') {
    Stop-ScheduledTask -TaskName 'task-app-permanente' -ErrorAction SilentlyContinue
    Write-Output 'Watchdog: tarea programada detenida.'
}
$watchdogPidFile = Join-Path $runtime 'watchdog.pid'
if (Test-Path $watchdogPidFile) {
    $watchdogPid = [int](Get-Content $watchdogPidFile -ErrorAction SilentlyContinue)
    $watchdogProcess = if ($watchdogPid) { Get-CimInstance Win32_Process -Filter "ProcessId = $watchdogPid" -ErrorAction SilentlyContinue } else { $null }
    if ($watchdogProcess -and $watchdogProcess.Name -match '^(pwsh|powershell)(\.exe)?$' -and $watchdogProcess.CommandLine -like '*watchdog-permanente.ps1*') {
        Stop-Process -Id $watchdogPid -Force -ErrorAction SilentlyContinue
        Write-Output "Watchdog: PID $watchdogPid detenido."
    } elseif ($watchdogProcess) {
        Write-Output "Watchdog: PID $watchdogPid no coincide con nuestro script; no se toca."
    }
    Remove-Item $watchdogPidFile -Force -ErrorAction SilentlyContinue
}

Stop-Si-Nuestro (Join-Path $runtime 'backend.pid') 'glory-backend' 'Backend'
Stop-Si-Nuestro (Join-Path $runtime 'vite.pid') 'node' 'Vite'

Write-Output "Stack permanente detenido."

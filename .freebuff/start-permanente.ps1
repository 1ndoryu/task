# [07-09-2026] Arranque PERMANENTE local de task (backend + Vite) con
# anti-duplicado. Para usarse desde: (a) acceso directo del escritorio, (b)
# tarea programada al iniciar sesión de Windows. Es IDEMPOTENTE: si el puerto
# ya está en escucha por un proceso propio, no duplica; si no está, lo lanza.
#
# Stack permanente (ver .freebuff/run.md §"Página permanente local"):
#   - Backend Rust : http://127.0.0.1:4190  (binario .runtime/target/debug/glory-backend.exe)
#   - Frontend Vite: http://127.0.0.1:4191  (proxy /api -> 4190)
#   - BD local     : glory_backend_local (PostgreSQL 127.0.0.1:5432)
#   - Logs         : .runtime/backend.{out,err}.log y .runtime/vite.{out,err}.log
#   - PIDs         : .runtime/backend.pid y .runtime/vite.pid
#
# Parámetro -AbrirNavegador: tras verificar/arrancar el stack, abre la URL
# permanente (http://127.0.0.1:<VITE_PORT>) en el navegador por defecto.
# Lo usa el acceso directo del escritorio; la tarea programada al iniciar
# sesión NO lo pasa (no debe abrir una pestaña en cada login).
#
# Los puertos 4190/4191 se eligieron por ser improbables de usar por otros
# agentes (5173 WANDORIUS, 5174 Workspace Manager, 8760 glory-harness desktop,
# 3101 gloryapi local, 4100 ocupado). URL permanente: http://127.0.0.1:4191
param(
    [switch]$AbrirNavegador
)
$ErrorActionPreference = 'Stop'

# Requiere PowerShell 7+ (Start-Process -Environment). Si se invoca con
# Windows PowerShell 5.1 (powershell.exe), se relanza bajo pwsh y se sale.
if ($PSVersionTable.PSVersion.Major -lt 7) {
    $pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
    if (-not $pwsh) { throw "start-permanente.ps1 requiere PowerShell 7 (pwsh)." }
    $relanzar = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath)
    if ($AbrirNavegador) { $relanzar += '-AbrirNavegador' }
    & $pwsh @relanzar
    exit $LASTEXITCODE
}

$repo = Split-Path $PSScriptRoot -Parent          # ...\PROYECTO TASKS
$envFile = Join-Path $repo '.env'
$runtime = Join-Path $repo '.runtime'
$bin = Join-Path $runtime 'target\debug\glory-backend.exe'
if (-not (Test-Path $runtime)) { New-Item -ItemType Directory -Path $runtime | Out-Null }

# Los puertos del stack permanente se leen del .env (fuente única: "dónde
# corre" queda definido en el env, no hardcodeado aquí). PORT = backend,
# VITE_PORT = frontend; fallback 4190/4191 si el .env no los declara.
# Se cargan ANTES de sobrescribir el mapa para usarlos en CORS.
$envRaw = Get-Content $envFile
function Get-EnvVal([string]$clave, [string]$defecto) {
    foreach ($linea in $envRaw) {
        if ($linea -match "^\s*$([regex]::Escape($clave))=(.*)$" -and $linea -notmatch '^\s*#') {
            return $matches[1].Trim()
        }
    }
    return $defecto
}
$puertoBackend = [int](Get-EnvVal 'PORT' '4190')
$puertoVite    = [int](Get-EnvVal 'VITE_PORT' '4191')
$pidFileBackend = Join-Path $runtime 'backend.pid'
$pidFileVite    = Join-Path $runtime 'vite.pid'

if (-not (Test-Path $bin)) { throw "No existe el binario: $bin`nCompila primero: CARGO_TARGET_DIR=.runtime/target cargo build --bin glory-backend" }
if (-not (Test-Path $envFile)) { throw "No existe .env: $envFile" }

# --- Helpers ---------------------------------------------------------------
function Test-PuertoEscucha([int]$puerto) {
    return [bool](Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}
# Devuelve $true si el pid es un proceso vivo con ese nombre.
function Test-ProcesoVivo([int]$idProceso, [string]$nombre) {
    $p = Get-Process -Id $idProceso -ErrorAction SilentlyContinue
    return [bool]($p -and $p.ProcessName -like "*$nombre*")
}

# --- Cargar .env en mapa explícito (regex admite guiones: DEEPSEEK-API) ----
$envs = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z0-9_-]+)=(.*)$' -and $_ -notmatch '^\s*#') {
        $envs[$matches[1]] = $matches[2].Trim()
    }
}

# --- Overrides del stack permanente ----------------------------------------
$envs['HOST'] = '127.0.0.1'
$envs['PORT'] = "$puertoBackend"
$envs['CORS_ORIGINS'] = "http://127.0.0.1:$puertoVite,http://localhost:$puertoVite"
$envs['DATABASE_URL'] = 'postgres://postgres:root@127.0.0.1:5432/glory_backend_local'
$envs['AGENTE_MODO'] = 'local'
$envs['AGENTE_WORKSPACE_ROOT'] = $repo
# [14-09-2026] Kill-switch temporal del agente IA (harness en obras): sin
# scheduler ni rutas /api/agente (503). Reversible: comentar y relanzar.
$envs['AGENTE_DESACTIVADO'] = '1'

# --- BACKEND ---------------------------------------------------------------
$logB = Join-Path $runtime 'backend.out.log'
$errB = Join-Path $runtime 'backend.err.log'
if (Test-PuertoEscucha $puertoBackend) {
    # ¿Es nuestro proceso? (por pid lock vivo) -> ya corre, no duplicar.
    $locked = if (Test-Path $pidFileBackend) { [int](Get-Content $pidFileBackend -ErrorAction SilentlyContinue) } else { 0 }
    if ($locked -and (Test-ProcesoVivo $locked 'glory-backend')) {
        Write-Output "Backend YA corre en 127.0.0.1:$puertoBackend (PID $locked). Sin duplicado."
    } else {
        # Puerto ocupado por proceso ajeno: no tocar (evita matar a otro agente).
        $owner = (Get-NetTCPConnection -LocalPort $puertoBackend -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
        throw "Puerto $puertoBackend ocupado por proceso ajeno PID $owner. No se inicia el backend."
    }
} else {
    # Matar restos propios (pid lock muerto o stale) antes de relanzar.
    if (Test-Path $pidFileBackend) {
        $stale = [int](Get-Content $pidFileBackend -ErrorAction SilentlyContinue)
        if ($stale -and (Test-ProcesoVivo $stale 'glory-backend')) {
            Stop-Process -Id $stale -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
        }
    }
    $p = Start-Process -FilePath $bin -WorkingDirectory $repo -Environment $envs `
        -RedirectStandardOutput $logB -RedirectStandardError $errB -WindowStyle Hidden -PassThru
    Set-Content -Path $pidFileBackend -Value $p.Id
    Write-Output "Backend lanzado PID=$($p.Id) en http://127.0.0.1:$puertoBackend (logs .runtime/backend.*.log)"
}

# --- VITE ------------------------------------------------------------------
$logV = Join-Path $runtime 'vite.out.log'
$errV = Join-Path $runtime 'vite.err.log'
if (Test-PuertoEscucha $puertoVite) {
    $locked = if (Test-Path $pidFileVite) { [int](Get-Content $pidFileVite -ErrorAction SilentlyContinue) } else { 0 }
    if ($locked -and (Test-ProcesoVivo $locked 'node')) {
        Write-Output "Vite YA corre en http://127.0.0.1:$puertoVite (PID $locked). Sin duplicado."
    } else {
        $owner = (Get-NetTCPConnection -LocalPort $puertoVite -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
        throw "Puerto $puertoVite ocupado por proceso ajeno PID $owner. No se inicia Vite."
    }
} else {
    if (Test-Path $pidFileVite) {
        $stale = [int](Get-Content $pidFileVite -ErrorAction SilentlyContinue)
        if ($stale -and (Test-ProcesoVivo $stale 'node')) {
            Stop-Process -Id $stale -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
        }
    }
    # [17-09-2026] Auto-reparación: si una limpieza borró frontend/node_modules
    # (total o parcial), Vite arranca roto (HTTP 500 por chunks inexistentes).
    # Se detecta por el shim .bin/vite (un directorio a medias no basta) y se
    # reinstala antes de lanzar, para que el acceso abra siempre.
    $viteShim = Join-Path $repo 'frontend\node_modules\.bin\vite.cmd'
    if (-not (Test-Path -LiteralPath $viteShim -PathType Leaf)) {
        Write-Output 'frontend/node_modules ausente o incompleto: reinstalando dependencias (npm install)...'
        & npm.cmd install --no-audit --no-fund --prefix (Join-Path $repo 'frontend')
        if ($LASTEXITCODE -ne 0) { throw "npm install en frontend falló con código $LASTEXITCODE." }
        if (-not (Test-Path -LiteralPath $viteShim -PathType Leaf)) {
            throw 'npm install terminó pero sigue faltando el shim de vite; revisa el log de npm.'
        }
        Write-Output 'Dependencias del frontend restauradas.'
    }
    # npm run dev hereda vars del terminal: fijamos solo VITE_* (vite.config los lee).
    $env:VITE_PORT = "$puertoVite"
    $env:VITE_HOST = '127.0.0.1'
    $env:VITE_API_PROXY_TARGET = "http://127.0.0.1:$puertoBackend"
    $p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' `
        -WorkingDirectory (Join-Path $repo 'frontend') `
        -RedirectStandardOutput $logV -RedirectStandardError $errV -WindowStyle Hidden -PassThru
    # npm.cmd es un wrapper (cmd): el listener real del puerto es el node hijo.
    # Esperamos a que escuche y guardamos ESE pid (el que hay que matar/chequear).
    $listenerPid = $null
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        $conn = Get-NetTCPConnection -LocalPort $puertoVite -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) { $listenerPid = $conn.OwningProcess; break }
        if ($p.HasExited) { break }
    }
    if (-not $listenerPid) {
        Write-Output "ADVERTENCIA: Vite (PID $($p.Id)) no escuchó en :$puertoVite a tiempo. Revisa .runtime/vite.err.log"
    }
    Set-Content -Path $pidFileVite -Value $listenerPid
    Write-Output "Vite lanzado (wrapper PID $($p.Id), node PID $listenerPid) en http://127.0.0.1:$puertoVite (logs .runtime/vite.*.log)"
}

Write-Output "Página permanente: http://127.0.0.1:$puertoVite"

# --- Abrir navegador (solo si se pidió explícitamente) ---------------------
# Espera breve a que Vite realmente sirva antes de abrir la pestaña; así el
# acceso directo no aterriza en un "connection refused" justo tras arrancar.
if ($AbrirNavegador) {
    $url = "http://127.0.0.1:$puertoVite"
    $listo = $false
    for ($i = 0; $i -lt 20; $i++) {
        if (Test-PuertoEscucha $puertoVite) {
            try {
                $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
                if ($res.StatusCode -eq 200) { $listo = $true; break }
            } catch { /* aún no responde HTTP; reintentar */ }
        }
        Start-Sleep -Milliseconds 500
    }
    if ($listo) {
        Start-Process $url
        Write-Output "Abriendo en el navegador: $url"
    } else {
        Write-Output "Vite no responde aún; no se abrió el navegador. Revisa .runtime/vite.err.log"
    }
}

# [07-09-2026] Instala el arranque permanente local de task:
#   (1) Acceso directo en el escritorio -> start-permanente.ps1 (oculto, pwsh 7)
#       con -AbrirNavegador: arranca/verifica y abre la app en el navegador.
#   (2) Tarea programada "task-app-permanente" al INICIAR SESIÓN del usuario
#       -> watchdog-permanente.ps1: mantiene backend/Vite vivos, no duplica y
#       repara solo los procesos/puertos propios; SIN abrir navegador en login.
# El arranque NO interfiere con otros proyectos: puertos propios 4190/4191,
# binario propio .runtime/target (fuera de C:\tmp que se limpia solo), BD
# glory_backend_local y cookies aisladas en 127.0.0.1.
# Para desinstalar: usar el parámetro -Quitar (borra acceso directo y tarea).
# Uso: pwsh -NoProfile -ExecutionPolicy Bypass -File instalar-permanente.ps1
param(
    [switch]$Quitar
)
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "Ejecuta con PowerShell 7 (pwsh)."
}

$repo      = Split-Path $PSScriptRoot -Parent
$start     = Join-Path $PSScriptRoot 'start-permanente.ps1'
$watchdog  = Join-Path $PSScriptRoot 'watchdog-permanente.ps1'
$pwsh      = (Get-Command pwsh).Source
$escritorio = [Environment]::GetFolderPath('Desktop')
$lnk       = Join-Path $escritorio 'Task (local).lnk'
$nombreTarea = 'task-app-permanente'

if (-not (Test-Path $start)) { throw "No existe el script de arranque: $start" }
if (-not (Test-Path $watchdog)) { throw "No existe el watchdog: $watchdog" }

# --- Acceso directo ---------------------------------------------------------
$shell = New-Object -ComObject WScript.Shell
if ($Quitar) {
    if (Test-Path $lnk) { Remove-Item $lnk -Force; Write-Output "Acceso directo eliminado: $lnk" }
    else { Write-Output "No había acceso directo en el escritorio." }
} else {
    $acceso = $shell.CreateShortcut($lnk)
    # pwsh con -WindowStyle Hidden: arranca en background sin ventana. El flag
    # -AbrirNavegador hace que además de arrancar/verificar abra la página en
    # el navegador por defecto (uso manual; la tarea de login NO lo pasa).
    $acceso.TargetPath = $pwsh
    $acceso.Arguments  = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$start`" -AbrirNavegador"
    $acceso.WorkingDirectory = $repo
    $acceso.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"  # icono engranaje
    $acceso.Description = 'Arranca la página permanente local de task y la abre en el navegador (http://127.0.0.1:4191)'
    $acceso.Save()
    Write-Output "Acceso directo creado: $lnk"
}

# --- Tarea programada al iniciar sesión -------------------------------------
# El watchdog es el único proceso persistente. Su configuración IgnoreNew
# evita que una doble ejecución de la tarea cree otro vigilante.
$accion = New-ScheduledTaskAction -Execute $pwsh `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`"" `
    -WorkingDirectory $repo
$disparador = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 0) `
    -MultipleInstances IgnoreNew  # sin límite; una sola instancia del watchdog
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

# Una actualización no debe registrarse sobre una ejecución anterior: con
# IgnoreNew eso puede dejar la tarea marcada como Running sin proceso hijo.
$existente = Get-ScheduledTask -TaskName $nombreTarea -ErrorAction SilentlyContinue
if ($existente -and $existente.State -eq 'Running') {
    Stop-ScheduledTask -TaskName $nombreTarea -ErrorAction SilentlyContinue
    Write-Output "Tarea programada '$nombreTarea' detenida antes de actualizarla."
}

if ($Quitar) {
    Unregister-ScheduledTask -TaskName $nombreTarea -Confirm:$false -ErrorAction SilentlyContinue
    Write-Output "Tarea programada '$nombreTarea' desregistrada (si existía)."
} else {
    Register-ScheduledTask -TaskName $nombreTarea -Action $accion -Trigger $disparador `
        -Settings $ajustes -Principal $principal -Description 'Arranca la página permanente local de task (http://127.0.0.1:4191) al iniciar sesión. Idempotente: no duplica procesos.' -Force | Out-Null
    Write-Output "Tarea programada '$nombreTarea' registrada (disparo: al iniciar sesión de $env:USERNAME)."
}

Write-Output ""
Write-Output "Página permanente local: http://127.0.0.1:4191"
Write-Output "Acceso directo del escritorio 'Task (local)': arranca/verifica y abre el navegador."
Write-Output "Para detener el stack:     .freebuff\stop-permanente.ps1"
Write-Output "Para desinstalar:          pwsh -File instalar-permanente.ps1 -Quitar"

# Reinicia el backend de PROYECTO TASKS (puerto 3001) con el entorno LLM
# CORRECTO: carga el .env del proyecto (las envs LLM de task) y fija
# AGENTE_MODO=local + AGENTE_WORKSPACE_ROOT para que la IA del panel pueda
# usar file_write/file_patch. No hereda variables viejas del terminal.
# [01-09-2026] Diagnóstico: el backend anterior (PID 11208) heredó una
# DEEPSEEK_API_KEY vieja de otro entorno (key '****shlo', no está en .env de
# task); dotenvy NO sobreescribe vars ya presentes -> glory/commandcode daban
# 401 aunque gloryapi local está sano (200 con la key del .env). Sesiones en BD
# (auth_sessions) -> reiniciar no invalida la sesión del usuario.
$ErrorActionPreference = 'Stop'

$dir = 'C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS'
$envFile = Join-Path $dir '.env'
$exe = 'C:\tmp\glory-target\glory_backend_main\debug\glory-backend.exe'
$log = Join-Path $dir '.freebuff\backend.out.log'
$err = Join-Path $dir '.freebuff\backend.err.log'

if (-not (Test-Path $exe)) { throw "No existe el binario: $exe" }
if (-not (Test-Path $envFile)) { throw "No existe .env: $envFile" }

# Leer .env en un Hashtable (evita que dotenvy herede nada; nosotros pasamos el mapa)
$envs = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z0-9_]+)=(.*)$' -and $_ -notmatch '^\s*#') {
        $envs[$matches[1]] = $matches[2].Trim()
    }
}

# Overrides del stack aislado (task): puerto 3001, CORS para 5175, BD local
$envs['PORT'] = '3001'
$envs['HOST'] = '127.0.0.1'
$envs['CORS_ORIGINS'] = 'http://127.0.0.1:5175,http://localhost:5175'
$envs['DATABASE_URL'] = 'postgres://postgres:root@127.0.0.1:5432/glory_backend_local'
# Modo local + workspace para tools de archivo de la IA
$envs['AGENTE_MODO'] = 'local'
$envs['AGENTE_WORKSPACE_ROOT'] = $dir

# Asegurar que el mapa tenga las keys LLM del .env (no dependen de heredar)
if (-not $envs.ContainsKey('GLORY_API_KEY')) { $envs['GLORY_API_KEY'] = '' }
if (-not $envs.ContainsKey('COMMAND_CODE_API_KEY')) { $envs['COMMAND_CODE_API_KEY'] = '' }

# Detener el backend actual (si existe) en el puerto 3001
$listener = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $oldPid = $listener.OwningProcess
    Write-Output "Deteniendo backend anterior PID=$oldPid ..."
    Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
}

# Lanzar con el mapa de entorno EXPLICITO (sin heredar nada del terminal)
$p = Start-Process -FilePath $exe `
    -WorkingDirectory $dir `
    -Environment $envs `
    -RedirectStandardOutput $log -RedirectStandardError $err `
    -WindowStyle Hidden -PassThru

Write-Output "Nuevo backend PID=$($p.Id) en 127.0.0.1:3001 (AGENTE_MODO=local)"

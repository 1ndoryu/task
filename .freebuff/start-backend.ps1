# Arranca el backend Rust (build ya hecho) en background y devuelve el PID.
# [18-08-2026] Stack AISLADO: la maquina comparte C:/tmp/glory-target y los
# puertos :3000/:5173 con otros proyectos (WANDORIUS). Este script usa target
# privado (glory-target-task) y puerto propio (3001) para no pisar a nadie.
$ErrorActionPreference = 'Stop'
$env:GLORY_DEV_DATABASE_URL_TEMPLATE = 'postgres://postgres:root@127.0.0.1:5432/{db}'
$env:GLORY_DEV_DB_NAME = 'glory_backend_local'
$env:DATABASE_URL = 'postgres://postgres:root@127.0.0.1:5432/glory_backend_local'
$env:PORT = '3001'
$env:CORS_ORIGINS = 'http://localhost:5174,http://127.0.0.1:5174'
$dir = 'C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS\.freebuff'
$log = Join-Path $dir 'backend.out.log'
$err = Join-Path $dir 'backend.err.log'
$exe = 'C:\tmp\glory-target-task\debug\glory-backend.exe'
if (-not (Test-Path $exe)) {
    throw "No existe el binario. Compila primero con: CARGO_TARGET_DIR=C:/tmp/glory-target-task cargo build --bin glory-backend"
}
$p = Start-Process -FilePath $exe -WorkingDirectory 'C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS' -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden -PassThru
Write-Output "PID=$($p.Id)"

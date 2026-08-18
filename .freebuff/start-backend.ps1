# Arranca el backend Rust (build ya hecho) en background y devuelve el PID.
$ErrorActionPreference = 'Stop'
$env:GLORY_DEV_DATABASE_URL_TEMPLATE = 'postgres://postgres:root@127.0.0.1:5432/{db}'
$env:GLORY_DEV_DB_NAME = 'glory_backend_local'
$env:DATABASE_URL = 'postgres://postgres:root@127.0.0.1:5432/glory_backend_local'
$env:PORT = '3000'
$env:CORS_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173'
$log = 'C:/Users/Owner/OneDrive/Documentos/area-trabajo/.freebuff/preview-eed1f4ab-5590-41f5-83ce-f00baf4e9110.log'
$err = "$log.err"
# El crate vive en la raiz del repo; el binario queda en <target>/debug (no en <target>/<crate>/debug).
$exe = 'C:\tmp\glory-target\debug\glory-backend.exe'
$p = Start-Process -FilePath $exe -WorkingDirectory 'C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS' -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden -PassThru
Write-Output "PID=$($p.Id)"

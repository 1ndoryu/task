# Arranca Vite (frontend) en 5175 en background y devuelve el PID.
$ErrorActionPreference = 'Stop'
$env:VITE_PORT = '5175'
$env:VITE_HOST = '127.0.0.1'
$env:VITE_API_PROXY_TARGET = 'http://127.0.0.1:3001'
$dir = 'C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS\.freebuff'
$log = Join-Path $dir 'vite-5175.log'
$err = Join-Path $dir 'vite-5175.err.log'
$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS\frontend' -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden -PassThru
Write-Output "PID=$($p.Id)"

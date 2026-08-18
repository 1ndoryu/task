# Arranca SOLO Vite (frontend) en background y devuelve el PID.
# [18-08-2026] Stack AISLADO: puerto 5174 (5173 lo usa WANDORIUS) y proxy al
# backend propio (3001) via VITE_API_PROXY_TARGET. Logs dedicados.
$ErrorActionPreference = 'Stop'
$env:VITE_PORT = '5174'
$env:VITE_API_PROXY_TARGET = 'http://127.0.0.1:3001'
$dir = 'C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS\.freebuff'
$log = Join-Path $dir 'vite.out.log'
$err = Join-Path $dir 'vite.err.log'
$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS\frontend' -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden -PassThru
Write-Output "PID=$($p.Id)"

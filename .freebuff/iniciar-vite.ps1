$env:VITE_PORT = '5174'
$env:VITE_API_PROXY_TARGET = 'http://127.0.0.1:3001'
$log = 'C:/Users/Owner/OneDrive/Documentos/area-trabajo/.freebuff/preview-eed1f4ab-5590-41f5-83ce-f00baf4e9110.log'
$err = 'C:/Users/Owner/OneDrive/Documentos/area-trabajo/.freebuff/preview-eed1f4ab-5590-41f5-83ce-f00baf4e9110.log.err'
$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:/Users/Owner/OneDrive/Documentos/area-trabajo/PROYECTO TASKS/frontend' -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden -PassThru
Write-Output $p.Id

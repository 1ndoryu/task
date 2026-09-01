# Prevención: envs heredadas del proceso padre vencen al `.env` (dotenvy)

**Fecha:** 2026-09-01
**Caso:** el panel IA del proyecto task respondía "Error del proveedor externo" en TODOS los
proveedores aunque el `.env` del proyecto tenía keys válidas (`GLORY_API_KEY`, `COMMAND_CODE_API_KEY`).

**Causa raíz:** el backend en ejecución se lanzó desde un terminal cuyo entorno contenía una
`DEEPSEEK_API_KEY` vieja (terminada en `shlo`, de un proyecto anterior). `dotenvy::dotenv()`
(NO sobreescribe variables ya presentes en el entorno del proceso), así que el backend usó las
keys obsoletas y nunca vio las del `.env` del proyecto. Además faltaba `AGENTE_MODO=local`, por lo
que las tools de archivo del agente ni siquiera se registraban.

**Capa responsable:** arranque del backend en local (scripts `.freebuff/*.ps1` / terminal).

**Detección esperada:** si el panel IA falla en todos los proveedores con mensajes de
autenticación (401/403) pero el `.env` parece correcto, sospechar envs heredadas. Verificación:
comparar las keys efectivas del proceso (log con `proveedor=... modelo=...`) contra el `.env`.

**Mitigación aplicada:** nuevo script `.freebuff/restart-backend-local.ps1` que lanza el backend
con un mapa de entorno EXPLÍCITO (lee el `.env`, fuerza PORT/HOST/CORS/DATABASE_URL locales y
define `AGENTE_MODO=local` + `AGENTE_WORKSPACE_ROOT`), sin heredar las envs del shell.

**Reglas para el futuro:**
1. Lanzar el backend local SIEMPRE con el script de entorno limpio (o limpiar las envs del shell
   antes de arrancar: `Remove-Item Env:DEEPSEEK_API*`, etc.).
2. `Start-Process -Environment` requiere PowerShell 7+ (pwsh); en Windows PowerShell 5.1 no existe.
3. Si se cambia un `.env`, reiniciar el proceso — no basta con recargar.
4. Las tools de archivo del agente (file_read/file_write/file_patch/file_search) requieren
   `AGENTE_MODO=local`; sin esa env el panel no las ofrece (fail-closed).

**Estado:** mitigado (script creado y verificado el 2026-09-01). No automatizado aún — se puede
considerar un wrapper único de arranque (`npm run dev` / `.freebuff/start-dev.ps1`) que aplique
siempre el entorno limpio.

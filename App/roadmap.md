# GloryTemplate Roadmap

> **Descripcion:** Dashboard personal con tareas, habitos, proyectos, notas, actividad y mas. Tema WordPress con React islands.
> **Stack:** WordPress + PHP (backend REST), React + TypeScript (frontend islands), Zustand (estado), CSS modular
> **URL produccion:** https://task.nakomi.studio
> **Servidor:** nakomi (Coolify) stack UUID: u00gc8ss4csc4cckkg4g00ks
> **Deploy:** Coolify (.agent/coolify-manager-rs) sitio: nakomi
> **Repositorio:** glorytemplate: rama glory-react-logic

## Herramientas del agente

- Code Sentinel: `.agent/code-sentinel`
- VarSense: `.agent/varsense`
- Coolify Manager: `.agent/coolify-manager-rs`

## Tareas pendientes

- Ejecutar `coolify-manager auth-drive` manualmente para autorizar Google Drive y que los backups suban al remoto en vez de quedarse locales (requiere abrir URL en navegador y autorizar con cuenta Google). (Dejame el comando exacto que es no funciona para yo ejecutarlo)

- Resolver todos los problemas de `.sentinel-report.md` y `.varsense-report.md` hasta que queden vacíos: falsos positivos se corrigen en la extensión, problemas reales se resuelven en el código.
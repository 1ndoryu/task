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

5. Coolify deploy kamples fallando silenciosamente sin actualizar el servidor.

20. Hay problema con .agent\coolify-manager-rs, esta guardando copias locales automaticamente no se porque o como en .agent\coolify-manager-rs\config\backups, cuando realidad había pedido que las copias se guardaran en google drive, veo archivos ocmo 20260320_031505.tar.gz pero claramente eso fue hace 10 dias, o sea no esta haciendo copias de seguridad diaria (maximo 2 copias diarias) y una 1 semanal en google drive, de todos los sitios de forma ordenada. Tiene que ser automatico, y no me refiero a que sea local. 
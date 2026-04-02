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

3. 024A-32: Despues de tus cambios anteriores, el panel de notas no tiene borde ni el panel de actividad.

4. 024A-33: Hay un bug, hay un habito que marco y nunca desaparece del panel de actividad no pasa con todos los habitos, tampoco si marco directamente en el panel de habitos, nunca se marca como completo a pesar que en el panel de actividad si se marca. 

4.1 024A-34: esto hizo la actividad se marcara varias veces a pesar de nunca se como completado

Hábito "Samplear"
17:29
Hábito "Samplear"
17:28

necesita una forma de borrar actividades, agrega una x al lado de tiempo para eliminar una actividad panelActividadDetalleItemUnificado
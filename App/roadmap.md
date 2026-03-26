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

1. El panel grupos no parece ser un plugin, no lo es, le falta modal de configuracion como los otros plugin, no veo donde se genera un token!! Quita lo de seccionSubtitulo

2. ~~(263A-1 COMPLETADA) EN panelActividadMapa LOS CUADROS SIGUIEN SALIENDOSESE~~

3. avatarPreview sigue siendo estirado en vez de ser un circulo 1:1!

4. el diseño de panelGruposFb se ve fatal, no sigue el estilo de los demas panales, los select no deben ser select normales sino que abran menu contextuales, tampoco deben estar dentro del panel sino en seccionAcciones como los filtros de los demás paneles, y la busqueda similar a como modalNotasBusqueda modalNotasBusqueda--headerCentrado.

5. ~~(263A-3 COMPLETADA) No crear notas en una nueva ventana — duplicar panel notas~~

6. lo de abrir notas en el telefono funciona falta, al dar click a una nota en vistaNotasListaContenido debería cerrar el modal y abrir esa nota cuando se esta en movil.

7. Mejor quita lo de posponer mañana y remplazalo por 1 día, no se entiende lo de "mañana" (234A-7)

8. ~~(263A-2 COMPLETADA) Fix subhábitos fantasma~~

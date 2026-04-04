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

- boton boton--badge boton--mediano se esta usando en el boton de cambiar el entorno en el panel de grupos!! boton--badge NO SE USA PARA BOTONES QUE TIENEN TEXTOS!! ese boton tiene que ser boton boton--ghost boton--mediano

- panelGruposFb__columnasContenedor se ve el boton diferente, no se ve centrado, tampoco selector-badge-contenedor, porque son botones dentro de un div??? hace que se vean mal! 

- En Gestionar categorías se siguen usando emojis en vez de svg

- Las configuraciones muestaran configuraciones de plugin que estan desactivados, no deberían.

- Este repositorio duplicarlo en https://github.com/1ndoryu/task, es un espejo, seguiremos usando glorytemplate en esta rama, por favor ten cuidado de cualquier perdida de datos, tiene que duplicarse con cada commit y cada cosa.

-   {/* sentinel-disable-next-line emoji-en-codigo — icono de advertencia en mensaje de error */}
    <span className="loginError__icono">⚠️</span> veo que hiciste cosas asi cuando claramente no es un falso positivo, realmente necesita un icono de bilioteca, no un emojoi!! Vais a tener que corregir todos los sentinel-disable-next-line emoji-en-codigo !!

- Me parece que el enfoque que tomaste con algunos sentinel-disable-next esta mal, en vez de solucionar el problema de raiz, colocaste sentinel-disable-next en muchos lugares en vez de mejorar la precisión de la extensión, se requiere una auditoría de todos los sentinel-disable-next para mejorar la precisión de la extensión. 

- Agregar una regla nueva en glory sentinel para detectar todos los to-do o cosas pendientes en el codigo. 

- Agrega una nueva prioridad "Muy baja" asegurate de que funcione en todos los contextos.
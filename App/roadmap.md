# GloryTemplate — Roadmap

> **Descripcion:** Dashboard personal con tareas, hábitos, proyectos, notas, actividad y más. Tema WordPress con React islands.
> **Stack:** WordPress + PHP (backend REST), React + TypeScript (frontend islands), Zustand (estado), CSS modular
> **URL produccion:** pendiente de configurar
> **Servidor:** pendiente de configurar
> **Deploy:** Coolify (.agent/coolify-manager-rs)
> **Coolify IDs:** pendiente
> **Repositorio:** rama principal, convenciones v4.0

## Herramientas del agente
- Code Sentinel: `.agent/code-sentinel`
- VarSense: `.agent/varsense`
- Coolify Manager: `.agent/coolify-manager-rs`

## Tareas pendientes

- 233A-7: Estado por defecto al registrarse = 1 columna
- 233A-8: Agregar modo sidebar activable en configuración de layout
- 233A-10: Bug tracking: no se detiene al completar tarea + alerta toast al cambiar tracking activo
- 233A-12: panelActividadMapa — cuadritos desaparecen y espacio vacío en pantalla ancha
- 233A-23: Fix submenú ordenamiento/filtrado — se vuelve transparente y va al fondo
- 233A-26: resizeHandleColumna — tooltip muy arriba + ancho mínimo adaptable a 1 columna
- 233A-27: Centralizar todas las configuraciones en un modal grande con sidebar
- 233A-30: Corregir todas las violaciones del sentinel report
- 233A-31: Los botones de eliminar en las tareas no deben tener color de background al hacer hover
- 233A-32: El modal de inicio de sesión sin fuentes + botones principales blancos con texto negro
- 233A-33: Botones como Minimizar panel sin hover background
- 233A-34: El input de inputWrapper doble padding — quitar padding del input
- 233A-35: textareaContenedor no toma altura completa + borde azul al cursor

## Ultima tarea: 

Comentarios exactos de las tareas de 1 a 30 (Rehanalizar si todo se cumplio como se dijo o se intento decir)

este proyecto no tiene roadmap, si tiene para desplegar en coolify manager-rs pero no se ha probado, tienes que hacer el roadmap las primeras tareas son estas, anota estas tareas primero, hazlas todas, sigue el ciclo, es importante anotarlas primero, despues te encargas de planificar mejor, y luego hacerlas

Tareas planificar

tareaColapsadorContador aparece una flecha que no debería

al activar y escribir en el input de una tarea, se marca un borde azul que parece ser algo por defecto del navegador, que no aparezca eso.

scratchpadResaltado vs textarea scratchpadTextarea falla el editor con los resltados, tiene un bug pero no lo quiero resolver, simplemente dejar que los textos se escriban normal sin resaltados. 

Quitar todos los box-shadow que existan en el proyecto, o centralizarlos en una variable que los quite temporalmente

A los botones medianos agregales 30 de altura height a .boton--mediano, esto genera un inconveniente con configLayoutColumnasOpciones al probar los 30px vi que fallaban visualmente: configLayoutColumnasOpciones, estos botoenes no deben tener altura fija pero deben ser del mismo tamaño

Los botones de navegacionInferiorBarra por alguna razón no se ven en movil, los iconos no se ven

El estado por defecto inicial al registrarse, debe ser de una columna. 

Agregar un modo sidebar, esto se debera activar en configuracion de layout, 

Eliminar el boton de prueba en el admin

Hay un bug por ejemplo si empiezo una tarea con el tracking y la marco como completada en el panel de tareas, pues el tracking sigue sin detenerse, debería, tambien si empiezo otro traking el otro se borra completamnte, debería aparecer una alarta en forma del toads para confirmar o rechazar cancerlar el anterior traking

Los botones de modalAccionesEncabezado hazlo sin padding ni background al hover, que es un estilo de boton

panelActividadMapa cuando el ancho de la pantalla aumenta, dejan de salir cuadritos y deja un espacio vacío muy grande, esta mal

Elimina color: var(--dashboard-textoActivo); de .botonTexto

quita los seccionSubtitulo de todos los panles que los tengan

panelActividadStats no sirve, quitalo

de configLayoutAcciones quita el borde top y que el boton este 100% estirado de ancho

cuando el nombre de los valores en creacionRapidaOpciones se vuelve largo, las opciones salen de la pantalla, creo que lo mejor es quitar el nombre y la informacion de esos botones, tambien deja sin borde esos botones, pero sigan funcionando igual, simplemente cuando tengan un valor activo, al dar click se vera y tendran color verde para representar que estan activos

quita los border-left-color en donde sean que existan. 

Haz que este sea el color de --dashboard-acento: #4a665b;

quita el fondo del boton de publicar creacionRapidaBotonEnviar

el boton de listaTareasHabito listaTareasHabito--compacto no se porque tiene fondo negro, que no tenga ningun fondo ni borde y que este centrado.

elimina estos estos estilos sin borrar la clase

.panelAdministracion {
    /* display: flex; */
    /* flex-direction: column; */
    /* gap: var(--dashboard-espacioMd); */
    /* overflow-y: auto; */
    /* max-height: calc(90vh - 60px); */
    /* padding-right: var(--dashboard-espacioXs); */
}

los submenu de ordenamiento y filtrado fallan, se vuelven trasparente y se van al fondo si saco el cursor de un panel

el boton de 3 puntos de los listaNotasItem sin bordes ni padding

en modalNotasBusqueda modalNotasBusqueda--headerCentrado hay doble input, input tiene un padding, y afuera tambien hay otro, arregla y quita el padding del input

lo de resizeHandleColumna resizeHandleColumnaExterno, el tooltip aparece muy arrriba, y el ancho minimo se ve que esta ajustado para 2 columnas pero para 1 no, o sea, tiene que adaptarse, 1 columna queda muy ancha por el ancho minimo, deberia permitir reducir mas el ancho

no se si ya lo dije antes, borra panelActividadStats, 

centralizar todas las configuraciones de todos los paneles en uno modal grade que tenga un sidebar con cada configuracion, seria configuracion para cada cosa, tarea, proyectos, habitos, notas, actividad, incluye tambien la configuracion suelta de seguridad, copias de seguridad, perfil, conectar ia, etc, esas configuraciones ya no estaran sueltas en el menu contextual sino agrupadas y se preservar el acceso directo a las configuraciones en cada panel

en drawerMovilPanel drawerMovilPanel--visible todos los botones estan centrados, no deberian, 

igual cuando abro bottomSheetPanel bottomSheetPanel--visible, no debería estar los botones centrado

por ultimo hay un sentinel report. hay que arreglar todo lo que indica 

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

- 233A-8: Agregar modo sidebar activable en configuración de layout
- 233A-27: Centralizar todas las configuraciones en un modal grande con sidebar
- 233A-30: Corregir todas las violaciones del sentinel report
- 233A-33: prueba actualizar el proyecto task (ya esta desplegado), sube los cambios con coolify manager-rs y arregla cualquier issue que surja.


## 233A-40 

hay algo que no esta centralizado, los valores de alta, media, baja, etc sus iconos son diferentes en varios contextos, tienen diferentes colores, en algunos lugares tienen bordes y en otros no

me refiero al abrir 

<button type="button" class="boton boton--ghost boton--mediano pillOpcion  " style="color: var(--dashboard-estadoAlta);" data-tooltip-content="Importancia"><span class="botonTexto"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="var(--dashboard-estadoAlta)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg><span>Alta</span></span></button> y en su estado tambien

tambie al abrir 

<button type="button" class="boton boton--opcion boton--mediano boton--soloIcono" data-tooltip-content="Prioridad"><span class="botonIcono"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag" aria-hidden="true"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"></path></svg></span></button>,  

y probablemente en otros lugares que no identifico aún o con otros valores, centralizar 

## 2303A-41

Agrega un boton de accion para posponer una tarea o habito en el panel de ejecucion, lo que haria esto es que oculta la tarea por 24 horas, o el tiempo que se eliga en el menu contextual que abre, veo que ya hay esa opcion pero falta revisar que funcione bien y el otro submenu para elegir el tiempo

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

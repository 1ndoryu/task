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

## 233A-42

.boton--primario usa de color de fondo el acento primario, el color de fondo del los botnes primaro debe ser blanco

## 233A-43

configGlobalSidebar los botones estan centrados en vez de estar a la derecha, falta quitar del menu contextual de usuario todo lo que ya esta en el modal de configuracion
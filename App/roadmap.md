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


## 2303A-41

Agrega un boton de accion para posponer una tarea o habito en el panel de ejecucion, lo que haria esto es que oculta la tarea por 24 horas, o el tiempo que se eliga en el menu contextual que abre, veo que ya hay esa opcion pero falta revisar que funcione bien y el otro submenu para elegir el tiempo

## 233A-42

.boton--primario usa de color de fondo el acento primario, el color de fondo del los botnes primaro debe ser blanco

## 233A-43

configGlobalSidebar los botones estan centrados en vez de estar a la derecha, falta quitar del menu contextual de usuario todo lo que ya esta en el modal de configuracion

## 233A-44

en panelActividadMapa sigue debordandose los cuadros de dias. 
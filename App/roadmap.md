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


## 233A-42

.boton--primario usa de color de fondo el acento primario, el color de fondo del los botnes primaro debe ser blanco

## 233A-43

configGlobalSidebar los botones estan centrados en vez de estar a la derecha, falta quitar del menu contextual de usuario todo lo que ya esta en el modal de configuracion

## 233A-44

en panelActividadMapa sigue debordandose los cuadros de dias. 

## 233A-46

<span class="badgeInfo badgeInfo--prioridadMedia"><span class="badgeInfoTexto">MEDIA</span></span> vs <span class="badgeInfo badgeInfo--destacado"><span class="badgeInfoTexto">Hoy</span></span> son diferentes cuando deberían de ser iguales

## 233A-47

Por defecto el chat en los modales debe estar cerrado. 

# 233A-48

En bottomSheetContenido - menuOpcionesPanelContenido LOS BOTONES SE VOLVIERON A PONER CENTRADOS!! EL TEXTO debe estar a la ziquierda y el boton a la derecha

## 233A-49

En badgeGroup todo debe tener la misma altura y algunos botoenes no tiene la misma altura, algunos no tienen background y otros tienen background gris, haz que los que son gris no tengan background y el mismo color de borde del badge que esta sin fondo. 

## 233A-50

.boton--secundario no debe tener background, pero si debe tener borde. 
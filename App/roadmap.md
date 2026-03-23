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


## 233A-50

de .configGlobalContenido quita, es innecesario
    /* overflow-y: auto; */
    /* padding: var(--dashboard-espacioMd); */
    /* min-width: 0; */

## 233A-51 (en planificacion)

Los botones en bottomSheetPanel bottomSheetPanel--visible, fatal esto! Te voy a psar el html completo para que entiendas

primero en los botones el texto esta a la derecha!!! cosa que esta 

<div class="bottomSheetContenido"><div><button type="button" class="boton boton--primario boton--mediano bottomSheetItem "><span class="botonTexto"><span class="bottomSheetItem__icono"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg></span><span class="bottomSheetItem__texto">Configurar tarea</span></span></button></div><div><button type="button" class="boton boton--primario boton--mediano bottomSheetItem "><span class="botonTexto"><span class="bottomSheetItem__icono"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg></span><span class="bottomSheetItem__texto">Agregar subtarea</span></span></button></div><div><button type="button" class="boton boton--primario boton--mediano bottomSheetItem "><span class="botonTexto"><span class="bottomSheetItem__icono"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg></span><span class="bottomSheetItem__texto">Iniciar tracking</span></span></button><div class="bottomSheetSeparador"></div></div><div><button type="button" class="boton boton--primario boton--mediano bottomSheetItem "><span class="botonTexto"><span class="bottomSheetItem__icono"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></svg></span><span class="bottomSheetItem__texto">Mover a proyecto</span></span></button><div class="bottomSheetSeparador"></div></div><div><button type="button" class="boton boton--primario boton--mediano bottomSheetItem "><span class="botonTexto"><span class="bottomSheetItem__icono"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag" aria-hidden="true"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"></path></svg></span><span class="bottomSheetItem__texto">Prioridad</span></span></button></div><div><button type="button" class="boton boton--primario boton--mediano bottomSheetItem "><span class="botonTexto"><span class="bottomSheetItem__icono"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg></span><span class="bottomSheetItem__texto">Urgencia</span></span></button><div class="bottomSheetSeparador"></div></div><div><button type="button" class="boton boton--primario boton--mediano bottomSheetItem "><span class="botonTexto"><span class="bottomSheetItem__icono"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock" aria-hidden="true"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg></span><span class="bottomSheetItem__texto">Posponer</span></span></button><div class="bottomSheetSeparador"></div></div><div><button type="button" class="boton boton--primario boton--mediano bottomSheetItem bottomSheetItem--peligro"><span class="botonTexto"><span class="bottomSheetItem__icono"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2 lucide-trash-2" aria-hidden="true"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></span><span class="bottomSheetItem__texto">Eliminar tarea</span></span></button></div></div>

y en 
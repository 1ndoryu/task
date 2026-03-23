# GloryTemplate  Roadmap

> **Descripcion:** Dashboard personal con tareas, habitos, proyectos, notas, actividad y mas. Tema WordPress con React islands.
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

- 233A-33: prueba actualizar el proyecto task (ya esta desplegado), sube los cambios con coolify manager-rs y arregla cualquier issue que surja.
- 233A-58: En modalContenedor modalConfigGlobal deja una altura maxima y minima de 750px, o sea una altura fija nada mas en ese modal
- 233A-59: Los botones en los bottomsheet el icono no se pone a la derecha completamente porque botonTexto necesita width: 100%%; pero si agrega globalmente 100%% dana muchas cosas, agregalo especificamente a los botones dentro del bottomsheet, no a todos los botones.
- 233A-56: Quita el boton de buscar en movil, dejalo dentro del menucontextual nada mas
- 233A-57: La fuente no carga en bottomSheetTarea (input y opciones), en modalSeleccionPropiedad, ni en configMovilContenedor. Los botones en esas areas no necesitan padding.
- 233A-60: Corregir 393 errores TS pre-existentes (implicit any types en 44 archivos  stores, hooks, components)

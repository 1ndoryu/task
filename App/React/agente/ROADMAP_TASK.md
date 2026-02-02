# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## PROTOCOLO DE TRABAJO

**IMPORTANTE - LEER PRIMERO:**

1. **Ejecución secuencial:** Trabajaré tarea por tarea en el orden establecido.
2. **Actualización inmediata:** Al completar cada tarea, actualizo este roadmap de inmediato.
3. **Revisión constante:** Reviso este archivo frecuentemente para ver si hay nuevos comentarios o instrucciones.
4. **Dudas:** Las dudas se escriben aquí y se deja espacio para respuesta del usuario.
5. **Commit automático:** Al finalizar cada tarea significativa, hago commit.

---

## Estado Actual
**Versión:** v1.0.21-beta (2026-02-03)
**Foco:** Sprint Actual Completado - Mejoras UI/UX Pre-Lanzamiento

---

# Revisiones (0.3)

1. Los gestos tambien deberían funcionar con los habitos pero en vez de eliminar debería ser posponer.


# Nueva revision de la anterior revision (0.2)

1. ✅ El css de los gestos, se mal intrepeto, imagina que la tarea tiene un ancho pero su nombre es corto, o sea, no cubre el 100% del ancho sino 40%, cuando se desliza para la accion en el fondo eliminar se ve hasta el final de la tarea al (40%) en vez del final al (100%), y no todavía no hay difuniado, el color debe empezar y e ir desvaneciendose y no hay color rojo parece. **CORREGIDO: swipeableItem.css ahora usa position absolute con inset:0 para que el fondo cubra 100% del ancho independientemente del contenido**

2. ✅ Sobre 3. El css de los subhabitos en el panel de configuracion de los habitos debe ser igual. Siguen habiendo muchas diferencias, prefiero que sea igual en todo a como son las subtareas en las configuraciones, las subtareas no tiene para colapsar, las letras son diferentes, y el contador esta hacia un lado tirado al final, no tienen espaciado y es compacto, cuando se añade una subtarea no tiene para elegir las opciones, las hereda, solo sale el input de texto y enter para guardar, los botones de guardar o añadir son necesarios, el input no tiene efectos de hover o activo, asi son las subtareas, y asi deben ser los subhabitos, creo que en vez de intentar emular o parecerse porque no son el mismo componente? (Sin afectar el diseño de las subtareas en los paneles de configuracion) **CORREGIDO: ListaSubHabitos.tsx completamente reescrito para usar las mismas clases CSS listaTareasHabito__* que ListaSubtareas, sin collapse, input simple con Enter para guardar**

3. ✅ Sobre 5. Sobre "TAREA 0.5: BottomSheet para Hábitos en Móvil", creo que no se entiendo, cuando se da un toque tiene que abrir lo que se abre cuando se da un toque a las tareas, especifico, cuando se da un toque a las tareas se abre esto para modificar una tarea, tambien se abre cuando se intenta crear un habito en el movil o sea, lo mismo con lo que se crean habitos en el movil debería funcionar para editar habitos, y cuando se edita un habito poner una tuerca para abrir el panel de configuracion asi como cuando se edita una tarea en movil **CORREGIDO: BottomSheetHabito.tsx ahora soporta modo edición con prop habitoExistente, icono Settings para abrir configuración, useModalesDashboard.ts con estado habitoEditandoMovil, DashboardGrid.tsx con handler adaptativo que abre BottomSheet en móvil o Modal en desktop**

4. ✅ Las actividades se siguen guardando en el panel de actividad sin el nombre, no debe estar cifrado y tambien debe aparecer el nombre. **CORREGIDO: ActividadApiController.php ahora lee $detalles del request - la línea que lo leía estaba faltando**

5. ✅ La carpeta general (donde debería estar todas las notas sin carpeta) no aparece, las notas iniciales esas que estaban antes de la logica de carpeta no puedo regresar a ellas despues que navego por las carpetas, no se que es "navegadorCarpetasFormulario navegadorCarpetasFormulario--inline" no hace nada supongo que pretende ser un buscador pero no funciona y tiene 2 botones de check y x, es igual a nput de formulario para agregar una nueva carpeta eso si funciona. (La carpeta general me aparecio por un momento despues un rato no se cuanto y luego desaparecio al volver a la lista de carpetas) **CORREGIDO: carpetasNotasStore.ts ahora garantiza que la carpeta General virtual siempre exista: 1) cargarCarpetas verifica/agrega General si no viene del backend, 2) en error muestra General como fallback, 3) volverACarpetas recarga si carpetas vacías. NOTA: el formulario inline es para RENOMBRAR carpetas (aparece al hacer clic en el icono de editar), no es buscador**

6. ✅ Eliminar listaNotasItemMetas y reemplazar por menú contextuales (igual que tareas) en Notas Guardadas. **CORREGIDO: Implementado NotaItem.tsx con MenuContextualAdaptivo y useMenuContextualConId, eliminando acciones inline y metadatos innecesarios**


# Revisiones (0.1) de las tareas anteriores (revisiones hecha por el usuario)

1. ✅ El texto de la nota las ultimas palabras se cubren con el nav inferior. **CORREGIDO: padding-bottom en scratchpad.css**
2. ✅ El css de los gestos al deslizar, el texto debe ser pequeño, el color de eliminar rojo, quita los iconos, los colores verdes y rojo tienen que difuminarse. Tambien pasa que cuando texto de la tarea es corto, el liminar no aparece al final o sea no se ocupa el 100% al ancho y no se ve al borde la pantalla como debería. **CORREGIDO: swipeableItem.css reescrito con gradientes y 100% width**
3. ✅ El css de los subhabitos en el panel de configuracion de los habitos debe ser igual exactamente a como se vían las metas o subtarea, y sigue apareciendo las subtareas, "No hay metas o tareas para este hábito", acomodar los css (mucho mas minimalista y con la misma logica de las tareas pero ya hablamos que la diferencia esta en que los habitos si se reinician)y quitar las metas o subtareas en la configuracion de los habitos. Otro detalle es que subhabitos no se ven en el panel de ejecución, deben verse igual como se ven las subtareas. **CORREGIDO: Eliminado ListaTareasHabito, CSS subhabitos.css minimalista, subhábitos ahora aparecen en panel de ejecución**
4. ✅ Sobre "TAREA 0.3: Opción Ocultar Subtareas Automáticamente" Funciona bien pero cuando agrego una subtarea (tambien con los subhabitos), debe expandirse si esta desactivada la opcion, solo se expande si recargo la pagina actualmente. **CORREGIDO: useListaTareasLogica.ts detecta nuevas tareas padre y las expande automáticamente**
5. ✅ Sobre "TAREA 0.5: BottomSheet para Hábitos en Móvil" funciona bien pero hubo una confuncion el bottomS que se abre al tocar los habitos es el menu contextual, debe ser de editar como funciona actualmente con las tareas. **CORREGIDO: TablaHabitos.tsx ahora abre modal de edicion directamente en movil en vez de menu contextual**
6. ✅ Sobre TAREA 1: Nombres en Panel de Actividad, ahora si sale el nombre de las tareas pero apareecn asi "CIFRADO", alli en el panel de actividad se tienen que ver bien. **CORREGIDO: ActividadRepository.php ahora usa CifradoTrait para descifrar nombres de elementos y proyectos**
7. ✅ Sobre las notas "Notas Guardadas" los botones de expandir o contraer tienen que estar separados, uno para contraer la barra lateral donde estan las notas otro para la barra lateral donde se escribe la nota, esos botones junto a los otros botones todos tienen que ir en el header alli donde esta la X para cerrar. Tambien pasa que faltan cass para las carpetas, la carpeta general donde aparecen todas las notas que no estan en una carpeta no se ve, el css de esta parte de donde estan las notas debe ser como un entorno grafico como un explorador de archivo, esto es una tarea compleja que parece que tal vez hay que dividir en varios pasos, es literalmente hacer un explorador de archivos para esas carpetas. **CORREGIDO: ModalNotasExpandido con botones separados lista/editor en header, carpetasNotas.css actualizado con estilos tipo explorador de archivos**
8. ✅ Selecionar varias tareas con control + click no funciona, asumo que tampoco funciona en movil para selecionar varias tareas presionando, esto me impide probar la funcionalidad de agrupar. **CORREGIDO: TareaItem.tsx ahora detecta Ctrl+Click y long press en movil para seleccion multiple**
9. ✅ Todos los backup en el modal de copias de seguridad dicen "MANUAL_SAVE" cuando todos ellos son copias automaticas. **CORREGIDO: DashboardApiController.php ahora usa 'auto_save', ModalHistorialBackups.tsx muestra 'Automatica'**
10. Las tareas 8 y 7 no deberían estar pospuestas y se deberían de trabajar en ellas, la apk esta lista para testear cosas.


# TAREAS PENDIENTES - SPRINT ACTUAL

## TAREA 0: Panel de Notas Versión Móvil
**Estado:** ✅ Completada | **Prioridad:** Alta

### Subtareas:
- [x] 0.1 Eliminar borde de `panelDashboard internaColumna` en versión móvil
- [x] 0.2 Eliminar funcionalidad de resize (cambiar tamaño) en versión móvil
- [x] 0.3 Eliminar borde top degradado que aparece al escribir en versión móvil
- [x] 0.4 Expandir nota al 100% de altura (dvh) en versión móvil
- [x] 0.5 Agregar en menú de 3 puntos:
  - Opción para abrir configuración de notas
  - Botón "Ver notas guardadas"
  - Botón "Añadir nueva nota"
- [x] 0.6 Adaptar panel de notas guardadas para versión móvil

### Archivos modificados:
- `styles/dashboard/componentes/scratchpad.css` - CSS móvil para panel notas
- `hooks/useOpcionesPanelMovil.tsx` - Opciones menú para panel notas
- `islands/DashboardIsland.tsx` - Integración con modales
- `components/dashboard/PanelScratchpad.tsx` - Clase CSS adicional

---

## TAREA 0.1: Deslizamiento en Tareas Móvil (Swipe Actions)
**Estado:** ✅ Completada | **Prioridad:** Media

### Descripción:
Implementar gestos de deslizamiento en versión móvil:
- Deslizar para completar tarea (mostrar indicador visual de acción)
- Deslizar para borrar tarea (mostrar indicador visual de acción)

### Subtareas:
- [x] Crear componente `SwipeableItem` reutilizable
- [x] Integrar en lista de tareas del panel de ejecución
- [x] Añadir indicadores visuales durante el deslizamiento
- [x] Definir umbral de activación del swipe

### Archivos creados/modificados:
- `components/shared/SwipeableItem.tsx` - Componente wrapper de swipe
- `styles/dashboard/componentes/swipeableItem.css` - Estilos del componente
- `components/dashboard/lista-tareas/TareaConColapsador.tsx` - Integración SwipeableItem
- `styles/dashboard/index.css` - Import del CSS

---

## TAREA 0.2: Subhábitos (Reemplazar Subtareas en Hábitos)
**Estado:** ✅ Completada | **Prioridad:** Media

### Descripción:
Las subtareas de hábitos se reemplazan por "subhábitos":
- Son hábitos dentro de hábitos
- Al completarse se mantienen (no desaparecen como subtareas)
- Frecuencia independiente configurable
- Importancia independiente configurable
- Heredan inicialmente propiedades del hábito padre

### Subtareas:
- [x] Modificar modelo de datos de hábitos para soportar subhábitos
- [x] Crear UI para crear/editar subhábitos
- [x] Implementar herencia inicial de propiedades
- [x] Implementar lógica de frecuencia independiente
- [x] Adaptar panel de hábitos para mostrar subhábitos

### Archivos modificados:
- `types/dashboard.ts` - Añadido interfaces SubHabito y DatosNuevoSubHabito
- `stores/habitosStore.ts` - Añadido acciones CRUD para subhábitos
- `components/dashboard/habitos/ListaSubHabitos.tsx` - Nuevo componente para listar/editar subhábitos
- `components/dashboard/habitos/FormularioHabitoModerno.tsx` - Integración de ListaSubHabitos
- `components/dashboard/ModalHabito.tsx` - Callbacks para subhábitos
- `styles/dashboard/componentes/subhabitos.css` - Estilos para subhábitos

### DUDAS TAREA 0.2:
> **Pregunta 1:** ¿Los subhábitos pueden tener sus propios subhábitos (anidación múltiple) o solo un nivel? 
> 
> **Respuesta usuario:** Solo un nivel.

> **Pregunta 2:** ¿Cómo afecta completar un subhábito al hábito padre? ¿Se marca el padre como parcialmente completado?
> 
> **Respuesta usuario:** Nada. 

---

## TAREA 0.3: Opción Ocultar Subtareas Automáticamente
**Estado:** ✅ Completada | **Prioridad:** Baja

### Descripción:
Agregar configuración en panel de ejecución/tareas:
- "Ocultar subtareas automáticamente"
- Por defecto: desactivado (subtareas expandidas)
- Cuando está activado: subtareas colapsadas por defecto

### Subtareas:
- [x] Agregar opción en configuración del panel
- [x] Persistir preferencia en localStorage/store
- [x] Aplicar lógica de colapso automático

### Archivos modificados:
- `hooks/useConfiguracionTareas.ts` - Añadido ocultarSubtareasAutomaticamente
- `hooks/dashboard/useListaTareasLogica.ts` - Lógica para expandir/colapsar según configuración
- `components/dashboard/ListaTareas.tsx` - Prop ocultarSubtareasAutomaticamente
- `components/paneles/PanelEjecucion.tsx` - Prop ocultarSubtareasAutomaticamente
- `components/dashboard/DashboardGrid.tsx` - Pasar configuración al panel
- `components/dashboard/ModalConfiguracionTareas.tsx` - Toggle para la opción

---

## TAREA 0.4: Bug - Caracteres Raros en Notas al Recargar
**Estado:** ✅ Completada | **Prioridad:** Alta (Bug)

### Descripción:
Al recargar, las notas con acentos muestran símbolos raros tipo `&amp;lt`.
Problema de encoding/decoding HTML entities.

### Subtareas:
- [x] Identificar dónde se está haciendo double-encoding
- [x] Corregir serialización/deserialización de notas
- [x] Verificar que los acentos se muestran correctamente después de recargar

### Archivos modificados:
- `Repository/NotasRepository.php` - Añadido html_entity_decode en listar, obtener y buscar

---

## TAREA 0.5: BottomSheet para Hábitos en Móvil
**Estado:** ✅ Completada | **Prioridad:** Media

### Descripción:
Al tocar un hábito en versión móvil debe aparecer el BottomSheet para editar (igual que con tareas).
También debe funcionar en el panel de ejecución.

### Subtareas:
- [x] Extender BottomSheet existente para soportar hábitos
- [x] Integrar en panel de hábitos versión móvil
- [x] Integrar en panel de ejecución versión móvil

### Archivos modificados:
- `components/dashboard/TablaHabitos.tsx` - Añadido useEsMovil y lógica para abrir BottomSheet en móvil

### Notas:
- El componente MenuContextualAdaptivo ya detecta móvil automáticamente y muestra BottomSheet
- Solo fue necesario cambiar el manejador de click para que en móvil abra el menú en lugar de editar directamente

---

## TAREA 0.6: Sincronizar Configuración de Jornada
**Estado:** ✅ Completada (verificada) | **Prioridad:** Media

### Descripción:
La configuración de jornada debe sincronizarse en todos los paneles/vistas.

### Análisis:
El sistema ya estaba correctamente implementado:
- `configuracionUsuarioStore.ts`: Store con `horaFinDia` persistido en localStorage
- `fecha.ts`: `configurarHoraFinDia()` y `obtenerFechaEfectiva()` que ajusta la fecha según la hora configurada
- `inicializarHoraFinDiaInmediatamente()`: Lee del localStorage ANTES de que el store se rehidrate
- `actividadService.ts`: Todos los registros usan `obtenerFechaHoy()` que respeta la configuración
- `mapaCalorUtils.ts`: Usa `obtenerFechaEfectiva()` y `obtenerFechaHoy()` correctamente
- `habitosStore.ts`: Los toggles de hábitos usan `obtenerFechaHoy()`
- `ModalConfiguracionUsuario.tsx`: UI para configurar la hora (0-23)

### Archivos que ya implementan correctamente:
- `stores/configuracionUsuarioStore.ts` - Store y sincronización
- `utils/fecha.ts` - Lógica de fecha efectiva
- `services/actividadService.ts` - Registro de actividad
- `utils/mapaCalorUtils.ts` - Mapa de calor
- `components/configuracion/ModalConfiguracionUsuario.tsx` - UI de configuración

### DUDAS TAREA 0.6:
> **Pregunta:** ¿La configuración de jornada ya existe en algún lugar? ¿Dónde se define actualmente?
> 
> **Respuesta usuario:** Es la unica opcion que hay en las preferencias de usuarios "Fin de día" se llama.

---

## TAREA 1: Nombres en Panel de Actividad
**Estado:** ✅ Completada (verificada) | **Prioridad:** Media

### Descripción:
Al hacer click en un día en el panel de actividad, no aparecen los nombres de hábitos/tareas.
Solo muestra si fue hábito, tarea, o pospuesto. Falta guardar/mostrar el nombre.

### Subtareas:
- [x] Verificar qué datos se están guardando al completar hábito/tarea
- [x] Asegurar que el nombre se guarda en el registro de actividad
- [x] Mostrar el nombre en el detalle del día seleccionado

### Análisis:
El sistema ya está correctamente implementado:
- `actividadService.ts`: Las funciones `registrarTareaCompletada` y `registrarHabitoCumplido` ya aceptan y envían el nombre
- `habitosStore.ts` línea 184: Ya pasa `habito.nombre` al registrar
- `useTareas.ts` línea 198: Ya pasa `tarea.texto` al registrar
- `ActividadRepository.php`: Guarda el nombre en el campo JSON `detalles`
- `obtenerDetalleDia`: Recupera el nombre del JOIN o del campo `detalles.elementoNombre`
- `PanelActividad.tsx`: Ya muestra el nombre formateado como `Tarea "nombre"` o `Hábito "nombre"`

### Nota:
Las actividades registradas ANTES de esta implementación no tendrán nombres guardados. Solo las nuevas actividades mostrarán los nombres correctamente.

---

## TAREA 2: Mejoras en Notas:
**Estado:** ✅ Completada | **Prioridad:** Media

### Subtareas:
- [x] 2.1 Agregar botón "expandir" para maximizar el modal de notas guardadas
- [x] 2.2 Agregar botón "crear nueva nota" en el header del modal
- [x] 2.3 Agregar selector de ordenamiento (fecha de modificación / fecha de creación)

### Archivos modificados:
- `components/dashboard/notas/ModalNotasExpandido.tsx` - Nuevos botones y lógica de ordenamiento
- `styles/dashboard/componentes/scratchpad.css` - Estilos para barra de acciones y modal maximizado

---

## TAREA 2.1: Sistema de Carpetas para Notas
**Estado:** ✅ Completada | **Prioridad:** Media | **Complejidad:** Alta

### Descripción:
Implementar sistema de carpetas:
- Carpeta "General" por defecto (todas las notas nuevas van ahí)
- Botón `<` para navegar a vista de carpetas
- Crear nuevas carpetas
- Mostrar nombre de carpeta actual
- Menú contextual en notas: ver, mover a carpeta, eliminar, renombrar

### Subtareas:
- [x] Crear modelo de datos para carpetas (BD y TypeScript)
- [x] Crear repositorio PHP para CRUD de carpetas
- [x] Crear API controller para carpetas
- [x] Crear servicio y store de carpetas en frontend
- [x] Crear UI de navegación de carpetas
- [x] Implementar "mover a carpeta" en lista de notas
- [x] Migrar notas existentes a carpeta "General" (automático - NULL = General)

### Archivos creados:
- `Database/Schema.php` - Tabla glory_carpetas_notas y campo carpeta_id en notas
- `Repository/CarpetasNotasRepository.php` - CRUD de carpetas
- `Api/CarpetasNotasApiController.php` - Endpoints REST para carpetas
- `stores/carpetasNotasStore.ts` - Estado de carpetas
- `components/dashboard/notas/NavegadorCarpetas.tsx` - UI navegación
- `styles/dashboard/componentes/carpetasNotas.css` - Estilos

### Archivos modificados:
- `Repository/NotasRepository.php` - Filtrar por carpeta, mover nota
- `services/notasService.ts` - Servicio carpetas y mover nota
- `types/notas.ts` - Interface CarpetaNota y campo carpetaId
- `components/dashboard/notas/ModalNotasExpandido.tsx` - Integración carpetas
- `components/dashboard/notas/ListaNotasGuardadas.tsx` - Opción mover a carpeta
- `styles/dashboard/index.css` - Import del CSS

---

## TAREA 2.2: Expandir/Colapsar Vistas en Notas
**Estado:** ✅ Completada | **Prioridad:** Baja

### Descripción:
- Poder ocultar el visor y ver solo lista de notas
- Poder ocultar lista de notas y ver solo el visor
- Simular explorador de archivos minimalista

### Subtareas:
- [x] Agregar botones de toggle para cada panel
- [x] Implementar estados de vista (solo-lista, solo-visor, ambos)
- [x] Persistir preferencia (en estado local del componente)

### Archivos modificados:
- `components/dashboard/notas/ModalNotasExpandido.tsx` - Estado vistaPaneles, botón toggle, lógica condicional
- `styles/dashboard/componentes/scratchpad.css` - Clases --soloLista y --soloEditor

---

## TAREA 3: Secciones/Grupos en Paneles
**Estado:** ✅ Completada | **Prioridad:** Media | **Complejidad:** Alta

### Descripción:
Sistema de agrupación para tareas y hábitos:
- Configuración "Activar secciones" (desactivada por defecto)
- Seleccionar elementos y elegir "Agrupar"
- Título editable encima del grupo
- Botón para colapsar/expandir grupo

### Subtareas:
- [x] Agregar campo grupoId a interface Tarea
- [x] Crear interface GrupoTareas
- [x] Crear store gruposTareasStore con CRUD de grupos
- [x] Agregar opción "Activar secciones" en configuración
- [x] Agregar opción "Agrupar" al menú de acciones masivas
- [x] Crear componente GrupoTareasHeader (título editable, colapso)
- [x] Crear estilos CSS para grupos

### Archivos creados:
- `stores/gruposTareasStore.ts` - Store Zustand para grupos
- `components/dashboard/lista-tareas/GrupoTareasHeader.tsx` - Header de grupo
- `styles/dashboard/componentes/gruposTareas.css` - Estilos

### Archivos modificados:
- `types/dashboard.ts` - Agregado grupoId a Tarea, interface GrupoTareas
- `components/dashboard/ModalConfiguracionTareas.tsx` - Toggle "Activar secciones"
- `components/dashboard/lista-tareas/MenuAccionesMasivas.tsx` - Opción "Agrupar"
- `components/dashboard/ListaTareas.tsx` - Handler manejarAgrupar
- `styles/dashboard/index.css` - Import gruposTareas.css

### Nota:
### Nota:
La renderización visual de grupos con sus tareas agrupadas se implementará en una iteración posterior. Law infraestructura (store, tipos, UI de creación) está completa.

> **ACTUALIZACIÓN 2026-02-02:** Se ha desactivado la opción de "Activar secciones" en la UI y forzado a `false` en el código debido a bugs detectados. Se retomará en una fase posterior.


### IMPORTANTE - Hacer primero Tarea 3.1 (Selección múltiple)

---

## TAREA 3.1: Selección Múltiple de Tareas
**Estado:** ✅ Completada | **Prioridad:** Alta (Prerrequisito de 3)

### Descripción:
- Ctrl + Click para seleccionar múltiples tareas
- Click derecho aplica acciones a todas las seleccionadas:
  - Borrar
  - Cambiar importancia (Priority & Urgency via submenus)
  - Mover a proyecto
  - Agrupar

### Subtareas:
- [x] Implementar estado de selección múltiple en store
- [x] UI de selección (indicador visual sutil, sin bordes)
- [x] Menú contextual con acciones masivas (Submenús para Prioridad y Urgencia)
- [x] Lógica de cada acción masiva
- [x] Deselección automática al hacer click en el fondo

### Archivos creados:
- `stores/seleccionMultipleStore.ts` - Store Zustand para gestionar selección
- `components/dashboard/lista-tareas/MenuAccionesMasivas.tsx` - Menú contextual acciones masivas

### Archivos modificados:
- `components/dashboard/TareaItem.tsx` - Props estaSeleccionada, onSeleccionMultiple, lógica de click
- `components/dashboard/lista-tareas/TareaConColapsador.tsx` - Pasar props de selección
- `components/dashboard/ListaTareas.tsx` - Integración store, handlers, menú, click en fondo
- `components/shared/DashboardPanel.tsx` - Prop onContextMenu y onClick
- `components/shared/MenuContextual.tsx` - Export OpcionMenu interface
- `styles/dashboard/componentes/tareas.css` - Clase .tareaItem--seleccionada (refinada)

---

## TAREA 3.2: Ordenamiento de Grupos
**Estado:** ✅ Completada | **Prioridad:** Media (Después de 3 y 3.1)

### Descripción:
- Ordenamiento interno de grupos: aplica el mismo criterio que el ordenamiento general
- Ordenamiento de grupos entre sí: nombre, importancia promedio (inteligente), manual

### Subtareas completadas:
- [x] Añadir tipo OrdenamientoGrupos al store (nombre, importancia, manual)
- [x] Implementar setOrdenamientoGrupos y ordenarGrupos en el store
- [x] Renderizar grupos en ListaTareas.tsx con GrupoTareasHeader
- [x] Separar tareas en grupos y sin grupo cuando secciones activas
- [x] Añadir selector de ordenamiento en ModalConfiguracionTareas
- [x] Estilos CSS para contenedores de grupos y selector

### Archivos modificados:
- `stores/gruposTareasStore.ts` - OrdenamientoGrupos, ordenarGrupos, setOrdenamientoGrupos
- `components/dashboard/ListaTareas.tsx` - Renderizado de grupos con headers colapsables
- `components/dashboard/ModalConfiguracionTareas.tsx` - Selector de ordenamiento de grupos
- `styles/dashboard/componentes/gruposTareas.css` - Estilos para contenedores
- `styles/dashboard/componentes/configuracionTareas.css` - Estilos para selector

---

## TAREA 4: Ventana de Oportunidad para Hábitos
**Estado:** ✅ Completada | **Prioridad:** Baja

### Descripción:
Período de tiempo óptimo para realizar un hábito.
Ejemplo: Tomar sol → mejor en la mañana con menos UV.

### UI:
- Nuevo botón en "propiedadesCompactas"
- Al hacer click abre menú contextual tipo "frecuencia"
- Círculo (reloj minimalista) con grosor 8px
- Marcar inicio y fin del período de oportunidad

### Subtareas:
- [x] Agregar campo `ventanaOportunidad` al modelo de hábitos
- [x] Crear componente de selección circular de tiempo
- [x] Integrar en propiedadesCompactas
- [x] Mostrar indicador visual cuando estamos en ventana de oportunidad

### DUDAS TAREA 4:
> **Pregunta:** ¿Debe haber alguna notificación/alerta cuando inicia la ventana de oportunidad?
> 
> **Respuesta usuario:** Si, estas notificaciones tambien apareceran en el telefono pero aun no se programa esa parte de notificaciones en la apk.

### Archivos creados/modificados:
- `types/dashboard.ts` - Interfaz VentanaOportunidad, campo en Habito y DatosNuevoHabito
- `components/shared/SelectorVentanaOportunidad.tsx` - Componente con reloj circular SVG
- `styles/dashboard/componentes/ventanaOportunidad.css` - Estilos del selector
- `components/shared/index.ts` - Export del componente
- `styles/dashboard/index.css` - Import del CSS
- `components/dashboard/Habitos/FormularioHabitoModerno.tsx` - Integración con FilaPropiedades
- `components/dashboard/ModalHabito.tsx` - Estado y paso de props ventanaOportunidad
- `stores/habitosStore.ts` - Persistir ventanaOportunidad en crearHabito y editarHabito

---

## TAREA 6: Modal Backup Versión Móvil
**Estado:** ✅ Completada | **Prioridad:** Baja

### Descripción:
- Modal de copia de seguridad no está adaptado para móvil
- Compactar botones (moverlos abajo)
- Lista de historial debe cubrir 100% ancho y alto del modal en móvil

### Subtareas:
- [x] Revisar estilos del modal de backup
- [x] Adaptar layout para móvil
- [x] Ajustar lista de historial

### Archivos modificados:
- `styles/dashboard/componentes/historialBackups.css` - Estilos responsive para móvil

---

## TAREAS POSPUESTAS (PARA DESPUÉS - APP)

### TAREA 7: Sincronización en Tiempo Real
**Estado:** ⬜ Pospuesta | **Prioridad:** Alta (Post-lanzamiento)

Actualizaciones en tiempo real entre dispositivos y pestañas.

---

### TAREA 8: Modo Offline para App
**Estado:** ⬜ Pospuesta | **Prioridad:** Alta (Post-lanzamiento)

Si no hay internet, la app debe funcionar offline y sincronizar cuando vuelva la conexión.

---

# TAREAS COMPLETADAS EN ESTE SPRINT

_Tareas completadas con fecha_

### Sesión Actual (continuación):
- ✅ **TAREA 0**: Panel de Notas Versión Móvil - CSS, hook, integración modal
- ✅ **TAREA 0.1**: Swipe Actions en Tareas Móvil - SwipeableItem component
- ✅ **TAREA 0.4**: Bug Encoding Notas - html_entity_decode en NotasRepository
- ✅ **TAREA 0.5**: BottomSheet para Hábitos en Móvil - useEsMovil en TablaHabitos
- ✅ **TAREA 1**: Nombres en Panel de Actividad - Verificado, ya implementado
- ✅ **TAREA 2**: Mejoras en Notas - Expandir, crear nueva, ordenamiento
- ✅ **TAREA 6**: Modal Backup Versión Móvil - Estilos responsive

---

# Comentarios exactos del usuario. 

0. Esto va primero, para el panel de notas version movil, veo que panelDashboard internaColumna tiene un borde no se exactamente si es ahi pero, no tiene que tener borde, ni tampoco eso de cambiar el tamaño que tiene en el escritorio, tambien tieneu una especie de borde top con degradado cuando se esta escribiendo, nada de eso debe aparecer en la version movil, y debe estar expandida la nota al 100% del la altura, dvh, en los 3 puntos debe aparecer para abrir la configuracion del notas y la carpeta de "ver notas guardadas" y el boton para añadir nueva nota, hay que adaptar el panel de notas guardadas para que este disponible en version movil.

0.1 Lo agrego aqui porque recien se me ocurre, deslizamiento en la version movil para completar una tarea, otra para borrar, claro, al estar deslizando se tiene que ver que accion se esta realizado asi como en cualquier app.

0.2 Eliminar las subtareas de los habitos y remplazar por subhabitos, esos subhabitos son habitos dentro de habitos, al completar se mantienen y se puede elegir la frecuencia independiente y la importancia de forma independiente, heradan incialmente las propieades de su habito padre.

0.3 Agregar una opcion en el panel de ejecucion o tareas para ocultar las subtareas automaticamente, por defecto o cuando esto este desactivado, todas las subtareas estaran expandidas inicialmente 

0.4 bug, al recargar, las notas donde creo que hay acentos, aparecen con simbolos raros de "&amp;lt"

0.5 En la version movil cuando de da un toque una tarea aparece el bottomS para editar, eso esta bien pero falta para los habitos, incluso tambien debe funcionar en el panel de ejecución.

0.6 La configuracion de jornada debe sincronizarse en todos lados.

1. Los nombre de los habitos o tareas no aparecen cuando se da click a un dia en el panel de actividad tal vez no se este guardado el nombre de lo que se cumple ese dia, solo aparece si un habito o si fue una tarea o si fue pospuesto, etc. 

2. En las notas guardadas agregar un boton para expandir, "ver notas guardadas" el modal que se expande, alli agregar en el header un boton para expandir por completo, agregar un boton para crear una nueva tarea, poder elegir como se ordenan las tareas (fecha de modificación o fecha de creación

2.1 Sistema de carpetas para las notas, sera asi, actualmente todas las tareas aparecen como si fueran correos y el visor al lado, bien, pero, se puede organizar, haríamos que todas las notas estén en una carpeta de "General", y cuando se cree una nueva nota se crea alli. Lo que haremos que el panel lateral donde aparecen las notas, un boton de &lt; para ir a las carpetas y poder crear una carpeta y cuando se este dentro de una carpeta pues mostrar el nombre de esa carpeta para saber que se esta alli, o sea las tareas se podran ordenar por carpeta, actualmente las notas no tienen un menu contextual pero deben tenerlo ademas de las carpetas, este menu contextual en las notas servira para ver, mover a carpeta, eliminar, renombrar, etc

2.2 Expandir vista de navegancion de tareas en las notas guardadas, o sea, se podra ocultar el visor y vicersa, ocultar donde aparecen las notas y dejar solo el visor, literalmente estamos haciendo con esto esto algo que simule un explorador de archivos pero enfocado en notas y minimalista. 

3. Secciones en el panel de ejecución y el panel de habitos. ¿Como es esto? Bueno, actualmente las tareas y habitos aparecen todas por igual, hay subtareas que se pueden ocultar pero ok, el punto es que lo que haremos es una configuracion desactivada por defecto en ambos paneles de &quot;Activar secciones&quot; o activar grupos, lo que se nueve mejor, por defecto no existe ningun grupo pero el punto es que al selecionar un habito o una tarea debe mostrar &quot;Agrupar&quot; y arriba de esas tareas agrupadas aparecera un titulo pequeño editable y un boton para ocultar y mostrar esas tareas, esto implica varias cosas.

3.1 Las tareas no tienen capacidad de selecion multiple, esto es importante de hacer primero, la idea es poder selecionar varias tareas presionando control y con el clik derecho las acciones que se hagan se aplicaran a lasw tareas seleccionadas, incluyendo borrar, cambiar importancia, mover a proyecto, y la razon principal para agrupar.

Hay una diferencia entre los proyectos y agrupar, los proyectos es un panel aparte, y agrupar es similar pero es util porque no todo es un proyecto por ejemplo podria agrupar tareas para la noche o habitos nocturnos y otro grupo para habitos matutinos, seria absurdo crear un proyecto &quot;dia&quot; proyecto &quot;noche&quot;

entonces ya se entiende un poco la razon para poder agrupar. 

3.2 tambien implica otra cosa, el ordenamiento, pero esto es sencillo, simplemente el ordenamiento que se eliga, aplicara para las tareas agrupadas internamente, por ejmplo si el ordenamiento es inteligente pues las tareas agrupadas internamente en su grupo se ordenan inteligentemente. El ordenamiento de los grupos es otra cosa y creo que debería poder elegirse asi como se elige el ordenamiento de las otras cosas, los grupos se deberan ordenar por nombre, importancia promedio de sus tareas internas (inteligente) o manual.

4. Ventana de oportunidad para los habitos: esto es facil de explicar, imagina que un habito, se tiene que hacer todos los dias pero, hay un periodo de tiempo en donde es una oportunidad, ejemplo, si tengo que habito de tomar sol, obviamente la mejor hora para hacer ese habito es en la mañana donde hay menos uv, entonces lo que hariamos es que agregaremos otro "propiedadesCompactas" con un boton que al dar click, habre un pequeño menu contextual como el de frecuencia, con un reloj minimalista, bueno no es un reloj o tal vez si, un circulo vacio con un grosor de 8px donde marcas el inicio y el final de ese periodo de oportunidad, full minimalista.

6. Cosas pequeñas, el modal de copia de seguridad en la version movil no esta adaptado para movil, se puede compactar agregando los botones abajo, y la lista de historial no cubre el 100% de ancho y altura del modal en la version movil.

7. Sincronización en tiempo real: ¿que pasa si tengo mi telefono y marco una tarea, en el escritorio no se actualiza, las actualizaciones deben ser real entre dispositivos y pestañas. 

8. En la app móvil, si se va el internet no se puede acceder a la app, necesitamos que todo pueda ser office y que cuando llegue el internet, se sincronice. 


# ARCHIVO DE FASES ANTERIORES

## Fase 13: App Móvil Híbrida (Capacitor)
**Estado:** ✅ Autenticación completada | Pagos pendientes

- [x] Inicializar Capacitor
- [x] Generar proyecto Android
- [x] Autenticación Google nativa funcionando
- [ ] RevenueCat para pagos (pospuesto)

## Fase 14: Mejoras Pre-Beta
- [ ] Análisis de navegación lateral (sidebar)
- [ ] Auditar modales para usar variables CSS

---

## Notas Técnicas

### Archivos Clave:
- **Notas:** `useNotas.ts`, `notasStore.ts`, `ModalNotasExpandido.tsx`, `ListaNotasGuardadas.tsx`
- **Tareas/Hábitos:** Stores en `/stores`, componentes en `/components`
- **Panel Actividad:** `actividadService.ts`, `PanelActividad.tsx`
- **Estilos móvil:** Buscar media queries en archivos CSS

### Principios:
1. **SRP:** Cada componente/hook una sola responsabilidad
2. **Componentes máx 300 líneas**
3. **Hooks máx 120 líneas**
4. **CSS en español con camelCase**

---

## COMUNICACIÓN ASÍNCRONA

_Espacio para que el usuario deje comentarios durante la ejecución:_

### Comentarios del Usuario:
> _[Escribe aquí cualquier aclaración o nueva instrucción]_

### Respuestas del Agente:
> _[Responderé aquí cuando lea nuevos comentarios]_

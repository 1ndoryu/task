# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual

**Fecha de inicio:** 2025-12-19  
**Version:** v1.0.5-beta  
**Ultima actualizacion:** 2025-12-27
**Estado:** Fase 8.6 COMPLETADA - Cache de historial implementado

---

## Funcionalidades Completadas

| Módulo              | Descripción                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| **Infraestructura** | Arquitectura SOLID, CSS centralizado, TypeScript, Sincronización, Cifrado E2E |
| **Hábitos**         | CRUD, frecuencias, rachas, badges, ordenamiento, menú contextual              |
| **Tareas**          | CRUD inline, subtareas, Drag & Drop, prioridades, adjuntos                    |
| **Proyectos**       | Jerarquía 3 niveles, progreso, vista expandible                               |
| **Freemium**        | Free/Premium, Trial 14 días, Stripe (checkout, webhooks, portal)              |
| **Seguridad**       | API REST WordPress, nonce CSRF, AES-256-GCM, HKDF-SHA256                      |
| **Admin**           | Gestión usuarios, filtros, estadísticas                                       |
| **UI/UX**           | Componentes compartidos, badges, tooltips, layout personalizable              |
| **Scratchpad**      | Cifrado E2E, límite caracteres, debounce                                      |
| **Layout**          | Columnas, paneles ocultos, Drag & Drop reordenamiento                         |
| **Perfil**          | Avatar, contraseña, integración WordPress                                     |
| **Configuración**   | Opciones por panel (hábitos, tareas, proyectos, scratchpad)                   |

---

## 📌 Mejoras Menores (Baja Prioridad)

<details>
<summary>Expandir lista completa</summary>

**Hábitos:**
- [ ] Animación de entrada/salida
- [ ] Animación visual de logro al completar
- [ ] Umbral de reseteo editable
- [ ] Adaptar racha a frecuencia

**Tareas:**
- [ ] Animación de arrastre más fluida
- [ ] Estadísticas de tareas completadas hoy
- [ ] Soporte markdown en descripción
- [ ] Historial de repeticiones

**Ordenamiento:**
- [ ] Drag & drop manual para hábitos
- [ ] Guardar preferencia de orden
- [ ] Buscar hábitos por nombre

**Responsive/PWA:**
- [ ] Layout móvil adaptativo
- [ ] Touch gestures
- [ ] Service Worker offline
- [ ] Instalable en móvil

**Notificaciones por Correo:**
- [ ] Tareas por vencer
- [ ] Resumen diario/semanal
- [ ] Alerta de racha en peligro
- [ ] Configuración de preferencias

**Pulido Mobile:**
- [ ] Touch events para dispositivos táctiles
- [ ] Fallback a controles del modal para accesibilidad
- [ ] Animación de "snap" al soltar
- [ ] Cursor personalizado durante arrastre

</details>

---

## 🔮 Sistema Social (v1.0.2-beta) - COMPLETADO

> **Detalle completo:** Ver [fases-completadas.md](./fases-completadas.md)

### Fases Completadas (Resumen)

| Fase | Nombre           | Descripción                                          |
| ---- | ---------------- | ---------------------------------------------------- |
| 0    | Preparación      | Alertas personalizadas, Header compactado a iconos   |
| 1    | Almacenamiento   | Límites (50MB Free / 10GB Premium), indicador de uso |
| 1.5  | Archivos Físicos | Subida multipart, cifrado stream, cache, thumbnails  |
| 2    | Equipos          | Solicitudes, compañeros, estados pendientes          |
| 3    | Notificaciones   | Polling, tipos, marcar leídas, badges                |
| 4    | Compartir        | Proyectos, tareas, asignación, roles                 |

### Tareas Pendientes de Fase 4 (Cifrado Avanzado)

> Estas tareas se posponen para una fase futura de optimización de seguridad:

- [ ] Campo `cifrado_compartido: false` en elementos compartidos
- [ ] Tareas NO compartidas permanecen cifradas normalmente
- [ ] Separar datos cifrados de no cifrados en sincronización

---

## Fases 5-7.6: Completadas (v1.0.3-beta a v1.0.4-beta)

> **Detalle completo:** Ver historial de commits o changelog.

| Fase | Nombre                   | Descripcion Resumida                                                            |
| ---- | ------------------------ | ------------------------------------------------------------------------------- |
| 5    | Sistema de Urgencia      | Niveles bloqueante/urgente/normal/chill, ordenamiento inteligente mejorado      |
| 6    | Mejoras UX Rapidas       | Lectura automatica notificaciones, exportar/importar al menu perfil             |
| 6.3  | Auto-Guardado Modales    | Guardado al cerrar modal (overlay/ESC/X), deteccion de cambios                  |
| 6.5  | Refact. Formularios      | ModalHabito y ModalProyecto con auto-guardado                                   |
| 6.6  | Habitos en Ejecucion     | Habitos como tareas virtuales, urgencia automatica por dias inactivos           |
| 7    | Modal Chat + Historial   | Timeline unificado, mensajes + eventos sistema, notificaciones, mensajes leidos |
| 7.1  | Diseno Modal Expandido   | 2 columnas: formulario + chat/historial, responsive                             |
| 7.2  | Sistema Mensajes         | Tabla BD, endpoints API, hook useMensajes, registro eventos                     |
| 7.3  | Mensajes No Leidos       | Badge en tareas, marcar como leido automatico                                   |
| 7.4  | UI Timeline              | Burbujas usuario, lineas sistema, fechas separadoras                            |
| 7.5  | Correcciones UX + Resize | Redimensionar columnas/paneles, notas guardadas, botones minimizar              |
| 7.6  | Mejoras Habitos + Bugs   | Posponer habitos, tolerancia urgencia, bugs criticos corregidos                 |
| 7.7  | Notificaciones Mensajes  | Notificar a participantes al recibir mensaje                                    |

<details>
<summary>Ver detalle de Fases 7.5 y 7.6</summary>

### Fase 7.5: Correcciones UX y Redimensionamiento

| Tarea                            | Estado |
| -------------------------------- | ------ |
| Ocultar chat en creacion         | Hecho  |
| Filtro mis asignadas sin habitos | Hecho  |
| Columnas visibles habitos        | Hecho  |
| Orden paneles por defecto        | Hecho  |
| Boton minimizar paneles          | Hecho  |
| Redimensionar ancho columnas     | Hecho  |
| Redimensionar altura paneles     | Hecho  |
| Scroll unificado + bug parpadeo  | Hecho  |
| Scratchpad guardado notas        | Hecho  |
| Bug fuente pequena Scratchpad    | Hecho  |

### Fase 7.6: Mejoras de Habitos y Correcciones

| Tarea                             | Estado |
| --------------------------------- | ------ |
| Habitos editables desde Ejecucion | Hecho  |
| Sistema de posponer habitos       | Hecho  |
| Tolerancia de urgencia habitos    | Hecho  |
| Ocultar completadas en Proyectos  | Hecho  |
| Bug: Subtareas no persisten       | Hecho  |
| Bug: Scroll en Scratchpad         | Hecho  |
| Bug: Nombre tarea no persiste     | Hecho  |
| Bug: Error 403 en mensajes/evento | Hecho  |
| Bug: Cargando notas no centrado   | Hecho  |
| Bug: Retraso al eliminar notas    | Hecho  |
| Bug: Notas desincronizadas        | Hecho  |

</details>

---

## Fase 8: Mapa de Calor de Actividad [COMPLETADA]

**Objetivo:** Visualizar la actividad del usuario en un mapa de calor tipo GitHub.

### 8.1 Rastreo de Actividad [COMPLETADO]

> **Investigacion completada:** No existia registro previo de `fecha_completado`. Se creo sistema nuevo.

**Datos a rastrear:**
- [x] Tabla BD: `wp_glory_actividad` (id, user_id, tipo, elemento_id, fecha, detalles)
- [x] Tipos: `tarea_completada`, `habito_cumplido`, `nota_creada`, `adjunto_subido`
- [x] Al completar tarea → registrar en actividad
- [x] Al cumplir habito → registrar en actividad

**Archivos creados:**
- `App/Repository/ActividadRepository.php`
- `App/Api/ActividadApiController.php`
- `App/React/hooks/useActividad.ts`
- `App/React/services/actividadService.ts`

### 8.2 Componente Mapa de Calor [COMPLETADO]

```
components/shared/
  MapaCalor.tsx             (componente reutilizable) ✅
  HistorialHabito.tsx       (columna 7 dias) ✅
hooks/
  useActividad.ts           (hook para obtener datos) ✅
  useHabitosHistorial.ts    (hook para historial) ✅
```

**Configuraciones implementadas:**
- [x] Periodo: ultima semana, mes, 3 meses, año
- [x] Filtrar por tipo: solo tareas, solo habitos, todo
- [x] Filtrar por proyecto especifico
- [x] Filtrar por habito especifico
- [x] Nivel de actividad: 0-4 (escala tipo GitHub)

**Estilos creados:**
- `styles/dashboard/shared/mapaCalor.css`
- `styles/dashboard/shared/historialHabito.css`

### 8.3 Integracion [COMPLETADO]

**Panel nuevo en Dashboard:**
- [x] Nuevo bloque "Actividad" con mapa de calor general
- [x] Configurable desde modal de configuracion (periodo, filtros, tamaño celdas)

**En modal de Habito:**
- [x] Mostrar mapa de calor especifico del habito (MapaCalorHabito.tsx)
- [x] Historial de cumplimiento visual interactivo

**En modal de Proyecto:**
- [x] Mostrar mapa de calor de tareas completadas del proyecto (MapaCalorProyecto.tsx)

**Archivos creados:**
- `App/React/components/shared/MapaCalorProyecto.tsx`
- `App/React/styles/dashboard/shared/mapaCalorProyecto.css`

### 8.4 Multiples Heatmaps [PENDIENTE]

- [ ] Poder agregar multiples widgets de mapa de calor al dashboard
- [ ] Cada uno con configuracion independiente
- [ ] Nombrar cada widget (ej: "Mi actividad general", "Habito: Ejercicio")

**Complejidad:** Media-Alta | **Dependencias:** Historial de actividad

### 8.5 Historial Resumido de Habitos (Columna + Mapa de Calor) [COMPLETADO]

> **Idea nueva (2025-12-25):** Permitir ver y marcar dias anteriores de habitos.

**Problema a resolver:**
- Si no usas la app por unos dias, no hay forma de marcar los habitos que si hiciste.
- No hay visibilidad rapida del historial reciente del habito.

**Solucion - Columna de historial (7 dias):**
- [x] Componente `HistorialHabito.tsx` creado
- [x] Agregar columna junto a cada habito mostrando los ultimos 7 dias
- [x] Visualizacion tipo "pildoras" o indicadores compactos
- [x] Estados: completado, pospuesto, vacio
- [x] Adaptar visualizacion segun frecuencia del habito (diario, semanal, etc.)
- [x] Solo mostrar dias relevantes segun la frecuencia configurada (con opacidad reducida para no relevantes)

**Solucion - Mapa de calor interactivo en configuracion:**
- [x] Hook `useHabitosHistorial.ts` creado
- [x] En el modal de configuracion del habito, mostrar mapa de calor (MapaCalorHabito.tsx)
- [x] Clickear en dia pasado → marcar como completado
- [x] Click derecho o long-press → marcar como pospuesto
- [x] Limite de dias editables (30 dias implementado en backend)
- [x] Sincronizar cambios con backend

**Utilidades creadas:**
- `esFechaRelevante()` - Determina si una fecha aplica segun frecuencia
- `generarFechasRelevantes()` - Genera array de fechas relevantes

**Bugs corregidos (2025-12-25):**
- [x] Historial no se actualizaba en tiempo real al marcar/desmarcar dias
- [x] Lentitud al marcar dias (esperaba respuesta del servidor antes de mostrar cambio)
- **Solucion:** Implementar actualizacion optimista en `useHabitosHistorial` (marcarDia, desmarcarDia)

**Backend requerido: [COMPLETADO]**
- [x] Tabla BD: `wp_glory_habitos_historial` (id, habito_id, fecha, estado, notas)
- [x] Estados: `completado`, `pospuesto`, `omitido`
- [x] Endpoints: GET historial, POST/PUT marcar dia, DELETE desmarcar
- [x] Validar que solo se marquen fechas pasadas

**Complejidad:** Media | **Dependencias:** Fase 8.1 (rastreo actividad)

### 8.6 Mejoras del Mapa de Calor [COMPLETADO]



- [x] Mapa de calor se actualiza en tiempo real (suscripcion a cambios en actividadStore)
- [x] Datos del heatmap cacheados con TTL de 5 minutos (actividadStore.ts)
- [x] Invalidacion de cache al registrar actividades (invalidarCache, invalidarCacheParcial)
- [x] Panel de actividad ahora se puede arrastrar correctamente (fix: usar configuracionNormalizada)

**Optimizacion de carga del panel [COMPLETADO]:**
- [x] Panel siempre muestra datos anteriores mientras recarga (no desaparece)
- [x] Solo muestra "Cargando actividad..." si no hay datos en absoluto
- [x] Cache persistido en sessionStorage (sobrevive recargas de pagina, TTL 5 min)
- [x] Eliminado indicador visual de recarga (punto pulsante naranja)

**Historial de cumplimiento en Modal [COMPLETADO]:**
- [x] Cache de historial persistido en sessionStorage (TTL 10 min)
- [x] Al abrir modal despues de cargarlo una vez, carga instantaneo
- [x] Hook useHabitosHistorial acepta habitoId inicial para cache

**Mapa de calor en Modal de Habito [CORREGIDO]:**
- [x] Quitar leyenda de colores (cuando enModal=true)
- [x] Quitar estadisticas (cuando enModal=true)
- [x] Agregar tooltip al hacer hover para mostrar la fecha
- [x] **Calculo dinamico de semanas** - Ahora usa ResizeObserver para calcular cuantas semanas
    caben segun el ancho disponible del contenedor (min 4, max 26)
- [x] Las celdas ahora llenan todo el ancho disponible correctamente

**Bug: Fecha usa zona horaria incorrecta [CORREGIDO]:**
> **Solucion final (2025-12-27):**
> - Funcion `obtenerFechaLocalISO()` en utils/fecha.ts evita problemas de UTC
> - `formatearFecha()` en MapaCalor.tsx ahora agrega T12:00:00 al parsear (fix tooltip)
> - `agruparPorSemanas()` en ambos componentes usa T12:00:00
> - El tooltip ahora muestra la fecha correcta
- [x] toISOString() reemplazado por obtenerFechaLocalISO() en todo el proyecto frontend
- [x] Frontend envia fechaHoyLocal correctamente con zona horaria local
- [x] agruparPorSemanas: agregado T12:00:00 para evitar problemas de zona horaria
- [x] **Tooltip del ultimo dia corregido** (agregado T12:00:00 en formatearFecha)

**Bug: Desmarcar habito NO elimina registro de actividad [CORREGIDO]:**
> **Solucion (2025-12-27):**
> - Modificado `registrarActividad()` en ActividadApiController.php
> - Ahora cuando se recibe `habito_desmarcado`, primero elimina el registro de `habito_cumplido`
> - Esto funciona tanto al desmarcar desde el modal como desde el checkbox del panel
- [x] Al desmarcar un dia, el registro de actividad SE BORRA correctamente
- [x] Backend: metodo `eliminarPorHabito()` agregado en ActividadRepository.php
- [x] Backend: se llama desde `desmarcarDiaHabito()` Y desde `registrarActividad()` (tipo desmarcado)

**Bug: Sincronizacion entre panel y modal [CORREGIDO]:**
> **Solucion (2025-12-27):**
> - Modificado `actividadService.ts` para emitir `notificarCambioHabito()` al historialHabitosStore
> - Ahora cuando se marca/desmarca desde el checkbox del panel, el modal se actualiza automaticamente
> - El MapaCalorHabito se suscribe a estos cambios y recarga cuando detecta modificaciones
- [x] Codigo: se bloquean clicks mientras cargando=true en MapaCalorHabito
- [x] Modal de habito se sincroniza con cambios hechos DENTRO del modal
- [x] **Marcar habito desde checkbox del panel AHORA actualiza el historial de cumplimiento**
- [x] El flujo del checkbox ahora emite `notificarCambioHabito()` via actividadService
- [x] **Cache de historial implementado** - historialHabitosStore.ts ahora cachea el historial
- [x] **Backend sincronizado** - POST /actividad con habito_cumplido ahora inserta en wp_glory_habitos_historial
- [x] **Actualizacion optimista** - actualizarFechaEnCache() actualiza el cache local inmediatamente

**Bug: "Cargando actividad" aparece innecesariamente [CORREGIDO]:**
> **Solucion (2025-12-27):**
> - Modificado PanelActividad.tsx: ahora usa `estado.cargaInicial` en lugar de `estado.cargando`
> - Solo muestra "Cargando actividad..." en la primera carga sin datos previos
> - Al recargar en segundo plano, mantiene los datos anteriores visibles

**Bug: Dias de semana desalineados en MapaCalorHabito [CORREGIDO]:**
> **Solucion (2025-12-27):**
> - Eliminado override de tamano de celdas en modo modal (16px -> 14px consistente)
> - Agregado min-height a los dias de semana para alineacion correcta
> - Los indicadores L, X, V ahora se alinean correctamente con las celdas

**Herramientas de desarrollo (para Modal Experimentos):**
- [x] Boton para limpiar toda la actividad del usuario (solo admin)

**Opcion de estadisticas [ELIMINADA]:**
- [x] Eliminada opcion "Mostrar estadisticas" del modal de configuracion (no funcionaba)
- [x] Se mantiene mostrarEstadisticas en config local pero no tiene efecto

**Bug: Dias no relevantes no se muestran correctamente [CORREGIDO]:**
> **Solución (2025-12-27):**
> - Implementada lógica dinámica que calcula días libres basándose en los días MARCADOS en el historial
> - Para `diasEspecificos`: verifica si el día de la semana está en la lista
> - Para `cadaXDias`, `semanal`, `mensual`: busca el día completado más cercano anterior
>   y marca como "libre" los días dentro del intervalo
> - Estilo cambiado de patrón rayado a verde con opacidad baja (rgba(34, 197, 94, 0.15))
- [x] `esFechaRelevante()` se usa para diasEspecificos, lógica dinámica para otros tipos
- [x] Los días no relevantes vacíos se muestran en verde con opacidad baja
- [x] Los días no relevantes completados se muestran en verde con opacidad

**Bug: Cambiar estado requiere multiples clicks [CORREGIDO]:**
> **Solución (2025-12-27):**
> - Implementado estado local `historialLocal` en MapaCalorHabito.tsx para actualizaciones inmediatas
> - Cambiado `manejarClick` a fire-and-forget (sin `await`) para no bloquear
> - Reemplazado flag global `guardando` por bloqueo por fecha individual (Set)
> - Modificadas funciones `marcarDia`/`desmarcarDia` en useHabitosHistorial.ts para no recrear
>   callbacks innecesariamente (removido `estado.historial` de dependencias de useCallback)
- [x] Revisar lógica de ciclo de estados en `manejarClick`
- [x] Verificar si hay condiciones de bloqueo o race conditions

---

## Fase 9: Scratchpad con Guardado + File Manager [BAJA PRIORIDAD]

**Objetivo:** Permitir guardar notas del Scratchpad y crear un gestor de archivos tipo Google Drive.

> **Nota:** Esta fase tiene baja prioridad. Se implementará después de las funcionalidades principales.

### 9.1 Scratchpad - Sistema de Guardado

- [ ] Agregar botón badge "Guardar nota" al Scratchpad
- [ ] Al guardar: la nota se almacena con título (primeras palabras o input) y fecha
- [ ] Agregar botón badge "Archivo" para ver notas guardadas
- [ ] Las notas guardadas se pueden reabrir en el Scratchpad
- [ ] Preview markdown en notas guardadas

### 9.2 File Manager (Drive Glory)

> **Estructura:** Crear carpeta `components/fileManager/` para mantener organizado

**Diseño visual:**
- Estilo similar a explorador de archivos de Windows
- Panel lateral con carpetas
- Vista principal con archivos en grid/lista
- Mantener línea visual minimalista del dashboard

**Estructura de carpetas:**

```
📁 Mis Archivos
  📁 Notas (notas guardadas del Scratchpad)
  📁 Imágenes (adjuntos de tipo imagen)
  📁 Documentos (otros adjuntos)
  📁 Por Proyecto
    📁 [Nombre Proyecto 1]
    📁 [Nombre Proyecto 2]
  📁 Por Tarea
    📁 [Nombre Tarea 1]
    📁 [Nombre Tarea 2]
```

### 9.3 Funcionalidades del File Manager

**Básicas:**
- [ ] Ver todos los archivos del usuario
- [ ] Navegación por carpetas
- [ ] Agrupación automática por proyecto/tarea
- [ ] Agrupación configurable (por tipo, por fecha, por proyecto)
- [ ] Preview de archivos (imágenes, notas)
- [ ] Descargar archivos (drag & drop hacia escritorio)

**Avanzadas:**
- [ ] Subir archivos directamente al Drive (sin asociar a tarea)
- [ ] Crear carpetas personalizadas
- [ ] Mover archivos entre carpetas
- [ ] Arrastrar y soltar archivos
- [ ] Búsqueda por nombre

### 9.4 Estructura de Componentes

```
components/fileManager/
  FileManager.tsx           (componente principal)
  BarraLateral.tsx          (panel de carpetas)
  VistaArchivos.tsx         (grid/lista de archivos)
  ItemArchivo.tsx           (archivo individual)
  ItemCarpeta.tsx           (carpeta individual)
  BarraHerramientas.tsx     (acciones: subir, crear carpeta, etc)
  ModalPreview.tsx          (preview de archivos)
  hooks/
    useFileManager.ts       (estado y lógica)
  types/
    fileManager.ts          (tipos)
styles/
  fileManager.css           (estilos)
```

### 9.5 Backend

- [ ] Tabla BD: `wp_glory_notas` (id, user_id, titulo, contenido, fecha_creacion, fecha_modificacion)
- [ ] Tabla BD: `wp_glory_carpetas` (id, user_id, nombre, padre_id, tipo)
- [ ] Endpoints API para notas (CRUD)
- [ ] Endpoint para listar archivos agrupados

**Complejidad:** Alta | **Dependencias:** Fase 1.5 (archivos físicos)

---

## Fase 10: Compartir Hábitos [BAJA PRIORIDAD]

**Objetivo:** Motivación social al compartir hábitos con compañeros.

> **Nota:** Esta fase tiene baja prioridad. No es crítica para el MVP.

### 10.1 Modelo de Hábitos Compartidos
> Cada persona tiene su propia instancia. Racha y cumplimiento son individuales.
> Solo comparten "el mismo hábito" para verse mutuamente.

- [ ] Tabla BD: `wp_glory_habitos_compartidos` (habito_id, usuario_origen, usuario_destino)
- [ ] Al compartir: se crea copia del hábito en cuenta del compañero
- [ ] Campo `habito_origen_id` para vincular ambas instancias
- [ ] Cada usuario cumple su hábito independientemente

### 10.2 UI de Hábitos Compartidos
- [ ] Opción en menú contextual: "Compartir hábito"
- [ ] Indicador visual: "Compartido con [Nombre]"
- [ ] Ver cuándo el compañero cumplió (badge o indicador)
- [ ] Notificación: "[Nombre] cumplió [Hábito] hoy"

### 10.3 Sincronización de Estado
- [ ] Endpoint para consultar estado de hábito del compañero
- [ ] Cache local para no sobrecargar
- [ ] Actualización periódica o al abrir panel

**Complejidad:** Media | **Dependencias:** Fase 2 (equipos), Fase 3 (notificaciones)

---

## Fase 11: Futuro (Post v1.1.0)

---

### 11.1 Correo de Invitación
- [ ] Enviar email cuando se invita a usuario no registrado
- [ ] Template de correo personalizado
- [ ] Link de registro con solicitud pre-aceptada

### 11.2 Notificaciones por Correo
- [ ] Preferencias de notificación por email
- [ ] Resumen diario/semanal
- [ ] Alertas de tareas por vencer
- [ ] Alerta de racha en peligro

### 11.3 Feed de Red Social
- [ ] Posts automáticos de logros
- [ ] Posts manuales
- [ ] Likes y comentarios
- [ ] Privacidad configurable

### 11.4 Gamificación
- [ ] Badges de logros
- [ ] Sistema de niveles/experiencia
- [ ] Leaderboards semanales

---

## 📋 Resumen de Fases

| Fase | Nombre                         | Complejidad | Estado         |
| ---- | ------------------------------ | ----------- | -------------- |
| 0    | Preparación (Alertas + Header) | Baja-Media  | ✅ Completada   |
| 1    | Almacenamiento                 | Media       | ✅ Completada   |
| 1.5  | Archivos Físicos + Cifrado     | Alta        | ✅ Completada   |
| 2    | Sistema de Equipos             | Alta        | ✅ Completada   |
| 3    | Notificaciones                 | Alta        | ✅ Completada   |
| 4    | Compartir Tareas/Proyectos     | Muy Alta    | ✅ Completada   |
| 5    | Sistema de Urgencia            | Media       | ✅ Completada   |
| 6    | Mejoras UX Rápidas             | Baja        | ✅ Completada   |
| 6.5  | Refact. Formularios            | Media       | ✅ Completada   |
| 6.6  | Hábitos en Ejecución           | Media       | ✅ Completada   |
| 7    | **Modal Chat + Historial**     | Muy Alta    | ✅ Completada   |
| 7.5  | **Correcciones UX + Resize**   | Media       | ✅ Completada   |
| 7.6  | **Mejoras Habitos + Bugs**     | Alta        | ✅ Completada   |
| 8    | Mapa de Calor + historial      | Media-Alta  | ✅ Completada   |
| 9    | Scratchpad + File Manager      | Alta        | Baja Prioridad |
| 10   | Compartir Hábitos              | Media       | Baja Prioridad |
| 11   | Futuro                         | Variable    | Pendiente      |

---

## Estructura de Archivos Actual

<details>
<summary>Ver estructura completa</summary>

```
App/React/
  types/dashboard.ts
  utils/
    index.ts, fecha.ts, validadores.ts, migracionHabitos.ts,
    frecuenciaHabitos.ts, jerarquiaTareas.ts
  data/datosIniciales.ts
  hooks/
    useDashboard.ts, useTareas.ts, useProyectos.ts, useDeshacer.ts,
    useOrdenarHabitos.ts, useLocalStorage.ts, useDebounce.ts,
    useDashboardApi.ts, useSincronizacion.ts, useSuscripcion.ts,
    useCifrado.ts, useStripe.ts, useAdministracion.ts
  components/shared/
    MenuContextual.tsx, Modal.tsx, AccionesFormulario.tsx,
    SelectorNivel.tsx, SeccionPanel.tsx, ToggleSwitch.tsx,
    SelectorDias.tsx, BadgeInfo.tsx, AccionesItem.tsx,
    CampoTexto.tsx, CampoPrioridad.tsx, CampoFechaLimite.tsx,
    IndicadorSincronizacion.tsx, IndicadorPlan.tsx, ModalUpgrade.tsx
  components/dashboard/
    SelectorFrecuencia.tsx, FormularioHabito.tsx, TablaHabitos.tsx,
    ListaTareas.tsx, TareaItem.tsx, PanelConfiguracionTarea.tsx,
    PanelSeguridad.tsx, FormularioProyecto.tsx, ListaProyectos.tsx
  components/admin/
    PanelAdministracion.tsx, ListaUsuarios.tsx, FiltrosUsuarios.tsx,
    FilaUsuario.tsx, ResumenAdmin.tsx, DetalleUsuario.tsx
```

```
App/React/styles/dashboard/
  index.css, variables.css, animaciones.css, base.css
  shared/
    accionesFormulario.css, selectorNivel.css, seccionPanel.css,
    toggleSwitch.css, dashboardPanel.css, badgeInfo.css,
    accionesItem.css, campoFechaLimite.css, indicadorSincronizacion.css,
    suscripcion.css, panelSeguridad.css
  componentes/
    encabezado.css, tabla.css, tareas.css, scratchpad.css,
    formulario.css, toast.css, ordenamiento.css,
    menuContextual.css, frecuencia.css, panelConfiguracion.css,
    panelAdministracion.css, detalleUsuario.css
  utilidades/
    estados.css, acciones.css
```

```
App/Api/
  DashboardApiController.php, AdminApiController.php,
  StripeWebhookHandler.php
App/Services/
  CifradoService.php, SuscripcionService.php, AdminService.php
App/Repository/
  DashboardRepository.php
```

</details>

---

## Configuración Requerida

```php
/* wp-config.php */
define('GLORY_STRIPE_SECRET_KEY', 'sk_live_...');
define('GLORY_STRIPE_PUBLISHABLE_KEY', 'pk_live_...');
define('GLORY_STRIPE_WEBHOOK_SECRET', 'whsec_...');
define('GLORY_STRIPE_PRICE_MONTHLY', 'price_...');
define('GLORY_STRIPE_PRICE_YEARLY', 'price_...');
```

---

## Contacto y Documentación

- `Glory/assets/react/Docs/react-glory.md` - Documentación del sistema
- `App/React/components/` - Componentes existentes
- `App/React/styles/dashboard/` - Sistema de diseño modular

---

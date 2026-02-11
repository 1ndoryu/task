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

**Versión:** v1.0.25-beta (2026-02-09)
**Foco:** Sprint Correcciones Críticas + Time Tracker + Sistema de Plugins

---

# TAREAS PENDIENTES - SPRINT ACTUAL

## 🔴 PRIORIDAD CRÍTICA - Bugs Graves

### TAREA 1: Bug de sesión - Datos cruzados al cambiar de cuenta

**Estado:** ✅ Completada | **Prioridad:** Crítica | **Tipo:** Bug Grave

**Descripción:** Al cambiar de sesión (logout + login con otra cuenta) y luego volver a la sesión anterior, se cargan los datos de la cuenta a la que se accedió primero. Los datos se cruzan entre sesiones.

**Hipótesis de causa:**

- Cache en `localStorage` no se limpia al cerrar sesión
- Los stores de Zustand mantienen datos en memoria del usuario anterior
- `useSincronizacion.ts` puede estar usando datos cacheados del usuario anterior

**Requisitos:**

1. Al hacer logout, limpiar completamente: localStorage, stores Zustand, cache de sync
2. Al hacer login con otro usuario, verificar que los datos cargados corresponden al userId correcto
3. Validar que `sincronizarAhora()` siempre usa el userId actual, no uno cacheado

**Archivos a revisar:**

- `hooks/useSincronizacion.ts` (cache localStorage con `SyncMeta`)
- `stores/` (todos los stores - verificar si se resetean al logout)
- Componente de autenticación (función de logout)
- `hooks/useSincronizacionTiempoReal.ts` (userId en WebSocket)

---

### TAREA 2: Sincronización pierde conexión silenciosamente

**Estado:** ✅ Completada | **Prioridad:** Crítica | **Tipo:** Bug

**Descripción:** Dos problemas relacionados con la sincronización en tiempo real:

**Problema 2A - WebSocket se desconecta silenciosamente:**

- Si la app (móvil o escritorio) permanece abierta sin interacción, la sincronización deja de funcionar
- Al volver a interactuar con la app, los datos no se reconectan automáticamente
- Solo funciona de nuevo al recargar la página o cerrar/abrir la app
- Hipótesis: el WebSocket se desconecta por inactividad y no se reconecta

**Problema 2B - Datos no se actualizan por cambio de día:**

- Si un día pasa (ej: se deja la app abierta de noche a mañana), la lista de tareas/hábitos no refleja los cambios del nuevo día
- Hábitos que tocan hoy no aparecen hasta recargar
- Los hábitos diarios que cambian por frecuencia no se recalculan

**Requisitos:**

1. Implementar reconexión automática del WebSocket con backoff exponencial
2. Al detectar interacción del usuario (click, scroll, focus), verificar si la conexión WS está viva
3. Si la conexión se perdió, reconectar y forzar una sincronización HTTP completa
4. Detectar cambio de día (comparar fecha actual vs última fecha conocida) y recalcular listas
5. Al volver a tener foco en la ventana/app, refrescar datos si han pasado más de X minutos

**Archivos a revisar:**

- `hooks/useSincronizacionTiempoReal.ts` (reconexión WS, `CONFIG_SYNC_RT.maxInactividadMs`)
- `hooks/useSincronizacion.ts` (sync HTTP de respaldo)
- `DashboardIsland.tsx` o equivalente (detección de foco/visibilidad)

---

### TAREA 3: Badge "muy_alta" en proyectos + Ordenamiento incorrecto

**Estado:** ✅ Completada | **Prioridad:** Alta | **Tipo:** Bug UI

**Descripción:** Dos sub-bugs en el panel de proyectos:

**Bug 3A - Texto sin formatear:**

- Los badges de prioridad en los proyectos muestran "muy_alta" en vez de "MUY ALTA" con color rojo
- Probablemente no se usa `obtenerTextoPrioridad()` al renderizar badges en el panel de proyectos

**Bug 3B - Ordenamiento ignora "Muy Alta":**

- Al ordenar proyectos por prioridad, "Alta" aparece por encima de "Muy Alta"
- El algoritmo de ordenamiento no reconoce "muy_alta" como nivel superior a "alta"
- Posiblemente el mapeo de prioridades a valores numéricos no incluye "muy_alta"

**Requisitos:**

1. Usar `obtenerTextoPrioridad()` para los badges de proyectos
2. El badge de "MUY ALTA" debe mostrarse con estilo rojo/danger
3. Revisar el array/mapa de ordenamiento de prioridades para incluir "muy_alta" como el nivel más alto

**Archivos a revisar:**

- `components/paneles/PanelProyectos.tsx` (renderizado de badges)
- Función/utilidad que ordena proyectos por prioridad
- `utils/` (función `obtenerTextoPrioridad` y mapeo de prioridades a valores numéricos)

---

### TAREA 4: Eliminar fecha de tarea no se refleja al cerrar modal

**Estado:** ✅ Completada | **Prioridad:** Alta | **Tipo:** Bug

**Descripción:** Al abrir el modal de configuración moderna de una tarea, eliminar su fecha límite y cerrar el modal, la fecha no se elimina realmente. Al volver a abrir, la fecha sigue estando.

**Hipótesis de causa:**

- El handler `manejarGuardar` no envía `fechaMaxima: null` cuando se limpia la fecha
- `editarTarea` en `useTareas.ts` no procesa la eliminación de `fechaMaxima` correctamente
- Posible bug relacionado con el Bug 3B resuelto anteriormente (delete selectivo incompleto)

**Requisitos:**

1. Al limpiar la fecha en el modal, enviar `fechaMaxima: null` explícitamente
2. `editarTarea` debe eliminar el campo cuando recibe `null`
3. Verificar que el cambio se persiste en backend

**Archivos a revisar:**

- `components/dashboard/PanelConfiguracionTarea.tsx` (handler de guardar)
- `hooks/useTareas.ts` (función `editarTarea`)

---

### TAREA 5: Cálculo de prioridad dinámica - Días libres se cuentan incorrectamente

**Estado:** ✅ Completada | **Prioridad:** Alta | **Tipo:** Bug Algoritmo

**Descripción:** El algoritmo que incrementa la prioridad de un hábito por cada día sin cumplirse cuenta los días libres (días donde el hábito no debía realizarse) como si fueran días incumplidos.

**Ejemplo concreto:**

- Hábito A: frecuencia cada 3 días, prioridad Media, toca hoy
- Hábito B: frecuencia cada 7 días, prioridad Baja, toca hoy
- Resultado actual: B aparece arriba de A (incorrecto)
- Resultado esperado: A debería estar arriba (Media > Baja)
- Causa: B tiene 7 días desde último cumplimiento (incluyendo 6 días libres), lo que infla su urgencia

**Requisitos:**

1. Al calcular "días sin cumplir", excluir los días donde el hábito NO debía realizarse según su frecuencia
2. Solo contar días que eran días válidos para el hábito pero no se cumplió
3. Ejemplo: Si la frecuencia es "cada 7 días" y el hábito toca hoy, los 6 días intermedios son libres y no deben sumar urgencia

**Archivos a revisar:**

- `utils/fecha.ts` (funciones `calcularDiasDesde`, `calcularUrgenciaFechaLimite` o similar)
- Función que calcula el score dinámico de prioridad de un hábito
- Lógica que determina qué días son "relevantes" vs "libres" según frecuencia

---

### TAREA 6: Posponer hábito permite registros dobles

**Estado:** ✅ Completada | **Prioridad:** Alta | **Tipo:** Bug

**Descripción:** Al hacer clic derecho en un hábito y seleccionar "Posponer hoy", el menú contextual no se actualiza después de la acción. Si se vuelve a dar clic derecho, sigue mostrando "Posponer hoy" y permite posponer múltiples veces, generando registros dobles en el historial.

**Requisitos:**

1. Después de posponer un hábito, el menú contextual debe reflejar "Ya pospuesto" o cambiar la opción
2. Esto debe funcionar tanto en el panel de hábitos como en el panel de ejecución
3. No hacer la restricción "hard" (sin bloqueo absoluto) porque en el futuro habrá tareas/hábitos repetibles en el mismo día
4. Mostrar el panel de actividad del día para que el usuario vea que ya se registró y no duplique por error
5. Si ya se posponió, la opción debería cambiar a "Deshacer posposición" o similar

**Archivos a revisar:**

- `config/opcionesMenuHabito.tsx` (opciones dinámicas del menú)
- `stores/menuContextualStore.ts` (estado del menú)
- `components/dashboard/TablaHabitos.tsx` (handler de menú contextual)
- `components/paneles/PanelEjecucion.tsx` (mismo menú en ejecución)

---

## ⬜ BACKLOG - TAREAS PREVIAS PENDIENTES

### Modal central de configuración

**Estado:** ⬜ Pendiente | **Prioridad:** Muy Baja | **Tipo:** Refactor/Feature

**Descripción:** Centralizar todas las configuraciones de paneles en un modal único.
**Nota del usuario:** Esto NO es prioritario.

---

# TAREAS DE INNOVACIÓN - SPRINT SIGUIENTE

**Requisito previo obligatorio:** Antes de implementar estas features, evaluar si la arquitectura actual es óptima para incorporarlas. Si existen violaciones SOLID o se requieren refactorizaciones, hacerlas PRIMERO.

## 🟣 FEATURE A: Time Tracker (Botón Play en Panel de Ejecución)

### A.1: Preparación SOLID - Evaluar arquitectura para Time Tracker

**Estado:** ✅ Completada | **Prioridad:** Alta | **Tipo:** Análisis/Refactor

**Descripción:** Antes de implementar el time tracker, evaluar:

- ¿`PanelEjecucion.tsx` puede recibir un callback `onIniciarTarea` sin romper ISP?
- ¿Los tipos `Tarea` y `Habito` permiten extenderse con `tiempoMinimo` y registros de tiempo sin modificar contratos existentes?
- ¿Se necesita un nuevo store para el estado del tracker o puede vivir en un hook independiente?
- ¿El componente de barra inferior (dock/tracker) es compatible con el layout actual (móvil y escritorio)?

**Salida:** Documento de decisiones técnicas o TO-DOs en código.

---

### A.2: Botón Play en ítems del panel de ejecución

**Estado:** ✅ Completada | **Prioridad:** Media | **Tipo:** Feature
**Depende de:** A.1

**Descripción:** En el panel de ejecución, junto a los botones de acción de cada hábito/tarea, agregar un botón de "Play" (triangulo). Al presionarlo, la tarea/hábito inicia su tracking de tiempo.

**Requisitos:**

1. Icono de play junto a las acciones existentes (completar, posponer, etc.)
2. Al dar play, abre el "Dock de Tracking" en la parte inferior de la pantalla
3. Solo una tarea/hábito puede estar en tracking a la vez
4. Si se intenta iniciar otra tarea mientras una está activa, preguntar si pausar la actual

---

### A.3: Dock de Tracking (barra inferior)

**Estado:** ✅ Completada | **Prioridad:** Media | **Tipo:** Feature
**Depende de:** A.2

**Descripción:** Un componente tipo "dock" fijo en la parte inferior de la pantalla (no es un modal, es una barra compacta de poca altura y ancho completo). Muestra:

- Nombre de la tarea/hábito en tracking
- Tiempo transcurrido (formato `MM:SS` o `HH:MM:SS`)
- Si la tarea tiene `tiempoMinimo`, mostrar progreso: `01:00/20:00`
- Estado: "En progreso" / "Completado" (cuando alcanza el tiempo mínimo)
- Botones: Pausar, Reanudar, Cancelar, Completar

**Requisitos:**

1. Debe ser responsivo (se adapta a móvil y escritorio)
2. **En móvil:** debe convivir con `NavegacionInferior` sin superponerse (posicionar encima de la barra de navegación)
3. No debe tapar contenido importante (agregar padding-bottom al dashboard cuando esté activo)
4. El timer debe seguir corriendo aunque se navegue entre paneles
5. Persistir el estado del timer en caso de recarga accidental (localStorage)

---

### A.4: Registros de tiempo en tareas y hábitos

**Estado:** ✅ Completada | **Prioridad:** Media | **Tipo:** Feature
**Depende de:** A.3

**Descripción:** Extender los tipos de tarea y hábito para soportar:

- `tiempoMinimo` (opcional): tiempo mínimo esperado para completar (en minutos)
- Historial de sesiones de tracking: `{inicio: Date, fin: Date, pausas: Date[]}`
- Las tareas pueden completarse sin necesidad de trackear (el tracking es opcional)

**Requisitos:**

1. En el panel de actividad, registrar `horaInicio` y `horaFin` de la sesión
2. En el modal de configuración de tarea/hábito, permitir configurar `tiempoMinimo`
3. El tracker debe funcionar independientemente de si se configura un tiempo mínimo

---

## 🟣 FEATURE B: Sistema de Plugins

### B.1: Preparación SOLID - Arquitectura de Plugins

**Estado:** ✅ Completada | **Prioridad:** Alta | **Tipo:** Análisis/Refactor

**Descripción:** Diseñar e implementar la infraestructura de plugins que permita:

- Activar/desactivar paneles opcionales desde un modal de "Plugins"
- Los plugins registran nuevos paneles usando `registrarPanel()` del `registroPaneles.ts` existente
- Los paneles de plugins se gestionan igual que los actuales: se mueven, se configuran en "Configuración de Layout", se minimizan, etc.
- La activación/desactivación se persiste en la configuración del usuario

**Requisitos técnicos:**

1. Crear tipo `DefinicionPlugin` que extienda la arquitectura actual:
    ```
    { id, nombre, descripcion, icono, paneles: DefinicionPanel[], habitos?: ConfigHabitoPlugin[], activo: boolean }
    ```
2. Crear `registroPlugins.ts` similar a `registroPaneles.ts`
3. Modal de Plugins accesible desde el menú de usuario (toggle activar/desactivar)
4. Al activar un plugin: registrar sus paneles, crear hábito asociado si aplica
5. Al desactivar: ocultar paneles, pausar hábito asociado (no eliminar datos)
6. Los plugins que son "hábitos con panel especializado" deben integrarse en el panel de hábitos y ejecución

**Archivos clave:**

- `config/registroPaneles.ts` (ya soporta registro dinámico, base para plugins)
- `config/inicializarPaneles.ts` (diferenciar paneles core vs plugins)
- `stores/configuracionUsuarioStore.ts` (persistir plugins activos)
- `utils/opcionesMenuUsuario.tsx` (agregar entrada "Plugins")

---

### B.2: Plugin de Ayuno

**Estado:** ✅ Completada | **Prioridad:** Media | **Tipo:** Feature/Plugin
**Depende de:** B.1

**Descripción:** Plugin que introduce un panel especializado de ayuno intermitente. El ayuno es esencialmente un hábito con un panel visual dedicado. Está desactivado por defecto.

**Panel visual:**

- Círculo central con temporizador
- El centro del círculo alterna entre 3 estados:
    - "Último ayuno: Xh Xm" (cuando no hay ayuno activo)
    - "Tiempo transcurrido: Xh Xm" (durante un ayuno activo)
    - "Próximo ayuno en: Xh Xm" (según frecuencia configurada)
- Botones: "Comenzar ayuno", "Terminar ayuno", "Reiniciar ayuno" (para cuando un ayuno se dejó activo por error/días)
- **Reiniciar ayuno:** descarta el ayuno sin registrarlo en el historial, simplemente pone el contador en 0
- Diseño minimalista, coherente con el estilo terminal del dashboard

**Integración como hábito:**

- Al activar el plugin, se crea un hábito de tipo "ayuno" automáticamente
- Aparece en el panel de hábitos y en el panel de ejecución
- Se puede posponer, pausar, etc. como cualquier hábito
- El historial del hábito alimenta el panel visual

**Configuración del panel:**

- Tiempo de ayuno: 14h, 16h, 18h, 20h, Personalizado
- Frecuencia: Diaria, Semanal, Ciertos días (misma UI que configuración de hábitos)
- Importancia del hábito generado (Baja, Media, Alta, Muy Alta)

---

### B.3: Plugin de Déficit Calórico

**Estado:** ✅ Completada | **Prioridad:** Media | **Tipo:** Feature/Plugin
**Depende de:** B.1

**Descripción:** Plugin que introduce un panel para registro y cálculo de déficit calórico usando IA de Google (Gemini). Estilo minimalista. Es un hábito con panel especializado.

**Funcionamiento:**

- El usuario registra comidas mediante:
    - **Foto directa** desde cámara o galería (la IA analiza y estima calorías). Usar `<input type="file" accept="image/*" capture>` para máxima facilidad
    - Descripción en texto como alternativa (la IA calcula calorías aproximadas)
- Se calcula la TMB (Tasa Metabólica Basal) con los datos del usuario
- Se muestra: Calorías consumidas hoy vs TMB estimada = Déficit/Superávit

**Panel visual:**

- Resumen del día: calorías consumidas / TMB estimada
- Indicador visual de déficit/superávit
- Lista de comidas registradas hoy con calorías estimadas
- Histórico simple (últimos 7 días)

**Configuración del panel (datos del usuario para TMB):**

- El usuario introduce los datos que tenga disponibles (mínimo 2-3):
    - Altura (cm)
    - Peso (kg)
    - Medida de cintura (cm)
    - Edad
    - Sexo
    - Ejercicio semanal promedio (sesiones + minutos)
- Usar fórmulas adaptativas: Mifflin-St Jeor si hay peso+altura+edad+sexo, o estimaciones alternativas con cintura+altura
- API Key de Google (Gemini) configurada por el usuario

**Requisitos técnicos IA:**

1. Las solicitudes a la API deben ser inteligentes con fallback:
    - Intentar primero con el modelo más capaz (ej: gemini-1.5-pro)
    - Si falla (cuota agotada, error), bajar al siguiente (gemini-1.5-flash)
    - Seguir bajando hasta encontrar uno disponible
2. Cachear resultados para no repetir análisis de la misma foto
3. Manejar errores de red gracefully (mostrar "Sin conexión a IA")

**Integración como hábito:**

- Al activar, se crea un hábito "Registrar alimentación"
- Frecuencia configurable (diaria por defecto)
- Se completa automáticamente cuando se registran X comidas del día

---

# HISTORIAL DE TAREAS COMPLETADAS

## Sprint v1.0.24-beta (2026-02-07)

### Revisiones resueltas:

- ✅ Fecha de vencimiento "hoy" ya no muestra "Vencido (1)" (fix timezone local)
- ✅ Notas aparecen en móvil (width/height 100% en PullToRefresh)
- ✅ Error "passive event listener" en pull-to-refresh
- ✅ Indicador azul de sincronización eliminado del móvil
- ✅ Variables de badge redundantes eliminadas
- ✅ Duplicación de "General" en menú contextual de notas + botón 3 puntos
- ✅ Contador de notas en carpetas se refresca correctamente
- ✅ Panel de creación rápida en tema claro (variable `--dashboard-fondoCristal`)

### Tareas completadas:

- ✅ **T1** Conflictos de sincronización LWW con timestamps
- ✅ **T2** Hábitos duplicados en panel de ejecución (deduplicación)
- ✅ **T3** Editar tarea no guarda cambios + Fecha muestra expirada (timezone + delete selectivo)
- ✅ **T4** Sincronización de notas en tiempo real
- ✅ **T5** Notas no se mueven de carpeta en tiempo real
- ✅ **T6** Pérdida de cambios al cerrar modal de notas (auto-guardado)
- ✅ **T7** Menú contextual hábitos - opción duplicada eliminada
- ✅ **T8** Paleta de colores modo claro en popup tareas
- ✅ **T9** Texto "Prioridad muy_alta" formateado
- ✅ **T10** Pull-to-refresh en versión móvil
- ✅ **T11** Indicador de estado de conexión en móvil
- ✅ **T12** Notificaciones Push locales recurrentes

## Sprint Anterior (v1.0.23-beta)

- ✅ Back no funciona en APK (hook `useBackButtonCapacitor.ts`)
- ✅ Hora incorrecta en panel de actividades (parámetro `horaLocal`)
- ✅ Hábito no aparece el día correcto según frecuencia (bug off-by-one)
- ✅ Subtareas en móvil no parecen subtareas (padding-left móvil)
- ✅ Interacción de hábitos/tareas en panel de ejecución (BottomSheet)
- ✅ Modo compacto - Mejoras en hábitos (margin, swipe posponer)
- ✅ Ranking de tareas por días de vencimiento (ya implementado)
- ✅ Notificaciones locales en APK (hook `useNotificacionesLocales.ts`)
- ✅ Sincronización WebSocket entre dispositivos (SSL configurado)
- ✅ Modo Offline con IndexedDB (useModoOffline.ts, IndicadorConexion.tsx)

---

# ARCHIVO DE FASES ANTERIORES (POSPUESTA)

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
- **WebSocket:** `useSincronizacionTiempoReal.ts`, `useSincronizacion.ts`
- **Paneles:** `config/registroPaneles.ts`, `config/inicializarPaneles.ts`
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

> Roadmap actualizado con nuevas tareas v2. Changelog v1.0.24-beta agregado.
>
> **Sprint completo finalizado:**
> - Tareas 1-6 (bugs críticos): todas resueltas
> - Feature A (Time Tracker): tipos, store, hook, DockTracking, integración en menús de tareas/hábitos
> - Feature B.1 (Arquitectura de Plugins): registroPlugins, pluginsStore, ModalPlugins con toggle + config, wiring completo en encabezados
> - Feature B.2 (Plugin Ayuno): tipos, ayunoStore, useAyuno hook, PanelAyuno con temporizador circular, selector de duración, historial compacto
> - Feature B.3 (Plugin Déficit Calórico): tipos, deficitCaloricoStore, useDeficitCalorico hook, geminiCaloriasService (cadena fallback modelos), calculoTMB (Mifflin-St Jeor + alternativa), PanelDeficitCalorico con input texto/foto, ConfigDeficitCalorico con formulario de datos personales y API Key
> - Fix: paneles de plugins ahora renderizan al activar (generadores de props en DashboardGrid)
> - Fix: loop de renders en PanelAyuno (useAyuno con dependencias estables)

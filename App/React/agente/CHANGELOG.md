# Changelog - Dashboard de Productividad Personal

Registro de cambios significativos del proyecto.

---

## [1.0.17-beta] - 2026-01-31

### Fase 15.10: Tercera Revisión Beta - Correcciones UX

#### ✅ Mejoras en Paneles
- **Botón +Añadir en proyectos**: Ahora puedes crear proyectos rápidamente desde el panel
- **Estado vacío en tareas**: Mensaje amigable cuando no tienes tareas pendientes
- **Nota de bienvenida visible**: La nota informativa ahora aparece al registrarte

#### ✅ Correcciones Visuales
- **Trial 30 días**: El modal de upgrade ahora muestra correctamente 30 días de prueba
- **Alineación en notas**: Corregido el desface visual entre texto editable y preview

#### ✅ Exportación/Importación Mejorada
- **Historial completo**: Ahora se incluye el historial de cumplimiento de hábitos y tareas
- **Versión 1.1.0**: Formato de exportación actualizado con más campos

#### ✅ Experiencia de Usuario
- **Changelog legible**: Descripciones en lenguaje natural, fáciles de entender
- **Actividad limpia**: Eliminados mensajes confusos de "admin" en tareas de bienvenida

**Archivos modificados:**
- `ListaProyectos.tsx`, `proyectos.css`: Botón añadir
- `ListaTareas.tsx`: Estado vacío
- `notasStore.ts`: Nota inicial
- `ModalUpgrade.tsx`: Trial 30 días
- `scratchpad.css`: Overflow fix
- `services/dataService.ts`: Validación historial v1.1.0
- `data/changelog.ts`: Lenguaje natural
- `hooks/useMensajes.ts`: Filtro mensajes admin

---

## [1.0.16-beta] - 2026-01-30

### Fase 15.9: Segunda Revisión Beta Nakomi

#### ✅ Mejoras de UX para Nuevos Usuarios
- **Datos iniciales mejorados**: 3 tareas de bienvenida genéricas en lugar de inicio vacío
- **Nota de bienvenida**: Nota en Markdown explicando la beta y sus beneficios
- **Orden inteligente por defecto**: Cambiado de 'manual' a 'inteligente' en tareas
- **Hábitos en Ejecución**: Activado por defecto para mostrar hábitos que tocan hoy
- **Vista no compacta**: Hábitos en modo expandido por defecto (mejor onboarding)
- **Columna Actividad (5 días)**: Visible por defecto en configuración de hábitos
- **Panel de Actividad**: Visible por defecto para nuevos usuarios

**Archivos modificados:**
- `data/datosIniciales.ts`: Tareas y nota de bienvenida
- `hooks/useOrdenarTareas.ts`: `valorPorDefecto: 'inteligente'`
- `hooks/useConfiguracionTareas.ts`: `mostrarHabitosEnEjecucion: true`
- `hooks/useConfiguracionHabitos.ts`: `modoCompacto: false`, `historial: true`
- `config/inicializarPaneles.ts`: Panel Actividad `visiblePorDefecto: true`

#### ✅ Ajustes de Plan y Almacenamiento
- **Trial extendido**: 14 días → 30 días de prueba gratuita
- **Almacenamiento FREE**: 50MB → 1GB de almacenamiento máximo

**Archivos modificados:**
- `SuscripcionService.php`: `DIAS_TRIAL = 30`
- `AlmacenamientoService.php`: `LIMITE_FREE = 1073741824` (1GB)
- `hooks/useAlmacenamiento.ts`: Constantes frontend actualizadas

#### ✅ Nueva Prioridad "Muy Alta"
- Agregado nivel de importancia "Muy Alta" por encima de "Alta"
- Implementado en tipos, componentes UI y variables CSS
- Color distintivo: `#dc2626` (rojo intenso)

**Archivos modificados:**
- `types/dashboard.ts`: Tipo `NivelImportancia` actualizado
- `mcp/src/types/dashboard.ts`: Tipo MCP actualizado
- `components/shared/CampoPrioridad.tsx`: Array IMPORTANCIAS
- `components/shared/SelectorImportanciaPill.tsx`: Opciones y colores
- `components/habitos/FormularioHabito.tsx`: Array IMPORTANCIAS
- `styles/variables.css`: Variables `--dashboard-estadoMuyAlta`

#### ✅ Ocultamiento de Features No Listas
- **Compartir tareas/proyectos**: Comentadas opciones en menús contextuales
- **Botón Mi Equipo**: Oculto en header (funcionalidad pendiente)

**Archivos modificados:**
- `components/tareas/TareaItem.tsx`: Opción "Compartir tarea" comentada
- `components/proyectos/ListaProyectos.tsx`: Opción "Compartir proyecto" comentada
- `components/dashboard/EncabezadoAcciones.tsx`: Bloque Mi Equipo comentado

#### ✅ Correcciones Visuales
- **Errores 403 silenciados**: Flag `silent` en errores de permisos API
- **Background .listaProyectos**: Removido color de fondo innecesario

**Archivos modificados:**
- `hooks/useDashboardApi.ts`: `error.silent = true` en 403
- `styles/dashboard/paneles/proyectos.css`: Removido `background-color`

---

## [1.0.15-beta] - 2026-01-29

### Fase 15: Lanzamiento Beta Nakomi

#### ✅ 15.1 Panel de Actividad - Mejora de Registro
- Implementado formato unificado: `Tipo "Nombre"` en línea simple
- Eliminada redundancia "Habito cumplido" + nombre separado
- Cambiado de lista numerada con cajas a lista simple sin numeración
- Formato final: `Tarea "Nombre" · Proyecto` o `Hábito "Nombre"`

**Archivos modificados:**
- `PanelActividad.tsx`: Función `formatearActividadUnificada()`
- `panelActividad.css`: Clase `.panelActividadDetalleLista--unificada`

#### ✅ 15.2 Sistema FREE/PREMIUM - Refactorización SOLID
- Centralizado sistema de suscripción en `suscripcionStore.ts` con Zustand
- Implementado patrón DIP (Dependency Inversion Principle)
- Selectores atómicos para evitar re-renders innecesarios
- Panel de Actividad oculto para usuarios FREE con mensaje de bloqueo

**Archivos creados:**
- `stores/suscripcionStore.ts`: Store centralizado con `puedeCrear()`, `verificarLimite()`, `tieneAcceso()`

**Archivos modificados:**
- `PanelActividad.tsx`: Agregado verificación Premium y componente `MensajeBloqueoFree`
- `panelActividad.css`: Estilos para estado bloqueado `.panelActividadBloqueado`

#### ✅ 15.3 Modal de Límites Alcanzados
- Creado componente `ModalLimiteAlcanzado` con diseño terminal estético
- Implementado hook `useLimites` para verificación centralizada
- Integrado en `DashboardModales.tsx` con estado global
- Soporte para límites: habitos, tareasActivas, proyectos, adjuntos

**Archivos creados:**
- `components/shared/ModalLimiteAlcanzado.tsx`
- `hooks/useLimites.ts`
- `styles/dashboard/componentes/modalLimiteAlcanzado.css`

**Archivos modificados:**
- `useDashboardCompleto.ts`: Integrado hook `limites`
- `DashboardModales.tsx`: Agregado `ModalLimiteAlcanzado`
- `shared/index.ts`: Exportado componente
- `styles/dashboard/index.css`: Importado CSS del modal

#### ✅ 15.4 Modal Suscripción - Features Completas
- Agregadas características faltantes en lista de beneficios premium
- Incluido: Panel de Actividad, Sistema de Backups, Conexión con IA
- Actualizado array `CARACTERISTICAS` con todas las features

**Archivos modificados:**
- `ModalUpgrade.tsx`: Array CARACTERISTICAS actualizado

#### ✅ 15.5 Correcciones Visuales
- **15.5.1**: Selector subtareas centrado verticalmente (`top: 50%; transform: translateY(-50%)`)
- **15.5.2-15.5.4**: Verificados inputs de perfil y formularios - usan variables CSS correctamente
- **15.5.5**: Fecha de creación movida debajo del título en notas
- **15.5.6**: Separada fecha de creación vs modificación con icono Edit2 y contador

**Archivos modificados:**
- `tareas.css`: Clase `.tareaColapsadorBoton` centrada
- `ListaNotasGuardadas.tsx`: Nuevo layout con fechaCreacion y fechaModificacion
- `scratchpad.css`: Nuevas clases `.modalNotasItemFechaCreacion`, `.modalNotasItemMetasInferiores`

#### ✅ 15.6 Persistencia de Notas (BUG CRÍTICO)
- Restaurado autoguardado con debounce de 2000ms
- Implementada restauración de última nota activa al cargar
- Flujo completo: escribir → debounce → guardarNotaActiva() → API → recargar → cargarNotas() → restaurarNotaActivaGuardada()

**Archivos modificados:**
- `PanelScratchpad.tsx`: 
  - Agregado `cargarNotas` y `restaurarNotaActivaGuardada` del store
  - useEffect para cargar notas al montar
  - useEffect para restaurar nota activa después de carga
  - useEffect para autoguardado con debounce

#### ✅ 15.7 Integración de Límites en Flujos de Creación
- Verificación de límites antes de crear hábitos, tareas y proyectos
- Wrappers con verificación: `manejarCrearHabitoConLimite`, `manejarCrearProyectoConLimite`, `manejarCrearTareaConLimite`
- Integrado en `manejarGuardarRapido` del modal de creación rápida

**Archivos modificados:**
- `DashboardModales.tsx`: 
  - Verificación en `manejarGuardarRapido` para tareas, hábitos y proyectos
  - Nuevos wrappers con verificación de límites
  - Actualizado `onGuardar` de modales para usar wrappers

#### ✅ 15.8 Actualización de Documentación
- Creado `CHANGELOG.md` con historial de Fase 15
- Eliminado `PLAN_BACKUPS.md` (ya no existía)
- Actualizado `ROADMAP_TASK.md` marcando tareas completadas

---

## Notas de Desarrollo

### Principios Aplicados
- **SOLID**: Single Responsibility, Dependency Inversion
- **Zustand**: Estado global centralizado con selectores atómicos
- **CSS Variables**: Todos los estilos usan variables temáticas

### TO-DO Pendientes
- Integración de límites para adjuntos (15.7.4) - requiere prop drilling al componente
- Versión móvil del dashboard

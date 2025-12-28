# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual

**Fecha de inicio:** 2025-12-19  
**Version:** v1.0.7-beta  
**Ultima actualizacion:** 2025-12-28
**Estado:** Fase 7 COMPLETADA - Bugs de sincronización corregidos

---

## Changelog

### v1.0.7-beta (2025-12-28)

**Corrección de Bugs de Sincronización - Fase 7 Completa**

**Correcciones críticas:**
- **Bug 1 corregido:** Desmarcar tarea ahora solo elimina el registro de actividad (sin crear registro de `tarea_desmarcada`)
- **Bug 2 corregido:** Desmarcar hábito desde checkbox actualiza correctamente el panel de actividad
- Backend `ActividadApiController.php` ahora retorna inmediatamente después de eliminar registros para tipos de desmarcado
- Panel de actividad se sincroniza correctamente al desmarcar hábitos/tareas

**Archivos modificados:**
- `App/Api/ActividadApiController.php` - Lógica de desmarcado corregida

---

### v1.0.6-beta (2025-12-27)

**Mapa de Calor de Actividad - Fase 8 Completa**

**Nuevas funcionalidades:**
- Panel de actividad con mapa de calor tipo GitHub
- Mapa de calor específico por hábito (en modal de configuración)
- Mapa de calor por proyecto (tareas completadas)
- Historial de 7 días inline en tabla de hábitos
- Click para marcar/desmarcar días pasados (hasta 30 días)
- Click derecho para marcar como pospuesto
- Cálculo dinámico de semanas según ancho del contenedor

**Mejoras de rendimiento:**
- Cache de actividad con TTL 5 min (persistido en sessionStorage)
- Cache de historial de hábitos con TTL 10 min
- Actualización optimista al marcar/desmarcar días
- Panel mantiene datos anteriores mientras recarga

**Correcciones:**
- Zona horaria: `obtenerFechaLocalISO()` evita problemas UTC
- Desmarcar hábito ahora elimina registro de actividad
- Sincronización panel ↔ modal al marcar desde checkbox
- Días no relevantes se muestran con opacidad reducida
- Click único para cambiar estado (sin múltiples clicks)
- Alineación correcta de días de semana en heatmap

---

### v1.0.5-beta (2025-12-26)

- Notificaciones al recibir mensajes en tareas compartidas
- Cache de historial de cumplimiento

---

### v1.0.4-beta (2025-12-25)

- Fases 7.5-7.6: Redimensionamiento de paneles, posponer hábitos, correcciones UX

---

### v1.0.3-beta

- Fases 5-7.4: Sistema de urgencia, modal chat, timeline de mensajes

---

### v1.0.2-beta

- Fases 0-4: Sistema social, equipos, notificaciones, compartir proyectos/tareas

---

## Funcionalidades Completadas

| Módulo              | Descripción                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| **Infraestructura** | Arquitectura SOLID, CSS centralizado, TypeScript, Sincronización, Cifrado E2E |
| **Hábitos**         | CRUD, frecuencias, rachas, historial, mapa calor, posponer                    |
| **Tareas**          | CRUD inline, subtareas, Drag & Drop, prioridades, adjuntos, chat              |
| **Proyectos**       | Jerarquía 3 niveles, progreso, mapa calor, vista expandible                   |
| **Actividad**       | Mapa de calor, historial visual, cache, actualizaciones optimistas            |
| **Social**          | Equipos, compartir, notificaciones, mensajes                                  |
| **Freemium**        | Free/Premium, Trial 14 días, Stripe integrado                                 |
| **Seguridad**       | API REST WordPress, nonce CSRF, AES-256-GCM, HKDF-SHA256                      |
| **Admin**           | Gestión usuarios, filtros, estadísticas                                       |

---

## Bugs Conocidos / Deuda Técnica

###  Sincronización de Estado de Hábitos (Arquitectura Fragmentada) ✅

**Estado:** COMPLETADO - Refactorización Zustand finalizada  
**Prioridad:** ~~Alta~~ Resuelta  
**Última revisión:** 2025-12-28  
**Solución implementada:** Opción A - Store Centralizado con Zustand

---

#### Diagnóstico del Problema

##### Fuentes de Verdad ANTES (Fragmentadas)

| #   | Ubicación                           | Estado que mantiene                                                           | Persistencia                 |
| --- | ----------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| 1   | `useDashboard.ts` → `habitos[]`     | `historialCompletados[]`, `historialPospuestos[]`, `racha`, `diasInactividad` | localStorage + WordPress API |
| 2   | `useHabitosHistorial.ts` → `estado` | `historial{}`, `historialMultiple{}`, `resumen7Dias[]`                        | React state (volátil)        |
| 3   | `historialHabitosStore.ts`          | Cache de historial por hábito (TTL 10 min)                                    | sessionStorage               |
| 4   | `actividadStore.ts`                 | Cache de datos del heatmap (TTL 5 min)                                        | sessionStorage               |

##### Fuentes de Verdad DESPUÉS (Centralizadas) ✅

| #   | Ubicación                   | Estado que mantiene                                                       | Persistencia                 |
| --- | --------------------------- | ------------------------------------------------------------------------- | ---------------------------- |
| 1   | `habitosStore.ts` (Zustand) | `habitos[]`, `historialDetallado{}`, acciones CRUD, historial retroactivo | localStorage + WordPress API |
| 2   | `actividadStore.ts`         | Cache de datos del heatmap (TTL 5 min)                                    | sessionStorage               |

**Archivos eliminados:**
- ~~`useHabitosHistorial.ts`~~ (hook obsoleto)
- ~~`historialHabitosStore.ts`~~ (cache obsoleto)

##### Flujos Problemáticos

```
FLUJO 1: Toggle desde checkbox
toggleHabito() 
  → setHabitos() → habito.historialCompletados ✅
  → registrarHabitoCumplido() → invalidarCache() ❌ Panel no re-renderiza
  ❌ historialMultiple NO se actualiza
  ❌ Modal "Historial" NO se sincroniza

FLUJO 2: Click en columna actividad (tabla)
marcarDiaHabitoConSync()
  → actualizarHistorialHabito() → habito.historial* ✅
  → marcarDia() → historialMultiple ✅
  → invalidarCache() ❌ Panel no re-renderiza

FLUJO 3: Click en modal historial (heatmap)
marcarDia()
  → historial{} ✅ (local del hook)
  → historialMultiple ✅
  → notificarCambioHabito() ❌ Columna no escucha
  → invalidarCache() ❌ Panel no re-renderiza
```

##### Causa Raíz

No existe una única fuente de verdad. Cada componente mantiene su propia copia del estado y se intenta sincronizar manualmente mediante callbacks, listeners e invalidación de cache.

---

#### Solución: Store Centralizado con Zustand

##### ¿Por qué Zustand?

| Criterio                       | Zustand      | Context+Reducer | Event Bus |
| ------------------------------ | ------------ | --------------- | --------- |
| Una fuente de verdad           | ✅            | ✅               | ❌         |
| Re-renders optimizados         | ✅ Selectores | ⚠️ Requiere memo | N/A       |
| Boilerplate                    | Mínimo       | Medio           | Bajo      |
| Funciona fuera de React        | ✅            | ❌               | ✅         |
| Middleware (persist, devtools) | ✅ Integrado  | ❌ Manual        | ❌         |
| Tamaño                         | ~2KB gzip    | 0 (built-in)    | ~1KB      |
| Escalabilidad                  | ✅ Excelente  | ⚠️ Moderada      | ❌ Frágil  |

##### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│                    useHabitosStore (Zustand)                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Estado:                                                    │ │
│  │  - habitos: Habito[] (incluye historialCompletados/Posp.)  │ │
│  │  - historialDetallado: Map<habitoId, HistorialHabito>      │ │
│  │  - estadoGuardado: 'idle' | 'guardando' | 'error'          │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Acciones:                                                  │ │
│  │  - toggleHabito(id)                                        │ │
│  │  - marcarDia(habitoId, fecha, estado)                      │ │
│  │  - desmarcarDia(habitoId, fecha)                           │ │
│  │  - posponerHabito(id)                                      │ │
│  │  - setHabitos(habitos[])  // para sync servidor            │ │
│  │  - invalidarHistorial(habitoId)                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Selectores (re-render optimizado):                         │ │
│  │  - useHabito(id) → Habito | undefined                      │ │
│  │  - useHabitos() → Habito[]                                 │ │
│  │  - useHistorialHabito(id) → HistorialHabito                │ │
│  │  - useEstadoDia(habitoId, fecha) → EstadoHabito | null     │ │
│  │  - useResumen7Dias(habitoId) → DiaHistorial[]              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌───────────┐      ┌──────────────┐    ┌──────────────┐
    │ Checkbox  │      │ Columna      │    │ Modal        │
    │ Toggle    │      │ Actividad    │    │ Historial    │
    │           │      │ (7 días)     │    │ (Heatmap)    │
    └───────────┘      └──────────────┘    └──────────────┘
          │                   │                   │
          │                   │                   │
          ▼                   ▼                   ▼
    ┌─────────────────────────────────────────────────────────┐
    │          Todos usan selectores del store                │
    │          Todos llaman acciones del store                │
    │          Re-render automático cuando cambia su slice    │
    └─────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │                  Persistencia (Middleware)              │
    │  - localStorage (habitos básicos)                       │
    │  - WordPress API (historial servidor)                   │
    │  - Actualización optimista + rollback en error          │
    └─────────────────────────────────────────────────────────┘
```

---

#### Plan de Implementación por Fases

##### Fase 0: Preparación (1-2h)

- [ ] Instalar Zustand: `npm install zustand --prefix App/React`
- [ ] Crear estructura de carpetas:
  ```
  App/React/stores/
    habitosStore.ts      // Store principal
    habitosSelectors.ts  // Selectores reutilizables
    habitosActions.ts    // Lógica de acciones (si crece)
  ```
- [ ] Verificar que el build funciona con la nueva dependencia

##### Fase 1: Crear Store Base (2-3h)

- [ ] Crear `stores/habitosStore.ts` con:
  - Estado inicial vacío
  - Acción `setHabitos(habitos[])` para cargar datos
  - Middleware `persist` para localStorage
  - Middleware `devtools` para debugging (solo en dev)
- [ ] Crear selectores básicos:
  - `useHabitos()` → todos los hábitos
  - `useHabito(id)` → un hábito por ID
- [ ] Agregar tipos TypeScript en `types/habitosStore.ts`

##### Fase 2: Migrar Toggle y Estado Básico (3-4h)

- [ ] Mover `toggleHabito` de `useDashboard` al store
- [ ] Mover `posponerHabito` al store
- [ ] Mover `crearHabito`, `editarHabito`, `eliminarHabito` al store
- [ ] `useDashboard` ahora consume del store:
  ```typescript
  const habitos = useHabitosStore(state => state.habitos);
  const toggleHabito = useHabitosStore(state => state.toggleHabito);
  ```
- [ ] Verificar que TablaHabitos sigue funcionando

##### Fase 3: Migrar Historial Detallado (3-4h)

- [ ] Agregar `historialDetallado: Record<number, HistorialHabito>` al store
- [ ] Mover `marcarDia` de `useHabitosHistorial` al store
- [ ] Mover `desmarcarDia` al store
- [ ] Implementar actualización optimista dentro del store:
  ```typescript
  marcarDia: async (habitoId, fecha, estado) => {
    // 1. Actualizar UI inmediatamente
    set(state => actualizarEstadoOptimista(state, habitoId, fecha, estado));
    
    // 2. Llamar API
    try {
      await guardarEnServidor(habitoId, fecha, estado);
    } catch (error) {
      // 3. Rollback si falla
      set(state => restaurarEstadoAnterior(state, habitoId, fecha));
    }
  }
  ```
- [ ] Crear selectores para historial:
  - `useHistorialHabito(id)` → historial completo
  - `useEstadoDia(habitoId, fecha)` → estado de un día específico

##### Fase 4: Actualizar Componentes Consumidores (2-3h)

- [ ] **TablaHabitos.tsx**: Usar selectores del store
  - Eliminar props de historial (`historialMultiple`)
  - Cada `FilaHabito` obtiene datos directamente del store
- [ ] **ModalHabito.tsx**: Usar selectores del store
  - Eliminar `useHabitosHistorial` interno
  - `MapaCalorHabito` lee del store
- [ ] **HistorialHabitoInline**: Usar selectores
- [ ] Verificar que todos los flujos de sincronización funcionan

##### Fase 5: Eliminar Código Obsoleto (2h)

- [ ] Eliminar/reducir `useHabitosHistorial`:
  - Mantener solo funciones de API puras si son necesarias
  - O eliminar completamente si todo está en el store
- [ ] Eliminar `historialHabitosStore.ts` (cache ahora en Zustand)
- [ ] Simplificar `actualizarHistorialHabito` en `useDashboard`
- [ ] Limpiar callbacks de sincronización manual

##### Fase 6: Integrar Panel de Actividad (2-3h)

- [ ] Evaluar si `actividadStore.ts` debe migrarse al store de Zustand
  - **Opción A**: Mantener separado (datos diferentes, TTL diferente)
  - **Opción B**: Integrar si comparte datos con hábitos
- [ ] Conectar invalidación: cuando cambia un hábito en el store, invalidar cache de actividad
- [ ] Verificar que el panel heatmap se actualiza correctamente

##### Fase 7: Testing y Ajustes (2-3h)

- [ ] Probar todos los flujos:
  - Toggle desde checkbox → columna, modal y panel actualizan
  - Click columna actividad → modal y panel actualizan
  - Click modal historial → columna y panel actualizan
- [ ] Verificar persistencia localStorage
- [ ] Verificar sincronización con servidor WordPress
- [ ] Verificar que deshacer (undo) sigue funcionando
- [ ] Pruebas de rendimiento (no hay re-renders innecesarios)

---

#### Estructura de Archivos Final

```
App/React/
  stores/
    habitosStore.ts         // Store Zustand principal (fuente única de verdad)
    actividadStore.ts       // Cache de actividad del heatmap
  hooks/
    useDashboard.ts         // Simplificado, consume del store
    useHabitosHistorial.ts  // ✅ ELIMINADO
  services/
    historialHabitosStore.ts  // ✅ ELIMINADO
    actividadService.ts       // Registro de actividad (API)
  types/
    historialHabitos.ts       // Tipos compartidos
    dashboard.ts              // Existente
```

---

#### Tipos TypeScript del Store

```typescript
// types/habitosStore.ts

import type { Habito } from './dashboard';
import type { HistorialHabito, EstadoHabito, DiaHistorial } from './historialHabitos';

export interface HabitosState {
    /* Lista de hábitos con historial básico incluido */
    habitos: Habito[];
    
    /* Historial detallado por hábito (para modal heatmap) */
    historialDetallado: Record<number, HistorialHabito>;
    
    /* Estado de operaciones asíncronas */
    estadoGuardado: 'idle' | 'guardando' | 'error';
    errorGuardado: string | null;
}

export interface HabitosActions {
    /* CRUD básico */
    setHabitos: (habitos: Habito[]) => void;
    crearHabito: (datos: DatosNuevoHabito) => void;
    editarHabito: (id: number, datos: DatosNuevoHabito) => void;
    eliminarHabito: (id: number) => void;
    
    /* Toggle y posponer (día actual) */
    toggleHabito: (id: number) => void;
    posponerHabito: (id: number) => void;
    
    /* Historial retroactivo */
    marcarDia: (habitoId: number, fecha: string, estado: EstadoHabito) => Promise<boolean>;
    desmarcarDia: (habitoId: number, fecha: string) => Promise<boolean>;
    
    /* Carga de historial detallado (para modal) */
    cargarHistorialDetallado: (habitoId: number, dias?: number) => Promise<void>;
    
    /* Sincronización */
    invalidarHistorial: (habitoId: number) => void;
}

export type HabitosStore = HabitosState & HabitosActions;
```

---

#### Métricas de Éxito

| Métrica                            | Antes                                               | Después                                |
| ---------------------------------- | --------------------------------------------------- | -------------------------------------- |
| Fuentes de verdad                  | 4                                                   | 1                                      |
| Archivos de estado                 | 4 (`useDashboard`, `useHabitosHistorial`, 2 stores) | 1 (`habitosStore`)                     |
| Callbacks de sincronización manual | 3+                                                  | 0                                      |
| Líneas de código de sincronización | ~200                                                | ~50                                    |
| Bugs de desincronización           | Frecuentes                                          | Ninguno (garantizado por arquitectura) |

---

#### Tiempo Estimado Total

| Fase      | Descripción              | Tiempo     |
| --------- | ------------------------ | ---------- |
| 0         | Preparación              | 1-2h       |
| 1         | Store base               | 2-3h       |
| 2         | Migrar toggle/estado     | 3-4h       |
| 3         | Migrar historial         | 3-4h       |
| 4         | Actualizar componentes   | 2-3h       |
| 5         | Eliminar código obsoleto | 2h         |
| 6         | Panel actividad          | 2-3h       |
| 7         | Testing                  | 2-3h       |
| **Total** |                          | **17-24h** |

---

## Tareas Pendientes

### Alta Prioridad - Refactorización Zustand

**Estado actual:** Fase 7 COMPLETADA  
**Progreso:** 8/8 fases completadas

- [x] **Fase 0:** Preparación - Instalar Zustand, crear estructura de carpetas
- [x] **Fase 1:** Crear store base con middleware persist/devtools
- [x] **Fase 2:** Migrar toggle/posponer/CRUD de hábitos al store
- [x] **Fase 3:** Migrar historial detallado (marcarDia/desmarcarDia) - Llamadas API, rollback, cache
- [x] **Fase 4:** Actualizar componentes consumidores (MapaCalorHabito usa store)
- [x] **Fase 5:** Eliminar código obsoleto - useHabitosHistorial y historialHabitosStore eliminados
- [x] **Fase 6:** Integrar panel de actividad - actividadStore separado con invalidación cruzada
- [x] **Fase 7:** Testing y ajustes finales - Bugs corregidos (ver v1.0.7-beta)

---

#### Bugs Corregidos en Testing (Fase 7) ✅

##### Bug 1: Desmarcar tarea no elimina actividad del panel - CORREGIDO

**Comportamiento anterior:**
- Al desmarcar una tarea completada, el backend eliminaba el registro `tarea_completada`
- PERO también registraba una nueva actividad de tipo `tarea_desmarcada`
- Resultado: el panel de actividad mostraba múltiples actividades en lugar de ninguna

**Solución aplicada:**
- Backend `ActividadApiController.php` ahora retorna inmediatamente después de eliminar para tipos `*_desmarcada`
- NO se llama a `$repo->registrar()` para tipos de desmarcado

##### Bug 2: Desmarcar hábito desde checkbox no actualiza panel de actividad - CORREGIDO

**Comportamiento anterior:**
- Al desmarcar un hábito desde el checkbox, el panel de actividad NO se actualizaba inmediatamente
- El registro `habito_cumplido` permanecía en el panel hasta refresh manual

**Solución aplicada:**
- Mismo fix que Bug 1: el backend ya no crea registros de tipo `habito_desmarcado`
- La invalidación de cache en el frontend ya estaba correctamente implementada

---

### Media Prioridad

- [ ] Múltiples widgets de mapa de calor en dashboard (8.4)

### Baja Prioridad

<details>
<summary>Mejoras menores</summary>

**Hábitos:**
- [ ] Animación de entrada/salida
- [ ] Umbral de reseteo editable
- [ ] Adaptar racha a frecuencia

**Tareas:**
- [ ] Animación de arrastre más fluida
- [ ] Soporte markdown en descripción

**Ordenamiento:**
- [ ] Drag & drop manual para hábitos
- [ ] Buscar hábitos por nombre

**Responsive/PWA:**
- [ ] Layout móvil adaptativo
- [ ] Service Worker offline
- [ ] Instalable en móvil

</details>

### Fases Futuras

<details>
<summary>Fase 9: Scratchpad + File Manager</summary>

**Scratchpad - Sistema de Guardado:**
- [ ] Botón "Guardar nota" en Scratchpad
- [ ] Notas guardadas con título y fecha
- [ ] Archivo de notas guardadas

**File Manager:**
- [ ] Vista tipo explorador de archivos
- [ ] Agrupación por proyecto/tarea/tipo
- [ ] Preview de archivos
- [ ] Subir archivos sin asociar a tarea

</details>

<details>
<summary>Fase 10: Compartir Hábitos</summary>

- [ ] Tabla `wp_glory_habitos_compartidos`
- [ ] Opción "Compartir hábito" en menú contextual
- [ ] Ver estado de cumplimiento del compañero
- [ ] Notificaciones de logros

</details>

<details>
<summary>Fase 11: Futuro</summary>

- [ ] Correo de invitación a usuarios no registrados
- [ ] Notificaciones por correo (resumen, alertas)
- [ ] Feed de red social (posts, likes, comentarios)
- [ ] Gamificación (badges, niveles, leaderboards)

</details>

### Pendientes de Cifrado Avanzado (Fase 4)

- [ ] Campo `cifrado_compartido: false` en elementos compartidos
- [ ] Separar datos cifrados de no cifrados en sincronización

---

## Resumen de Fases

| Fase | Nombre                    | Estado         |
| ---- | ------------------------- | -------------- |
| 0-4  | Sistema Social            | ✅ Completada   |
| 5-7  | Urgencia, Chat, UX        | ✅ Completada   |
| 8    | Mapa de Calor + Historial | ✅ Completada   |
| 9    | Scratchpad + File Manager | Baja Prioridad |
| 10   | Compartir Hábitos         | Baja Prioridad |
| 11   | Futuro                    | Pendiente      |

---

## Estructura de Archivos

<details>
<summary>Ver estructura</summary>

```
App/React/
  types/dashboard.ts
  utils/fecha.ts, frecuenciaHabitos.ts, ...
  hooks/useActividad.ts, useHabitosHistorial.ts, ...
  stores/actividadStore.ts, historialHabitosStore.ts
  services/actividadService.ts
  components/shared/
    MapaCalor.tsx, MapaCalorHabito.tsx, MapaCalorProyecto.tsx,
    HistorialHabito.tsx, ...
  components/dashboard/...
  components/admin/...
  styles/dashboard/
    shared/mapaCalor.css, mapaCalorHabito.css, historialHabito.css, ...
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

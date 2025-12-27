# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual

**Fecha de inicio:** 2025-12-19  
**Version:** v1.0.6-beta  
**Ultima actualizacion:** 2025-12-27
**Estado:** Fase 8 COMPLETADA

---

## Changelog

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

## Tareas Pendientes

### Alta Prioridad

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

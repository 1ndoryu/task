# Análisis de Refactorización - Fase 9 (En Progreso)

**Fecha:** 2025-12-29  
**Última actualización:** 2025-12-29 20:02  
**Estado:** EN PROGRESO

---

## Resumen

La estructura base de la Fase 9 está lista:
- Hooks compartidos creados
- Formularios modernos creados
- Integración básica completada

**Pendiente:** Adaptar componentes internos al estilo Linear (pills inline).

---

## Completado

### Infraestructura
- [x] Hook `useAutoguardado.ts`
- [x] Hook `usePanelChat.ts`
- [x] Componente `PestanasModal.tsx`

### Estructura Base
- [x] `FormularioTareaModerno.tsx` 
- [x] `FormularioHabitoModerno.tsx`
- [x] Integración en `PanelConfiguracionTarea.tsx`
- [x] Integración en `ModalHabito.tsx`
- [x] Header icons estilo Linear
- [x] Auto-guardado al cerrar

---

## Pendiente - Fase 9.4 (Tareas)

### Selector de Estado
El selector actual de estado (completada/pendiente) usa un componente tradicional.
Debe adaptarse al estilo pill inline como `PropiedadesCompactas`.

**Componente:** `SelectorEstadoTarea`
**Nuevo estilo:** Pill clickeable con menú contextual
**Opciones:** Pendiente, Completada

### Selector de Proyecto
El selector actual de proyecto usa un dropdown tradicional.
Debe adaptarse al estilo pill inline.

**Componente:** `SelectorProyecto`
**Nuevo estilo:** Pill con icono de proyecto + nombre truncado
**Menú:** Lista de proyectos disponibles

### Repetición
La sección de repetición usa un toggle + selector de frecuencia tradicional.
Debe adaptarse a un estilo más compacto y moderno.

**Componente:** `SelectorFrecuencia`
**Nuevo estilo:** Collapsible o pills para opciones comunes (Diario, Semanal, etc.)

---

## Pendiente - Fase 9.5 (Hábitos)

### Importancia
El selector de importancia usa botones de nivel tradicionales.
Debe adaptarse al estilo pill inline.

**Componente:** `SelectorNivel` → Nuevo `SelectorImportancia`
**Nuevo estilo:** Pill con icono + texto (Alta, Media, Baja)
**Colores:** Rojo para Alta, Amarillo para Media, Gris para Baja

### Estado del Día
El selector de estado del día usa pills pero no está integrado en PropiedadesCompactas.
Debe moverse a una sección de propiedades inline.

**Componente:** `SelectorEstadoHabito`
**Nuevo estilo:** Pill inline en sección de propiedades
**Opciones:** Pendiente, Completado, Pospuesto

### Frecuencia
Similar a la repetición de tareas, debe ser más compacto.

**Componente:** `SelectorFrecuencia`
**Nuevo estilo:** Pill con resumen + menú expandible

---

## Pendiente - Fase 9.6 (Estado de Proyectos)

### Selector de Estado de Proyecto
Los proyectos actualmente no tienen un selector de estado visible.
Debe agregarse como parte de las propiedades compactas.

**Estados disponibles:** Activo, Pausado, Completado
**Estilo:** Pill con icono + texto
**Colores:** Verde para Activo, Amarillo para Pausado, Gris para Completado
**Integrar en:** `FormularioProyectoModerno` y `PropiedadesCompactas`

---

## Plan de Implementación

### Orden sugerido:

1. **PropiedadesCompactasExtendido** - Crear versión que soporte más propiedades
   - Estado (para tareas)
   - Proyecto (para tareas)
   - Importancia (para hábitos)
   - Estado del día (para hábitos)
   - Estado del proyecto (para proyectos)

2. **Adaptar FormularioTareaModerno**
   - Integrar estado y proyecto en propiedades compactas
   - Modernizar sección de repetición

3. **Adaptar FormularioHabitoModerno**
   - Integrar importancia y estado en propiedades compactas
   - Modernizar sección de frecuencia

4. **Adaptar FormularioProyectoModerno**
   - Agregar estado del proyecto a propiedades compactas

---

## Componentes a Crear/Modificar

| Componente                   | Acción   | Descripción                                 |
| ---------------------------- | -------- | ------------------------------------------- |
| `PropiedadesCompactas`       | Extender | Soportar más tipos de propiedades           |
| `SelectorEstadoPill`         | Crear    | Pill para estado de tareas                  |
| `SelectorProyectoPill`       | Crear    | Pill para selector de proyecto              |
| `SelectorImportanciaPill`    | Crear    | Pill para importancia de hábitos            |
| `SelectorFrecuenciaCompacto` | Crear    | Versión compacta del selector de frecuencia |
| `SelectorEstadoProyectoPill` | Crear    | Pill para estado de proyectos               |

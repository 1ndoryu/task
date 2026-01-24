# Refactorización del Sistema de Paneles

> **Fecha:** 2026-01-24  
> **Estado:** ✅ Implementado  
> **Objetivo:** Hacer el sistema de paneles extensible para agregar nuevos paneles sin modificar múltiples archivos

---

## Problema Original

El sistema de paneles anterior **violaba el principio Open/Closed (OCP)** de SOLID. Para agregar un nuevo panel, había que modificar **6+ archivos** diferentes.

---

## Solución Implementada: Registro Centralizado de Paneles

### Archivos Creados

| Archivo                        | Propósito                                                             |
| ------------------------------ | --------------------------------------------------------------------- |
| `types/paneles.ts`             | Tipos base: `DefinicionPanel`, `PanelBaseProps`, `ModoColumnas`, etc. |
| `config/registroPaneles.ts`    | Registro central + funciones helper para obtener paneles              |
| `config/inicializarPaneles.ts` | Registra todos los paneles existentes al inicio de la app             |
| `config/index.ts`              | Re-exports del módulo config                                          |

### Archivos Modificados

| Archivo                                  | Cambio                                                               |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `hooks/useConfiguracionLayout.ts`        | Tipos dinámicos (`Record<string, T>`), genera valores desde registro |
| `components/dashboard/DashboardGrid.tsx` | Obtiene componentes dinámicamente del registro                       |
| `hooks/usePaginaMovil.ts`                | Deriva páginas válidas del registro                                  |
| `hooks/useOpcionesPanelMovil.tsx`        | Usa registro para títulos dinámicos                                  |
| `appIslands.tsx`                         | Importa inicializador de paneles                                     |

---

## Cómo Agregar un Nuevo Panel

Con la nueva arquitectura, agregar un panel requiere **solo 2 pasos**:

### Paso 1: Crear el componente del panel

```typescript
// components/paneles/PanelNuevo.tsx
import type {PanelBaseProps} from '../../types/paneles';

interface PanelNuevoProps extends PanelBaseProps {
    // Props específicas del panel
}

export function PanelNuevo({renderHandleArrastre, handleMinimizar}: PanelNuevoProps): JSX.Element {
    return (
        <>
            <SeccionEncabezado
                titulo={renderHandleArrastre('Mi Panel Nuevo') as any}
                acciones={<>{handleMinimizar}</>}
            />
            {/* Contenido del panel */}
        </>
    );
}
```

### Paso 2: Registrar el panel en `inicializarPaneles.ts`

```typescript
// En config/inicializarPaneles.ts
import {PanelNuevo} from '../components/paneles/PanelNuevo';

registrarPanel({
    id: 'panelNuevo',
    titulo: 'Mi Panel Nuevo',
    tituloMovil: 'Nuevo',
    visiblePorDefecto: false,
    alturaDefecto: 'auto',
    posicionDefecto: crearPosicionDefecto([1, 5], [2, 3], [3, 3]),
    componente: PanelNuevo as any,
    enNavegacionMovil: false,
    manejaAlturaPropia: false
});
```

### Paso 3 (Si el panel tiene props específicas): Agregar generador de props

En `DashboardGrid.tsx`, agregar una función generadora de props y agregarla a `GENERADORES_PROPS`:

```typescript
function generarPropsPanelNuevo(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    return {
        // props específicas del panel
        renderHandleArrastre,
        handleMinimizar
    };
}

const GENERADORES_PROPS: Record<string, Function> = {
    // ... otros paneles
    panelNuevo: generarPropsPanelNuevo
};
```

**¡Listo!** El panel aparecerá automáticamente en:
- El menú de paneles ocultos
- Las opciones de configuración de layout
- Con su altura y posición por defecto

---

## Beneficios Obtenidos

| Antes                                      | Después                        |
| ------------------------------------------ | ------------------------------ |
| Modificar 6+ archivos para agregar panel   | Modificar 2-3 archivos máximo  |
| Tipos hardcodeados                         | Tipos derivados dinámicamente  |
| Alta probabilidad de olvidar algún archivo | El registro fuerza completitud |
| Código duplicado en mapeos                 | Fuente única de verdad         |
| Violación OCP                              | Cumple OCP                     |

---

## Detalles de Implementación

### Registro de Paneles

El registro (`registroPaneles.ts`) expone:

- `registrarPanel(definicion)` - Registra un nuevo panel
- `obtenerPanel(id)` - Obtiene definición de un panel
- `obtenerIdsPaneles()` - Lista todos los IDs registrados
- `obtenerTodosPaneles()` - Lista todas las definiciones
- `generarVisibilidadDefecto()` - Config de visibilidad desde registro
- `generarAlturasDefecto()` - Config de alturas desde registro
- `generarOrdenDefecto(modo)` - Orden por modo de columnas
- `obtenerPanelesMovil()` - Paneles para nav móvil
- `panelManejaAlturaPropia(id)` - Si el panel gestiona su altura

### Compatibilidad Hacia Atrás

Se mantienen exports legacy que evalúan dinámicamente:
- `TODOS_LOS_PANELES` (deprecated, usar `obtenerIdsPaneles()`)
- `ORDEN_PANELES_DEFECTO` (deprecated, usar `obtenerOrdenPanelesDefecto()`)
- `CONFIG_LAYOUT_DEFECTO` (deprecated, usar `obtenerConfigLayoutDefecto()`)

El sistema de migración en `useConfiguracionLayout` detecta paneles nuevos y los agrega automáticamente a la configuración del usuario.

---

## TO-DO Futuro (mejoras adicionales)

- [ ] **Generadores de props en el registro**: Cada panel podría registrar su propio generador
- [ ] **Opciones de menú móvil en el registro**: Eliminar el switch en useOpcionesPanelMovil
- [ ] Sistema de plugins para paneles de terceros
- [ ] Lazy loading de paneles no visibles
- [ ] Persistencia de orden personalizado por usuario
- [ ] Paneles dinámicos generados desde API

---

## Fases de Migración Completadas

- [x] **Fase 1**: Crear infraestructura (`types/paneles.ts`, `config/registroPaneles.ts`)
- [x] **Fase 2**: Migrar `useConfiguracionLayout` (tipos dinámicos, generación desde registro)
- [x] **Fase 3**: Migrar `DashboardGrid` (componentes dinámicos)
- [x] **Fase 4**: Migrar hooks móvil (`usePaginaMovil`, `useOpcionesPanelMovil`)
- [x] **Fase 5**: Limpieza y documentación

---

*Documento actualizado: 2026-01-24*

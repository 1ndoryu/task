# Refactorizacion Visual de Paneles del Dashboard

## Resumen del Objetivo

Estandarizar la estructura visual de todos los paneles del dashboard para que:
1. Tengan un **header interno de 42px** simulando una barra de titulo de ventana
2. Los **botones de acciones** muestren solo iconos (sin background ni borde)
3. El **input de nueva tarea** se mueva al **final** del panel
4. Se **eliminen los encabezados de columnas** en la tabla de habitos
5. Todas las estructuras sean consistentes

---

## Analisis de Estructura Actual

### Paneles Identificados

| Panel ID          | Componente             | Clase CSS Contenedor                      | Notas                                    |
| ----------------- | ---------------------- | ----------------------------------------- | ---------------------------------------- |
| `ejecucion`       | `PanelEjecucion`       | `panelDashboard internaColumna`           | Tiene SeccionEncabezado + ListaTareas    |
| `focoPrioritario` | `PanelFocoPrioritario` | `panelDashboard`                          | Tiene SeccionEncabezado + TablaHabitos   |
| `proyectos`       | `PanelProyectos`       | `panelDashboard`                          | Tiene SeccionEncabezado + ListaProyectos |
| `scratchpad`      | `PanelScratchpad`      | `panelDashboard internaColumna` (interno) | Tiene SeccionEncabezado + Scratchpad     |
| `actividad`       | `PanelActividad`       | `panelDashboard internaColumna` (interno) | Tiene SeccionEncabezado + MapaCalor      |

---

## Diferencias Estructurales Detectadas

### 1. Contenedor Wrapper

**Problema**: Los paneles usan contenedores inconsistentes.

| Panel             | Estructura Wrapper                                       |
| ----------------- | -------------------------------------------------------- |
| `ejecucion`       | `<>` Fragment directo, contenedor viene de DashboardGrid |
| `focoPrioritario` | `<>` Fragment directo, contenedor viene de DashboardGrid |
| `proyectos`       | `<>` Fragment directo, contenedor viene de DashboardGrid |
| `scratchpad`      | `<div className="panelDashboard internaColumna">` propio |
| `actividad`       | `<div className="panelDashboard internaColumna">` propio |

**Nota**: `DashboardGrid.tsx` envuelve los paneles de `ejecucion`, `focoPrioritario` y `proyectos` con `<div className="panelDashboard">` o `<div className="panelDashboard internaColumna">`.

### 2. SeccionEncabezado

**Estado actual**: Todos usan el componente `<SeccionEncabezado>` de forma consistente.

Estructura del componente:
```tsx
<div className="seccionEncabezado">
    <h2 className="seccionTitulo">
        {icono} {titulo}
    </h2>
    {subtitulo && <span className="seccionSubtitulo">{subtitulo}</span>}
    {acciones && <div className="seccionAcciones">{acciones}</div>}
</div>
```

**CSS actual** (encabezado.css:135-162):
```css
.seccionEncabezado {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--dashboard-espacioSm);
    min-height: 24px;
}
```

### 3. Contenido Interno

| Panel             | Contenido Principal                         | Input/Encabezado Interno                                    |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------- |
| `ejecucion`       | `<ListaTareas>` wraps `<DashboardPanel>`    | `<InputNuevaTarea>` al INICIO                               |
| `focoPrioritario` | `<TablaHabitos>` wraps `<DashboardPanel>`   | `<div className="tablaEncabezado">` con nombres de columnas |
| `proyectos`       | `<ListaProyectos>` wraps `<DashboardPanel>` | No tiene input visible                                      |
| `scratchpad`      | `<Scratchpad>`                              | No tiene encabezado interno                                 |
| `actividad`       | `<MapaCalor>`                               | No tiene encabezado interno                                 |

### 4. Botones de Acciones

**Estado actual**: Usan clase `.selectorBadgeBoton` con:
- `background-color: var(--dashboard-fondoHover)`
- `border: 1px solid var(--dashboard-bordeSutil)`
- Dimensiones: 26x26px

**Objetivo**: Solo mostrar icono, sin background ni borde.

---

## Plan de Refactorizacion

### Fase 1: CSS - Nuevo Sistema de Header de Panel (Prioridad Alta)

#### 1.1 Agregar variables CSS

Archivo: `variables.css`
```css
/* PANEL HEADER */
--dashboard-panelHeaderAltura: 42px;
--dashboard-panelHeaderFondo: var(--dashboard-fondoSecundario);
--dashboard-panelHeaderBorde: var(--dashboard-bordePrincipal);
```

#### 1.2 Crear clase modificadora para botones sin estilo

Archivo: `selectorBadge.css`
```css
/* Variante solo icono - sin background ni borde */
.selectorBadgeBoton--soloIcono {
    background: transparent;
    border: none;
    width: auto;
    height: auto;
    min-height: unset;
    padding: var(--dashboard-espacioXs);
}

.selectorBadgeBoton--soloIcono:hover {
    background: transparent;
    border: none;
    color: var(--dashboard-textoNormal);
}
```

#### 1.3 Modificar estilos de seccionEncabezado

Archivo: `encabezado.css`
```css
/* Panel Header - simula barra de titulo de ventana */
.seccionEncabezado--panelHeader {
    height: var(--dashboard-panelHeaderAltura);
    padding: 0 var(--dashboard-espacioLg);
    margin-bottom: 0;
    background: var(--dashboard-panelHeaderFondo);
    border-bottom: 1px solid var(--dashboard-panelHeaderBorde);
}
```

---

### Fase 2: Componentes - Actualizar SeccionEncabezado (Prioridad Alta)

#### 2.1 Modificar SeccionEncabezado.tsx

Agregar prop `variante` para aplicar clase modificadora:

```tsx
interface SeccionEncabezadoProps {
    icono: ReactNode;
    titulo: string;
    subtitulo?: string;
    acciones?: ReactNode;
    variante?: 'default' | 'panelHeader'; // Nueva prop
}

export function SeccionEncabezado({icono, titulo, subtitulo, acciones, variante = 'default'}: SeccionEncabezadoProps): JSX.Element {
    const claseVariante = variante === 'panelHeader' ? 'seccionEncabezado--panelHeader' : '';
    
    return (
        <div className={`seccionEncabezado ${claseVariante}`}>
            ...
        </div>
    );
}
```

---

### Fase 3: Componentes - Actualizar Paneles (Prioridad Media)

#### 3.1 Actualizar todos los paneles

Pasar `variante="panelHeader"` a cada `<SeccionEncabezado>`:
- `PanelEjecucion.tsx`
- `PanelFocoPrioritario.tsx`
- `PanelProyectos.tsx`
- `PanelScratchpad.tsx`
- `PanelActividad.tsx`

#### 3.2 Cambiar botones a solo icono

Agregar clase `selectorBadgeBoton--soloIcono` a todos los botones de acciones:

```tsx
<button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={...}>
```

---

### Fase 4: Tareas - Mover Input al Final (Prioridad Media)

Archivo: `ListaTareas.tsx`

**Cambio**: Mover `<InputNuevaTarea>` de linea 356 al final del componente (antes del cierre de `<DashboardPanel>`):

```tsx
return (
    <DashboardPanel id="lista-tareas">
        {/* Contenido de tareas... */}
        
        {/* Input al FINAL en lugar del inicio */}
        {onCrearTarea && <InputNuevaTarea onCrear={crearTareaConProyecto} />}
    </DashboardPanel>
);
```

---

### Fase 5: Habitos - Eliminar Encabezado de Tabla (Prioridad Media)

Archivo: `TablaHabitos.tsx`

**Opcion A**: Ocultar con CSS (menos invasivo)
```css
.tablaEncabezado {
    display: none;
}
```

**Opcion B**: Eliminar del TSX (mas limpio, recomendado)
- Eliminar lineas 334-343 que renderizan `<div className="tablaEncabezado">`
- Ya que el encabezado va en `SeccionEncabezado`, no se necesita duplicar

---

## Archivos a Modificar

### CSS (3 archivos)
1. `variables.css` - Agregar variables de panel header
2. `selectorBadge.css` - Agregar clase `--soloIcono`
3. `encabezado.css` - Agregar clase `--panelHeader`

### TSX (7 archivos)
1. `SeccionEncabezado.tsx` - Agregar prop variante
2. `PanelEjecucion.tsx` - Usar variante y clase soloIcono
3. `PanelFocoPrioritario.tsx` - Usar variante y clase soloIcono
4. `PanelProyectos.tsx` - Usar variante y clase soloIcono
5. `PanelScratchpad.tsx` - Usar variante y clase soloIcono
6. `PanelActividad.tsx` - Usar variante y clase soloIcono
7. `ListaTareas.tsx` - Mover InputNuevaTarea al final
8. `TablaHabitos.tsx` - Eliminar encabezado de columnas

---

## Estado de Avance

| Tarea                    | Estado     | Notas                                 |
| ------------------------ | ---------- | ------------------------------------- |
| Analisis de estructura   | Completado | Este documento                        |
| Variables CSS            | Completado | variables.css - Agregadas 3 variables |
| Clase soloIcono          | Completado | selectorBadge.css                     |
| Clase panelHeader        | Completado | encabezado.css                        |
| SeccionEncabezado.tsx    | Completado | Agregada prop variante                |
| PanelEjecucion.tsx       | Completado | variante + soloIcono                  |
| PanelFocoPrioritario.tsx | Completado | variante + soloIcono                  |
| PanelProyectos.tsx       | Completado | variante + soloIcono                  |
| PanelScratchpad.tsx      | Completado | variante + soloIcono                  |
| PanelActividad.tsx       | Completado | variante + soloIcono                  |
| BotonMinimizarPanel.tsx  | Completado | clase soloIcono                       |
| ListaTareas.tsx          | Completado | InputNuevaTarea al final              |
| TablaHabitos (CSS)       | Completado | tablaEncabezado ocultado              |

---

## Proximos Pasos

1. **Implementar Fase 1** - CSS primero para ver cambios sin romper funcionalidad
2. **Implementar Fase 2** - SeccionEncabezado con variante
3. **Implementar Fase 3** - Actualizar paneles uno por uno
4. **Implementar Fase 4 y 5** - Ajustes especificos de Tareas y Habitos
5. **Testing visual** - Verificar que todo se ve correcto

---

*Documento creado: 2025-12-29*
*Ultima actualizacion: 2025-12-29*

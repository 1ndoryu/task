# Plan de Centralización de Estilos - Eliminación de claseAdicional

**Fecha:** 12 de febrero de 2026  
**Objetivo:** Eliminar dependencias de `claseAdicional` en componentes atómicos, centralizar todos los estilos en ui.css, y limpiar CSS obsoleto.

---

## Estado Actual

### Componentes Atómicos Creados
- ✅ Boton.tsx
- ✅ Input.tsx
- ✅ Textarea.tsx
- ✅ Select.tsx
- ✅ Checkbox.tsx
- ✅ Radio.tsx

### Problema Identificado
**100+ usos de `claseAdicional`** en 30 componentes migrados, manteniendo dependencias en CSS disperso:
- Duplicación de estilos (variantes implementadas dos veces)
- Falta de consistencia visual
- Dificultad para mantener temas
- CSS difícil de rastrear y eliminar

---

## Análisis de Clases Duplicadas

### Categorías de Clases Encontradas

#### 1. **Botones de Panel/Badge** (18 usos)
```typescript
claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono"
```
**Archivos:** PanelScratchpad, PanelProyectos, PanelFocoPrioritario, PanelEjecucion  
**Solución:** Crear variante `badge` o usar prop `compacto`

#### 2. **Acciones de Formulario** (5 usos)
```typescript
claseAdicional="accionesFormularioBotonEliminar"
claseAdicional="accionesFormularioBotonGuardar"
claseAdicional="accionesFormularioBotonCancelar"
```
**Archivos:** AccionesFormulario.tsx  
**Solución:** Eliminar clases, usar variantes existentes (peligro, primario, secundario)

#### 3. **Navegación Inferior** (10 usos)
```typescript
claseAdicional="navegacionInferiorItem navegacionInferiorItem--activo"
claseAdicional="navegacionInferiorFab navegacionInferiorFab--abierto"
claseAdicional="navegacionInferiorMenuFabItem"
```
**Archivos:** NavegacionInferior.tsx  
**Solución:** Crear prop `activo` + variante `navegacion`

#### 4. **Modal Login/Tabs** (8 usos)
```typescript
claseAdicional="loginTab activo"
claseAdicional="botonPrimario botonFull"
```
**Archivos:** ModalLogin.tsx  
**Solución:** Crear variante `pestaña` + prop `activo` + prop `anchoCompleto`

#### 5. **Modal Creación Rápida** (10 usos)
```typescript
claseAdicional="creacionRapidaBotonOpcion"
claseAdicional="creacionRapidaBotonEnviar"
```
**Archivos:** ModalCreacionRapida.tsx  
**Solución:** Crear variante `opcion` específica

#### 6. **Pestañas de Configuración** (4 usos)
```typescript
claseAdicional="panelConfiguracionPestana panelConfiguracionPestana--activa"
```
**Archivos:** ModalProyecto.tsx, PestanasModal.tsx  
**Solución:** Crear variante `pestaña` + prop `activo`

#### 7. **Modal Upgrade** (8 usos)
```typescript
claseAdicional="modalUpgrade__planOpcion modalUpgrade__planOpcion--activo"
claseAdicional="modalUpgrade__boton--primario"
```
**Archivos:** ModalUpgrade.tsx  
**Solución:** Usar variantes estándar + prop `activo` + prop `destacado`

#### 8. **Listas de Tareas/Hábitos** (5 usos)
```typescript
claseAdicional="listaTareasHabito__eliminar"
claseAdicional="listaTareasHabito__botonAgregar"
claseAdicional="tareaItemCompacto__toggle"
```
**Archivos:** ListaSubtareas.tsx, ListaTareasCompacta.tsx  
**Solución:** Usar variantes existentes (icono, peligro)

#### 9. **Botones de Modal Genéricos** (15 usos)
```typescript
claseAdicional="modalBotonCerrar"
claseAdicional="modalBotonVolver"
claseAdicional="modalCerrar"
```
**Archivos:** Modal.tsx, ModalInspeccionIA.tsx, otros modales  
**Solución:** Eliminar, usar variante `icono`

#### 10. **Botones Especializados** (resto)
- deficitCalorico: `deficitComidaBotonAccion`, `deficitHistorialPaginacionBoton`
- Landing: `landingNavBoton`
- Buscador: `buscadorLimpiar`
- NotaItem: `listaNotasItemBotonMenu`
- FormularioHabito: `formularioBotonAgregarTag`, `formularioTagEliminar`

---

## Plan de Acción

### Fase 1: Extensión del Sistema de Variantes (2-3 horas)

#### 1.1 - Agregar Nuevas Variantes a Boton
```typescript
// Props adicionales
interface PropsBoton {
    // ... props existentes
    activo?: boolean;           // Para pestañas, navegación
    anchoCompleto?: boolean;    // Para botones full-width
    compacto?: boolean;         // Para botones muy pequeños
    destacado?: boolean;        // Para llamar atención (pulse, glow)
}

// Nuevas variantes
type VarianteBoton = 
    | 'primario' | 'secundario' | 'peligro' 
    | 'icono' | 'ghost' | 'link'
    | 'pestaña'      // Para tabs/pestañas
    | 'navegacion'   // Para navegación inferior
    | 'badge'        // Para badges en paneles
    | 'opcion';      // Para opciones seleccionables
```

#### 1.2 - Crear Estilos para Nuevas Variantes en ui.css
```css
/* Variante pestaña */
.boton--pestaña {
    background: transparent;
    color: var(--dashboard-textoApagado);
    border-bottom: 2px solid transparent;
    border-radius: 0;
}

.boton--pestaña.boton--activo {
    color: var(--dashboard-textoActivo);
    border-bottom-color: var(--dashboard-acento);
}

/* Variante navegación */
.boton--navegacion {
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    color: var(--dashboard-textoApagado);
}

.boton--navegacion.boton--activo {
    color: var(--dashboard-acento);
}

/* Variante badge */
.boton--badge {
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 12px;
}

/* Variante opción */
.boton--opcion {
    background: var(--dashboard-fondoSecundario);
    border: 1px solid var(--dashboard-bordePrincipal);
    justify-content: flex-start;
}

.boton--opcion.boton--activo {
    background: var(--dashboard-acento);
    color: var(--dashboard-textoSobreAcento);
    border-color: var(--dashboard-acento);
}

/* Props adicionales */
.boton--anchoCompleto {
    width: 100%;
}

.boton--compacto {
    padding: 4px 8px;
    font-size: 11px;
}

.boton--destacado {
    position: relative;
    animation: pulse 2s infinite;
}
```

### Fase 2: Migrar Componentes por Categoría (5-6 horas)

#### 2.1 - Paneles (PanelScratchpad, PanelProyectos, PanelFocoPrioritario, PanelEjecucion)
**Antes:**
```tsx
<Boton 
    variante="icono" 
    claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono"
/>
```
**Después:**
```tsx
<Boton 
    variante="badge" 
    soloIcono 
/>
```

#### 2.2 - AccionesFormulario
**Antes:**
```tsx
<Boton claseAdicional="accionesFormularioBotonGuardar" />
<Boton claseAdicional="accionesFormularioBotonCancelar" />
```
**Después:**
```tsx
<Boton variante="primario" />
<Boton variante="secundario" />
```

#### 2.3 - NavegacionInferior
**Antes:**
```tsx
<Boton claseAdicional={`navegacionInferiorItem ${activo ? 'navegacionInferiorItem--activo' : ''}`} />
```
**Después:**
```tsx
<Boton variante="navegacion" activo={activo} />
```

#### 2.4 - ModalLogin
**Antes:**
```tsx
<Boton claseAdicional={`loginTab ${modo === 'login' ? 'activo' : ''}`} />
<Boton claseAdicional="botonPrimario botonFull" />
```
**Después:**
```tsx
<Boton variante="pestaña" activo={modo === 'login'} />
<Boton variante="primario" anchoCompleto />
```

#### 2.5 - ModalCreacionRapida
**Antes:**
```tsx
<Boton claseAdicional="creacionRapidaBotonOpcion" />
```
**Después:**
```tsx
<Boton variante="opcion" />
```

#### 2.6 - ModalProyecto / PestanasModal
**Antes:**
```tsx
<Boton claseAdicional={`panelConfiguracionPestana ${activa ? 'panelConfiguracionPestana--activa' : ''}`} />
```
**Después:**
```tsx
<Boton variante="pestaña" activo={activa} />
```

#### 2.7 - ModalUpgrade
**Antes:**
```tsx
<Boton claseAdicional={`modalUpgrade__planOpcion ${seleccionado ? 'modalUpgrade__planOpcion--activo' : ''}`} />
```
**Después:**
```tsx
<Boton variante="opcion" activo={seleccionado} destacado />
```

#### 2.8 - Listas (ListaSubtareas, ListaTareasCompacta)
**Antes:**
```tsx
<Boton claseAdicional="listaTareasHabito__eliminar" />
<Boton claseAdicional="tareaItemCompacto__toggle" />
```
**Después:**
```tsx
<Boton variante="peligro" tamano="pequeño" />
<Boton variante="icono" compacto />
```

#### 2.9 - Modales Genéricos
**Antes:**
```tsx
<Boton claseAdicional="modalBotonCerrar" />
```
**Después:**
```tsx
<Boton variante="icono" />
```

#### 2.10 - Componentes Especializados
- **deficitCalorico:** Revisar necesidad de estilos específicos
- **Landing:** Usar variante primario sin clases
- **Buscador:** Usar variante icono
- **NotaItem:** Usar variante icono
- **FormularioHabito:** Usar variante ghost + icono

### Fase 3: Limpieza de CSS (2-3 horas)

#### 3.1 - Identificar Archivos CSS Afectados
Buscar y analizar:
- `App/React/styles/dashboard/componentes/*.css`
- `App/React/styles/shared/*.css`
- Cualquier archivo con reglas para clases eliminadas

#### 3.2 - Eliminar Reglas Obsoletas
**Archivos a revisar:**
1. `paneles.css` - Eliminar `.selectorBadgeBoton*`
2. `formularios.css` - Eliminar `.accionesFormularioBoton*`
3. `navegacion.css` - Eliminar `.navegacionInferiorItem*`
4. `modales.css` - Eliminar `.modalBotonCerrar`, `.modalBotonVolver`
5. `modalCreacionRapida.css` - Eliminar `.creacionRapidaBotonOpcion`
6. `modalUpgrade.css` - Eliminar `.modalUpgrade__planOpcion*`
7. `listas.css` - Eliminar `.listaTareasHabito__*`, `.tareaItemCompacto__*`

#### 3.3 - Consolidar Variables
- Revisar variables duplicadas en diferentes archivos
- Mover todas a `variables.css`
- Eliminar redefiniciones

#### 3.4 - Reducir Archivos CSS
**Antes:** ~120 archivos CSS  
**Meta:** Consolidar en:
- `variables.css` (variables globales)
- `ui.css` (componentes atómicos)
- `layout.css` (layouts/grids)
- `utilidades.css` (clases helper)
- Archivos específicos de módulos complejos (ej: ayuno, arbitraje)

### Fase 4: Validación y Testing (1-2 horas)

#### 4.1 - Comparación Visual
- Screenshot de cada componente ANTES
- Screenshot de cada componente DESPUÉS
- Validar cero regresiones visuales

#### 4.2 - Testing Funcional
- Verificar hover states
- Verificar estados activos
- Verificar estados disabled/loading
- Verificar responsive (móvil/desktop)

#### 4.3 - Testing de Temas
- Verificar modo claro
- Verificar modo oscuro
- Verificar custom themes (si existen)

#### 4.4 - Performance
- Comparar tamaño total de CSS (antes/después)
- Verificar tiempo de carga
- Confirmar reducción de complejidad

---

## Métricas de Éxito

### Antes de la Centralización
- ❌ 100+ usos de `claseAdicional`
- ❌ ~120 archivos CSS dispersos
- ❌ Duplicación de estilos en múltiples lugares
- ❌ Difícil mantener consistencia visual
- ❌ ~50KB+ de CSS redundante (estimado)

### Después de la Centralización
- ✅ 0 usos de `claseAdicional` (excepto casos edge extremos)
- ✅ ~10-15 archivos CSS principales
- ✅ Sistema de variantes unificado
- ✅ Consistencia visual 100%
- ✅ Reducción estimada 30-40% en tamaño de CSS
- ✅ Un solo lugar para modificar estilos

---

## Roadmap de Ejecución

### Sprint 1: Preparación (0.5 día)
- [x] Análisis completo de clases duplicadas
- [x] Creación de este documento de planificación
- [ ] Diseño de nuevas variantes
- [ ] Aprobación de arquitectura

### Sprint 2: Extensión del Sistema (1 día)
- [ ] Agregar props: activo, anchoCompleto, compacto, destacado
- [ ] Crear variantes: pestaña, navegacion, badge, opcion
- [ ] Escribir estilos en ui.css
- [ ] Testing de nuevas variantes

### Sprint 3: Migración (2-3 días)
- [ ] Migrar Paneles (4 componentes)
- [ ] Migrar AccionesFormulario
- [ ] Migrar NavegacionInferior
- [ ] Migrar ModalLogin
- [ ] Migrar ModalCreacionRapida
- [ ] Migrar ModalProyecto + PestanasModal
- [ ] Migrar ModalUpgrade
- [ ] Migrar Listas
- [ ] Migrar Modales genéricos
- [ ] Migrar componentes especializados

### Sprint 4: Limpieza (1 día)
- [ ] Identificar CSS obsoleto
- [ ] Eliminar reglas no usadas
- [ ] Consolidar archivos
- [ ] Optimizar variables

### Sprint 5: Validación (0.5 día)
- [ ] Testing visual
- [ ] Testing funcional
- [ ] Testing de temas
- [ ] Medición de performance

### Sprint 6: Documentación (0.5 día)
- [ ] Actualizar documentación de componentes
- [ ] Crear guía de variantes
- [ ] Documentar props disponibles
- [ ] Crear ejemplos de uso

**Total estimado:** 5-7 días de trabajo

---

## Riesgos y Mitigaciones

### Riesgo 1: Regresiones Visuales
**Impacto:** Alto  
**Probabilidad:** Media  
**Mitigación:** Screenshots antes/después, testing exhaustivo

### Riesgo 2: Pérdida de Funcionalidad
**Impacto:** Alto  
**Probabilidad:** Baja  
**Mitigación:** Testing funcional componente por componente

### Riesgo 3: CSS Roto en Producción
**Impacto:** Crítico  
**Probabilidad:** Baja  
**Mitigación:** Deploy gradual, rollback plan, feature flags

### Riesgo 4: Sobreingeniería de Variantes
**Impacto:** Medio  
**Probabilidad:** Media  
**Mitigación:** Mantener variantes al mínimo, preferir props cuando tenga sentido

---

## Notas Técnicas

### Decisiones de Diseño

#### ¿Por qué eliminar `claseAdicional` completamente?
1. **Consistencia:** Un único sistema de estilos
2. **Mantenibilidad:** Cambios en un solo lugar
3. **Previsibilidad:** Comportamiento uniforme
4. **Performance:** Menos CSS, más cache hits
5. **DX:** Autocompletado de TypeScript para todas las opciones

#### ¿Cuándo mantener `claseAdicional`?
Solo para casos extremadamente específicos:
- Animaciones únicas de un solo componente
- Estilos de layout que no son del botón (ej: margin específico)
- Clases de terceros (ej: librerías CSS externas)

**Regla:** Si se usa `claseAdicional` más de 2 veces, debe convertirse en una variante o prop.

#### Orden de Clases en Boton.tsx
```typescript
const clases = [
    'boton',
    `boton--${variante}`,
    tamano && `boton--${tamano}`,
    cargando && 'boton--cargando',
    soloIcono && 'boton--soloIcono',
    activo && 'boton--activo',
    anchoCompleto && 'boton--anchoCompleto',
    compacto && 'boton--compacto',
    destacado && 'boton--destacado',
    claseAdicional // Solo en casos extremos
].filter(Boolean).join(' ');
```

---

## Recursos

### Comandos Útiles

```bash
# Buscar todos los usos de claseAdicional
grep -r "claseAdicional" App/React/components/**/*.tsx

# Buscar reglas CSS específicas
grep -r "selectorBadgeBoton" App/React/styles/**/*.css

# Medir tamaño total de CSS
find App/React/styles App/Assets/css -name "*.css" -exec du -ch {} + | grep total

# Encontrar archivos CSS no importados
# (requiere análisis manual de imports)
```

### Referencias
- [BEM Methodology](http://getbem.com/)
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/)
- [CSS Architecture Best Practices](https://www.smashingmagazine.com/2018/05/guide-css-layout/)

---

## Log de Cambios

**12 feb 2026 - v1.0**
- Documento inicial creado
- Análisis completo de 100+ usos de claseAdicional
- Plan de 6 sprints definido
- Métricas y riesgos documentados

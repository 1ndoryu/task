# Patrones de Diseño Móvil - Dashboard de Productividad

Guía de patrones y convenciones para el desarrollo de la versión móvil (PWA).

---

## Breakpoints

| Nombre     | Variable CSS             | Valor  | Uso       |
| ---------- | ------------------------ | ------ | --------- |
| Móvil      | `--breakpointMovil`      | 480px  | Teléfonos |
| Tablet     | `--breakpointTablet`     | 768px  | Tablets   |
| Escritorio | `--breakpointEscritorio` | 1024px | Desktop   |

### Uso en Media Queries

```css
/* Solo móvil */
@media (max-width: 480px) { ... }

/* Tablet y menor */
@media (max-width: 768px) { ... }

/* Solo desktop */
@media (min-width: 1024px) { ... }
```

---

## Espaciado Táctil

### Variables Disponibles

| Variable                         | Valor    | Uso                                    |
| -------------------------------- | -------- | -------------------------------------- |
| `--dashboard-tamanoTactilMinimo` | 44px     | Tamaño mínimo de elementos clickeables |
| `--dashboard-espacioTactil`      | 8px      | Espaciado entre elementos interactivos |
| `--dashboard-espacioMovilXs`     | 0.125rem | Micro espaciado                        |
| `--dashboard-espacioMovilSm`     | 0.25rem  | Espaciado pequeño                      |
| `--dashboard-espacioMovilMd`     | 0.5rem   | Espaciado medio                        |
| `--dashboard-espacioMovilLg`     | 0.75rem  | Espaciado grande                       |

### Reglas de Diseño Táctil

1. **Mínimo 44x44px** para todo elemento clickeable
2. **8px de separación** mínima entre elementos interactivos
3. **Padding aumentado** en botones y items de lista

---

## Tipografía Móvil

| Variable                         | Valor | Uso              |
| -------------------------------- | ----- | ---------------- |
| `--dashboard-tamanoMovilBase`    | 14px  | Texto normal     |
| `--dashboard-tamanoMovilPequeno` | 12px  | Texto secundario |

### Consideraciones

- Aumentar legibilidad en pantallas pequeñas
- Evitar texto menor a 12px
- Preferir alto contraste

---

## Componentes Móvil

### Modal Fullscreen

En móvil (< 480px), todos los modales ocupan 100vh con:

- Header sticky con botón "← Volver"
- Contenido scrolleable con `-webkit-overflow-scrolling: touch`
- Sin bordes redondeados
- Ocultar botón X de cierre

```tsx
/* El Modal.tsx detecta automáticamente el viewport móvil */
<Modal estaAbierto={true} onCerrar={cerrar} titulo="Título">
  {/* Contenido */}
</Modal>
```

### BottomSheet

Menús que se deslizan desde abajo en móvil:

```tsx
import {BottomSheet} from '../shared';

<BottomSheet estaAbierto={abierto} onCerrar={cerrar} titulo="Opciones">
  <button className="bottomSheetItem">Opción 1</button>
  <button className="bottomSheetItem">Opción 2</button>
  <div className="bottomSheetSeparador" />
  <button className="bottomSheetItem bottomSheetItem--peligro">Eliminar</button>
</BottomSheet>
```

### Clases de Utilidad

```css
/* Ocultar en móvil */
.ocultarEnMovil { }

/* Mostrar solo en móvil */
.mostrarSoloEnMovil { }

/* Ocultar en tablet y menor */
.ocultarEnTablet { }

/* Mostrar solo en tablet */
.mostrarSoloEnTablet { }
```

---

## Navegación Móvil

### Header Compacto

```
┌─────────────────────────────────────┐
│  ☰  │    Logo/Título       │  🔍   │
└─────────────────────────────────────┘
```

- **Izquierda**: Hamburguesa (abre drawer)
- **Centro**: Logo o título de sección
- **Derecha**: Búsqueda

### Navegación Inferior

```
┌─────────────────────────────────────┐
│  🏠  │  💬  │  ➕  │  🔔  │  👤  │
│ Home │ Chat │ Add  │ Noti │ Perfil│
└─────────────────────────────────────┘
```

- Fija en la parte inferior
- FAB central destacado para crear
- Altura: 60px + safe-area-inset-bottom

### Drawer Lateral

- Ancho: 280px (max 80vw)
- Se desliza desde la izquierda
- Overlay oscuro al abrir
- Swipe para cerrar

---

## Gestos Táctiles

### Swipe en Listas

| Dirección   | Acción                      |
| ----------- | --------------------------- |
| Derecha →   | Completar tarea/hábito      |
| ← Izquierda | Eliminar (con confirmación) |

### Pull to Refresh

- Activo en listas principales
- Indicador visual de carga
- Fuerza sincronización con servidor

---

## Safe Areas

Para dispositivos con notch o barra de navegación en pantalla:

### Variables CSS Disponibles

```css
--dashboard-safeAreaTop: env(safe-area-inset-top, 0px);
--dashboard-safeAreaBottom: env(safe-area-inset-bottom, 0px);
--dashboard-safeAreaLeft: env(safe-area-inset-left, 0px);
--dashboard-safeAreaRight: env(safe-area-inset-right, 0px);
```

### Clases Utilitarias

| Clase                    | Descripción                          |
| ------------------------ | ------------------------------------ |
| `.contenedorConSafeArea` | Padding en los 4 lados con safe area |

### Componentes con Safe Area Automático

Los siguientes componentes ya incluyen safe areas en móvil:

- `.dashboardEncabezado` - padding-top con safe area
- `.navegacionInferior` - padding-bottom con safe area
- `.drawerMovilPanel` - padding-left con safe area
- `.modalMovil` - padding top/bottom con safe area
- `.bottomSheet` - padding-bottom con safe area

---

## Checklist de Componente Móvil

- [ ] Elementos clickeables >= 44x44px
- [ ] Espaciado táctil adecuado (8px entre elementos)
- [ ] Ocultar elementos innecesarios en móvil
- [ ] Modales usan fullscreen
- [ ] Menús contextuales usan BottomSheet
- [ ] Tipografía legible (>= 12px)
- [ ] Scroll suave (-webkit-overflow-scrolling: touch)
- [ ] Safe areas consideradas

---

## Archivos Relevantes

| Archivo                                        | Descripción                             |
| ---------------------------------------------- | --------------------------------------- |
| `styles/dashboard/variables.css`               | Variables breakpoints y espaciado móvil |
| `styles/dashboard/movil.css`                   | Media queries base                      |
| `styles/dashboard/componentes/modal.css`       | Modal fullscreen                        |
| `styles/dashboard/componentes/bottomSheet.css` | Bottom sheet                            |
| `components/shared/Modal.tsx`                  | Componente modal con botón volver       |
| `components/shared/BottomSheet.tsx`            | Componente bottom sheet                 |

---

*Documento creado: Fase 10.1 - Fundamentos CSS Móvil*

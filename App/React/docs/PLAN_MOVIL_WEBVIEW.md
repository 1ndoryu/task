# Plan de Implementación: Versión Móvil para WebView

**Fecha:** 2026-01-11  
**Contexto:** Aplicación será embebida en WebView nativo  
**Estrategia:** Optimizar la web responsive, sin PWA completa

---

## Estado Actual

### Completado ✅
| Componente        | Descripción                             |
| ----------------- | --------------------------------------- |
| Breakpoints       | Variables CSS para móvil/tablet/desktop |
| `movil.css`       | Media queries base, clases utilitarias  |
| Modal Fullscreen  | Modales ocupan 100vh en móvil           |
| BottomSheet       | Componente para menús desde abajo       |
| Una columna       | Grid forzado a una columna en móvil     |
| Buscador móvil    | Modal fullscreen con búsqueda           |
| Menú móvil básico | Grid de acciones en overlay             |

### Por Implementar 🔲
| Prioridad | Componente           | Descripción                           |
| --------- | -------------------- | ------------------------------------- |
| Alta      | DrawerMovil          | Navegación deslizable desde izquierda |
| Alta      | HeaderMovil          | Header compacto con hamburguesa       |
| Alta      | Integrar BottomSheet | Conectar con MenuContextual           |
| Media     | NavegacionInferior   | Barra fija inferior + FAB             |
| Media     | Swipe en listas      | Gestos táctiles                       |
| Baja      | Pull to refresh      | Actualización por gesto               |

---

## Fase 1: Drawer + Header Móvil (Actual)

### 1.1 Componente DrawerMovil.tsx

**Ubicación:** `components/shared/DrawerMovil.tsx`

**Responsabilidades:**
- Panel que se desliza desde la izquierda
- Overlay oscuro al abrir
- Cerrar con swipe/click fuera
- Contiene: navegación, perfil de usuario, acciones

**Props:**
```typescript
interface DrawerMovilProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    usuario: { nombre: string; avatar?: string };
    suscripcion?: InfoSuscripcion | null;
    opciones: OpcionDrawer[];
    onSeleccionar: (opcionId: string) => void;
}

interface OpcionDrawer {
    id: string;
    etiqueta: string;
    icono: React.ReactNode;
    badge?: number;
    peligroso?: boolean;
    separadorDespues?: boolean;
}
```

### 1.2 Componente HeaderMovil.tsx

**Ubicación:** `components/shared/HeaderMovil.tsx`

**Layout:**
```
┌─────────────────────────────────────┐
│  ☰  │    Logo/Título       │  🔍   │
└─────────────────────────────────────┘
```

**Responsabilidades:**
- Solo visible en móvil (<768px)
- Botón hamburguesa abre DrawerMovil
- Centro: título de la app o sección
- Derecha: icono de búsqueda

**Props:**
```typescript
interface HeaderMovilProps {
    titulo: string;
    onAbrirDrawer: () => void;
    onAbrirBusqueda: () => void;
    notificaciones?: number;
}
```

### 1.3 Integración con DashboardEncabezado

El header actual ya tiene:
- `botonMenuMovil` y `botonBuscadorMovil` 
- `menuMovilOverlay` con grid de acciones
- Modal de búsqueda fullscreen

**Cambio propuesto:**
1. Reemplazar `menuMovilOverlay` por `DrawerMovil`
2. El header desktop se oculta en móvil
3. `HeaderMovil` aparece solo en móvil

---

## Fase 2: BottomSheet para MenuContextual

### Objetivo
En móvil, los menús contextuales (click derecho) deben usar BottomSheet.

### Estrategia
1. Crear hook `useEsMovil()` para detectar viewport
2. En `MenuContextual.tsx`, detectar y renderizar BottomSheet
3. Mismas opciones, diferente UI

---

## Fase 3: Navegación Inferior (Opcional para WebView)

### Decisión
Si la app nativa tiene su propia navegación, saltamos esto.
Si no, implementamos:

```
┌─────────────────────────────────────┐
│  🏠  │  📋  │  ➕  │  🔔  │  👤  │
│ Home │Tareas│ Add  │ Noti │ Perfil│
└─────────────────────────────────────┘
```

---

## Fase 4: Gestos Táctiles

### Swipe en Listas
- Swipe derecha: completar
- Swipe izquierda: eliminar

### Pull to Refresh
- Indicador visual al tirar hacia abajo
- Sincronizar con servidor

---

## Prioridades de Implementación

| Orden | Tarea                                  | Archivos                      | Tiempo Est. |
| ----- | -------------------------------------- | ----------------------------- | ----------- |
| 1     | DrawerMovil.tsx                        | components/shared/            | 30 min      |
| 2     | drawerMovil.css                        | styles/dashboard/componentes/ | 20 min      |
| 3     | HeaderMovil.tsx                        | components/shared/            | 20 min      |
| 4     | Refactorizar DashboardEncabezado       | Integrar nuevos componentes   | 30 min      |
| 5     | Integrar BottomSheet en MenuContextual | Modificar MenuContextual.tsx  | 40 min      |
| 6     | Hook useEsMovil                        | hooks/                        | 10 min      |
| 7     | Pruebas y ajustes                      | -                             | 30 min      |

**Tiempo total estimado:** ~3 horas

---

## Notas para WebView

1. **Sin PWA**: No es necesario manifest.json ni Service Worker
2. **Viewport**: Asegurar `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`
3. **Safe Areas**: Usar `env(safe-area-inset-*)` para dispositivos con notch
4. **Touch events**: Evitar delay de 300ms con `touch-action: manipulation`
5. **Scroll suave**: `-webkit-overflow-scrolling: touch`

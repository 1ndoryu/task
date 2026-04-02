# Plan: Panel Grupos FB — Fixes y mejoras (02 abril 2026)

## Análisis raíz

### Problema principal: Sync roto entre extensión y app

Se identificaron **5 bugs de sincronización**:

1. **`fullSyncWithApi` pierde datos del usuario:**  
   La función convierte `GroupData` → `DetectedGroup` y esa interfaz NO incluye category/importance/hidden/notes.
   Resultado: el full sync envía grupos sin sus metadatos de usuario.

2. **`SAVE_ENVIRONMENT` no dispara sync:**  
   El extension dashboard llama `SAVE_ENVIRONMENT` al cambiar cat/imp/hidden de un grupo, pero NO hay sync posterior.
   El cambio se guarda en `chrome.storage.local` y nunca llega al servidor.

3. **UPSERT PHP: categoría '' sobrescribe:**  
   `$wpdb->prepare` convierte null → '' para `%s`. `COALESCE('', categoria)` retorna '' (no null).
   Toda categoría existente se borra en cada sync donde no hay override.

4. **UPSERT PHP: oculto se sobrescribe incondicionalmente:**  
   `oculto = VALUES(oculto)` siempre aplica. Si no hay override → `oculto: 0` → deshace el "ocultar" del app.

5. **Polling solo detecta cambio en total:**  
   `stats.total !== ultimoTotalRef.current` no detecta cambios en cat/imp/oculto de un grupo existente.

### Otros bugs

6. **"Público" en columna miembros:**  
   Discover page extrae texto antes de `•` pero Facebook puede usar `·` (middle dot).
   Si no hay separador correcto, memberCount obtiene "Público · 1 mill. miembros" completo.

7. **Menú contextual no se cierra:**  
   `onCerrar` es inline arrow function (nueva ref cada render). Al abrir link en nueva pestaña, no hay click en documento → menú queda abierto.

8. **Doble clase panelDashboard:**  
   DashboardGrid wrapa en `className="panelDashboard"`. PanelGruposFb repite `className="panelDashboard internaColumna"`.

9. **Sin ordenamiento:**  
   Headers de tabla no tienen onClick ni estado de sort.

---

## Tareas (orden de ejecución: hardest first)

### 024A-23: Fix sync architecture
**Archivos:**
- `Extensión/fb-group-manager/src/background.ts` — Fix fullSyncWithApi, add sync trigger on SAVE_ENVIRONMENT y UPDATE_GROUP
- `App/Repository/GruposFbRepository.php` — Fix UPSERT: CASE para categoria y oculto
- `App/React/hooks/paneles/usePanelGruposFb.ts` — Polling detecte hash además de total

**Cambios:**
1. **background.ts: fullSyncWithApi** — incluir base group cat/imp/hidden si no hay env override
2. **background.ts: SAVE_ENVIRONMENT handler** — después de guardar, llamar `syncSingleGroupWithApi(grupoId, override)` o full sync
3. **background.ts: UPDATE_GROUP handler** — después de guardar, sync el grupo modificado
4. **GruposFbRepository.php UPSERT** — cambiar:
   - `categoria = COALESCE(VALUES(categoria), categoria)` → `CASE WHEN VALUES(categoria) != '' THEN VALUES(categoria) ELSE categoria END`
   - `oculto = VALUES(oculto)` → `CASE WHEN VALUES(oculto) >= 0 THEN VALUES(oculto) ELSE oculto END`
5. **background.ts payload** — enviar `oculto: -1` cuando no hay override (PHP interpretará como "no cambiar")
6. **usePanelGruposFb.ts** — forzar recarga completa cada 4 polls (2 min) independiente del total
7. **GruposFbRepository.php stats** — agregar hash/lastModified para detección de cambios

### 024A-24: Fix "Público" en columna miembros
**Archivos:**
- `Extensión/fb-group-manager/src/content-scripts/group-detector.ts` — Fix discover extraction
**Cambios:**
- Discover page: split en `•` Y `·` (ambos separadores)
- Después de split: si parts[0] NO contiene dígitos, probar parts[1]
- Group page: usar regex para extraer solo el número + "miembros"

### 024A-25: Fix menú contextual
**Archivos:**
- `App/React/components/paneles/PanelGruposFb.tsx`
**Cambios:**
- Wrap onCerrar en useCallback
- Agregar efecto para cerrar menú en window blur
- Cerrar menú contextual cuando se abre un link (en manejarSeleccionMenu, cerrar ANTES de window.open)

### 024A-26: Doble panelDashboard
**Archivos:**
- `App/React/components/paneles/PanelGruposFb.tsx`
- `App/React/components/paneles/PanelActividad.tsx`
- `App/React/components/paneles/PanelIA.tsx`
- `App/React/components/paneles/PanelScratchpad.tsx`
**Cambios:**
- Remover `panelDashboard` de className, dejar solo `internaColumna` (+ variantes)

### 024A-27: Ordenamiento por columnas
**Archivos:**
- `App/React/hooks/paneles/usePanelGruposFb.ts` — estado de sort + lógica
- `App/React/components/paneles/PanelGruposFb.tsx` — onClick en headers
- `App/React/styles/dashboard/componentes/panelGruposFb.css` — cursor pointer + indicador visual
**Cambios:**
- Estado: `{campo: ColumnId, direccion: 'asc' | 'desc'}`
- Click: toggle dirección si mismo campo, else nuevo campo asc
- Aplicar sort después del filtrado, antes del slice

### 024A-28: Polling inteligente
**Archivos:**
- `App/React/hooks/paneles/usePanelGruposFb.ts`
- `App/Repository/GruposFbRepository.php` (stats endpoint)
**Cambios:**
- Forzar reload completo cada 4 polls (cada 2 min)

### 024A-29: Tooltips
**Archivos:**
- `App/React/components/paneles/FilaGrupo.tsx`
**Cambios:**
- Agregar title en celdas con overflow (nombre, miembros, categoría)

### 024A-30: Gestión de categorías
**Archivos por definir** — Implementar después de los fixes anteriores

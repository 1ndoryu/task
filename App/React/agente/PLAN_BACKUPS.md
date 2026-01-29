# Plan de Sistema de Copias de Seguridad y Refactorización

> **Referencia:** Tarea solicitada en `ROADMAP_TASK.md`

Este documento detalla el plan de implementación para el sistema de copias de seguridad (Backups) exclusivo para usuarios Premium, asegurando la integridad de los datos y el cumplimiento de principios SOLID en el sistema de sincronización.

---

## 1. Objetivos Principales

1.  **Sistema de Backups (Premium):**
    *   Generar una copia de seguridad automática con cada cambio sincronizado exitosamente.
    *   Almacenar estas copias en el almacenamiento asignado al usuario (Server-side).
    *   Interfaz de usuario para visualizar historial y restaurar versiones anteriores.
    *   Excluir archivos adjuntos (se gestionan por separado).

2.  **Refactorización de Sincronización (SOLID):**
    *   Desacoplar la lógica de detección de cambios de la lógica de transporte.
    *   Asegurar que `useDashboardSync` y `useSincronizacion` tengan responsabilidades únicas.
    *   Mejorar la robustez ante fallos de red y conflictos.

3.  **Actualización Lógica Premium:**
    *   Revisar y modernizar la diferenciación Free vs Premium.
    *   Centralizar la validación de límites y características.

---

## 2. Refactorización del Sistema de Sincronización (SOLID)

Actualmente `useDashboardSync` mezcla la gestión de estado local, detección de cambios (hashing) y coordinación con `useSincronizacion`.

### 2.1 Nueva Arquitectura de Hooks

*   **`useChangeDetector` (SRP: Detectar cambios):**
    *   Input: Estado actual (hábitos, tareas, etc.).
    *   Logic: Hash profundo o comparación inteligente.
    *   Output: `hasChanges`, `changesPayload`, `versionHash`.
    *   *Mejora:* Usar un sistema de "dirty flags" más granular si es posible, o optimizar el `JSON.stringify`.

*   **`useSyncTransport` (SRP: Comunicación Transporte):**
    *   Responsable de la comunicación HTTP, reintentos (Exponential Backoff), y manejo de estado de red (Offline/Online).
    *   No sabe *qué* está sincronizando, solo transporta payloads.

*   **`useSyncManager` (SRP: Orquestación):**
    *   Coordina `useChangeDetector` y `useSyncTransport`.
    *   Maneja la lógica de "Debounce" y resolución de conflictos (Last Write Wins vs Merge).
    *   Maneja la carga inicial segura.

### 2.2 Flujo de Datos

1.  Usuario modifica una tarea -> Store actualiza estado.
2.  `useChangeDetector` detecta discrepancia con `savedState`.
3.  `useSyncManager` espera (debounce 2s).
4.  `useSyncManager` solicita transporte a `useSyncTransport`.
5.  **Critico:** Si es Premium, el Payload incluye flag `generateBackup: true` (o el backend lo infiere).

---

## 3. Sistema de Copias de Seguridad (Backups)

### 3.1 Backend (Requisitos API)

Necesitaremos endpoints específicos en el plugin/backend de WordPress:

*   `GET /wp-json/glory/v1/backups`: Listar copias disponibles (ID, Fecha, Tamaño, Dispositivo, Hash).
*   `POST /wp-json/glory/v1/backups/restore`: Restaurar una copia específica (sobrescribe estado actual).
    *   *Nota:* No necesitamos `POST /backups` para crear, ya que se generarán automáticamente en el endpoint de `sync` si el usuario es Premium.

### 3.2 Almacenamiento y Cuotas

*   Las copias son snapshots JSON comprimidos (gzip).
*   Se descuentan del `InfoAlmacenamiento` del usuario.
*   Política de retención (opcional futura): Guardar últimos 100 cambios, o rotación por tiempo (1 día, 1 semana). Por ahora: "Cada cambio".

### 3.3 Frontend (UI/UX)

*   **Ubicación:** Menú contextual de usuario (Avatar en sidebar/header) -> "Copias de Seguridad".
*   **Componente Modal `BackupHistoryModal`:**
    *   Lista cronológica de versiones.
    *   Indicadores visuales de cambios (si el backend retorna diffs) o simplemente timestamps.
    *   Botón "Restaurar" con confirmación crítica ("Esto reemplazará tus datos actuales").
    *   Indicador de espacio usado por backups.

---

## 4. Checklist de Implementación Detallada

### Fase 1: Refactorización Sync (SOLID) 🏗️
- [x] **1.1 Extraer `useChangeDetector`**
    - [x] Crear nuevo hook `useChangeDetector.ts`.
    - [x] Mover lógica de `JSON.stringify` y detección de hash.
    - [x] Implementar salidas: `hasChanges`, `changesPayload`, `versionHash`.
- [x] **1.2 Crear `useSyncTransport`**
    - [x] Crear nuevo hook `useSyncTransport.ts`.
    - [x] Migrar lógica de llamadas API (Axios/Fetch).
    - [x] Implementar manejo de errores y reintentos (backoff).
- [x] **1.3 Orquestador `useSyncManager`**
    - [x] Crear nuevo hook `useSyncManager.ts`.
    - [x] Integrar detector y transporte.
    - [x] Configurar lógica de Debounce (2s).
    - [x] **Validación:** Verificar que la sync actual funciona igual que antes (sin regresiones).

### Fase 2: Lógica Premium 💎
- [x] **2.1 Auditoría de Suscripción**
    - [x] Revisar `useSuscripcion` para asegurar fuente de verdad única.
    - [x] Limpiar validaciones dispersas.
- [x] **2.2 Validaciones de Límites**
    - [x] Centralizar reglas de negocio (Backups activados solo para Premium).

### Fase 3: Implementación Backups 💾
- [x] **3.1 Hook `useBackups`**
    - [x] Implementar función `fetchHistory`.
    - [x] Implementar función `restoreBackup`.
- [x] **3.2 UI Component (`BackupHistoryModal`)**
    - [x] Crear estructura del modal y estilos.
    - [x] Conectar lista de versiones reales.
    - [x] Implementar botón de restauración con confirmación de seguridad.
- [ ] **3.3 Integración Final**
    - [x] Añadir opción "Copias de Seguridad" en menú de usuario.
    - [x] Modificar `useSyncManager` para enviar flag `generateBackup` si es Premium.
    - [x] **Backend:** Implementar endpoints y lógica de guardado de snapshots.
    - [ ] **Test:** Verificar creación de backup tras cambio y restauración exitosa.

---

## 5. Notas Técnicas y Riesgos

*   **Consistencia:** Al restaurar un backup, el cliente debe bloquearse hasta confirmar que el servidor y el cliente están alineados (Force Sync).
*   **Espacio:** JSONs grandes (100kb+) generados cada 2 segundos pueden llenar cuotas rápido.
    *   *Mitigación:* Backend debe implementar deduplicación o diffs. Frontend asume que es "caja negra".
*   **Archivos:** Recordar excluir `Adjuntos` del blob JSON si estos se manejan por referencia (URLs). El backup guarda los metadatos (URLs), pero no los binarios.

---

## 6. Actualizaciones Recientes

*   Se normalizan fechas y metadatos de backups en UI para evitar `Invalid Date`.
*   Se agregó eliminación de backups desde el modal.
*   Se aplicó retención: 1 backup cada 30 minutos y eliminación de copias mayores a 30 días.
*   Se compactaron acciones del modal y se eliminó el padding del contenedor principal.

### TO-DO Arquitectura

*   Exponer la política de retención (intervalo y días) desde configuración global para evitar constantes rígidas.


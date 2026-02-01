# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.20-beta (2026-02-01)
**Foco:** Optimizaciones Móviles y Versión Híbrida (APK)

---

## Fases Futuras 🚀

### Fase 12: Gestión de Tiempo (Time Tracking) ⏱️

**Prioridad:** Baja | **Urgencia:** Chill

#### 12.1 Diseño y Planificación
- [ ] Definir modelo de datos y diseño UI del cronómetro
- [ ] Definir integración con hábitos (botón play)

#### 12.2 Implementación
- [ ] Componente `Cronometro`, Hook `useTimeTracking`
- [ ] Reportes de tiempo invertido

### Fase 13: Transformación a App Móvil Híbrida (Capacitor & Play Store) 📱

**Prioridad:** Alta (En Progreso) | **Complejidad:** Alta

#### 13.1 Infraestructura Híbrida (Capacitor)
- [x] Inicializar Capacitor en el proyecto (`npx cap init`).
- [x] Generar proyecto Android (`npx cap add android`).
- [x] Configurar `capacitor.config.json` (server url vs bundled web assets).
- [x] **Hito:** Generar APK Demo (sin pagos nativos) para pruebas internas.

#### 13.2 Gestión de Pagos Nativos (Google Play Billing)
- [ ] Implementar **RevenueCat** como wrapper de pagos.
- [ ] Crear Hook `usePagos` (Factory/Strategy pattern) para alternar entre Stripe (Web) y RevenueCat (App).

#### 13.3 Autenticación Nativa (UX Móvil) 🔐
- [x] Implementar `@capacitor-community/google-auth` (usando `@codetrix-studio/capacitor-google-auth`).
- [x] Configurar Keystore SHA-1 en Consola de Google Cloud.
- [x] Reemplazar redirección web por `GoogleAuth.signIn()` nativo.
  - *Beneficio:* Detecta cuentas del teléfono ("Continuar como Juan...").
- [!] **Bloqueo Actual:** Error `Code 10` (Developer Error) persiste tras limpieza.
  - **Estado:**
    - [x] SHA-1 Debug coincide con consola Google.
    - [x] Web Client ID configurado en `capacitor.config.json`.
    - [x] Limpieza de proyecto (Clean/Rebuild/Uninstall) realizada sin éxito.
    - [x] **NUEVO:** Signing Config explícito añadido a `build.gradle`.
    - [x] **NUEVO:** Placeholder `google-services.json` creado (requiere completar).
  - **Próximos Pasos (Acción Requerida Usuario):**
    1. **Descargar google-services.json real:** Ir a Firebase Console → Crear proyecto → Añadir app Android (`com.taskNakomi.app`) con SHA-1 debug → Descargar y reemplazar el placeholder en `android/app/`.
    2. **Verificar Web Client ID:** El `serverClientId` en `capacitor.config.json` debe ser tipo "Web application" (NO Android).
    3. **Pantalla de Consentimiento:** Verificar en Google Cloud que esté en modo "Testing" con tu email invitado, o en "Production".
    4. **Rebuild:** Ejecutar `npx cap sync android` y luego Build desde Android Studio.

---

### 🛠️ Comandos de Diagnóstico (Android/Capacitor)

**1. Verificar SHA-1 Debug Keystore:**
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**2. Sincronizar Cambios de Capacitor (Config):**
```powershell
npx cap sync android
```


#### 13.4 Publicación y Compliance
- [ ] Adaptar UI para Safe Areas de móviles (Notch, Home Indicator).
- [ ] Generar assets de tienda (iconos, screenshots).
- [ ] Proceso de validación de Google (TWA / Native Wrapper).

### Fase 14: Mejoras Pendientes (Pre-Beta)

#### 14.5 Planificación de Estructura (Sidebar)
- [ ] **Análisis de Navegación Lateral:** Evaluar sidebar fijo a la izquierda para soportar futuras vistas (Calendario, Wiki).

#### 14.6 Deuda Técnica Visual 🚧
- [ ] Auditar modales de configuración restantes para usar `var(--...)`.

### Extra: Scratchpad + File Manager
- [ ] Guardar notas del Scratchpad.
- [ ] File Manager (Vista explorador, agrupación por proyecto).

### Extra: Compartir Hábitos
- [ ] Ver estado de cumplimiento de compañeros.
- [ ] Notificaciones de logros compartidos.

### Extra: Gamificación y Social
- [ ] Niveles, badges, feed de actividad.

### Pendientes de Cifrado Avanzado (Fase 4)
- [ ] Opción de separar datos cifrados de no cifrados en sincronización.

---

## Notas Técnicas

### Archivos Clave para Fase 15:
- **Actividad:** `actividadService.ts`, `PanelActividad.tsx`, `useActividad.ts`
- **Suscripción:** `useSuscripcion.ts`, `types/dashboard.ts`
- **Notas:** `useNotas.ts`, `notasStore.ts`, `ModalNotasExpandido.tsx`, `ListaNotasGuardadas.tsx`
- **Inputs:** `styles/variables.css`, componentes de formularios

### Principios a Seguir:
1. **SRP:** Cada componente/hook una sola responsabilidad
2. **DIP:** Depender de abstracciones (interfaces de suscripción centralizadas)
3. **OCP:** Extender por composición (HOC/hooks de guards)
4. **Sin parches:** Refactorizaciones completas, no fixes superficiales

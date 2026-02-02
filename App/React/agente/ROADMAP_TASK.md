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

**Prioridad:** Alta | **Estado:** 🔄 En Progreso | **Complejidad:** Alta

#### 13.1 Infraestructura Híbrida (Capacitor)
- [x] Inicializar Capacitor en el proyecto (`npx cap init`).
- [x] Generar proyecto Android (`npx cap add android`).
- [x] Configurar `capacitor.config.json` (server url vs bundled web assets).
- [x] **Hito:** APK Debug funcional con autenticación Google nativa.

#### 13.2 Gestión de Pagos Nativos (Google Play Billing)
- [ ] Implementar **RevenueCat** como wrapper de pagos.
- [ ] Crear Hook `usePagos` (Factory/Strategy pattern) para alternar entre Stripe (Web) y RevenueCat (App).

#### 13.3 Autenticación Nativa (UX Móvil) 🔐
- [x] Implementar autenticación nativa con Google Sign-In
- [x] Configurar Keystore SHA-1 en Consola de Google Cloud
- [x] Crear Android OAuth Client con SHA-1
- [x] Crear plugin Capacitor personalizado `GoogleAuthNativePlugin`
- [x] Implementar usando librería oficial `play-services-auth:21.0.0`
- [x] Integrar con `useAuth.ts` para plataforma nativa
- [x] **COMPLETADO:** Login con Google funciona correctamente en APK
  - **Solución implementada:** Plugin nativo personalizado sin dependencias problemáticas
  - **Client IDs configurados:** Android + Web (para serverAuthCode)
  - **Archivos clave:**
    - ✅ `GoogleAuthNativePlugin.java` - Plugin nativo Capacitor
    - ✅ `plugins/GoogleAuthNative.ts` - Interface TypeScript
    - ✅ `hooks/useAuth.ts` - Integración con flujo de autenticación
    - ✅ `capacitor.config.json` - Configuración de Client IDs
    - ✅ `app/build.gradle` - Dependencia play-services-auth
  - **Testing:** ✅ Verificado en dispositivo real (Error 10 resuelto)

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


#### 13.3.1 Páginas Legales (OAuth Compliance) 📄

**Prioridad:** Media | **Complejidad:** Baja | **Estado:** ✅ COMPLETADO

- [x] **Política de Privacidad** (`/politica-privacidad`)
- [x] **Términos de Servicio** (`/terminos-servicio`)
- [x] Islands de React creadas y páginas públicas accesibles
- [ ] **OPCIONAL:** Configurar URLs en OAuth Consent Screen (para verificación futura)
  - Nota: No requerido para testing en modo desarrollo
  - Necesario solo para publicación en Play Store
- [ ] **PENDIENTE:** Página de Soporte/Contacto (`/soporte`)

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

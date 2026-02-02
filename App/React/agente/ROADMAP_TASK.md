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

**Prioridad:** Alta (Pausado - Requiere Políticas Legales) | **Complejidad:** Alta

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
- [x] Crear Android OAuth Client con SHA-1.
- [x] Configurar `google-services.json` completo.
- [!] **BLOQUEADO:** OAuth Consent Screen requiere Política de Privacidad y Términos.
  - **Causa del Bloqueo:**
    - Google Cloud Console no permite completar verificación de OAuth sin:
      - URL de Política de Privacidad
      - URL de Términos de Servicio (opcional pero recomendado)
  - **Páginas Requeridas (Pendientes):**
    - [x] `/politica-privacidad` - Obligatoria para OAuth
    - [x] `/terminos-servicio` - Recomendada
    - [ ] `/soporte` o página de contacto
  - **Plan de Creación Rápida (Fase 13.3.1):**
    1. Crear templates básicos en WordPress (Custom Post Type o páginas simples)
    2. Contenido mínimo viable:
       - Política de Privacidad: Qué datos recopila la app (email, nombre, actividad)
       - Cómo se almacenan (servidor propio, cifrado)
       - Derechos del usuario (RGPD: acceso, eliminación, portabilidad)
       - Contacto para solicitudes
    3. Publicar en `task.nakomi.studio/politica-privacidad`
    4. Añadir URLs al OAuth Consent Screen
    5. Reanudar testing de Google Auth
  - **Configuración Técnica Completada (Lista para usar cuando se desbloquee):**
    - [x] Android Client ID: `90767087281-hodj9fcaj13rvvnam8ge11og3mkgtohq...`
    - [x] Web Client ID: `90767087281-dkakjnbkbjgp2s5co7skhdlpq39epb9r...`
    - [x] SHA-1: `49:3D:C2:05:E7:F3:FD:21:F7:EA:AD:E9:75:35:CB:50:B5:2F:7A:30`
    - [x] Package: `com.taskNakomi.app`
    - [x] Firebase BoM y Google Services integrados

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


#### 13.3.1 Páginas Legales (Bloqueante para OAuth) 📄

**Prioridad:** Alta (Bloqueante) | **Complejidad:** Baja | **Estado:** ✅ COMPLETADO

- [x] **Política de Privacidad** (`/politica-privacidad`)
  - Datos recopilados: email, nombre, ID usuario, actividad (hábitos, notas, tareas)
  - Almacenamiento: Servidor propio con cifrado opcional E2EE
  - Uso: Funcionalidad de la app, sincronización, autenticación
  - Compartición: Solo con servicios esenciales (Google OAuth para login)
  - Derechos RGPD: Acceso, rectificación, eliminación, portabilidad
  - Retención: Hasta que usuario elimine cuenta
  - Cookies: Session, autenticación
  - Contacto: Email de soporte
  
- [x] **Términos de Servicio** (`/terminos-servicio`) - Opcional pero recomendado
  - Uso aceptable de la plataforma
  - Limitaciones de responsabilidad
  - Suscripciones y pagos (Stripe)
  - Propiedad intelectual
  - Terminación de cuenta

- [ ] **Página de Soporte/Contacto** (`/soporte`)
  - Email de contacto
  - Formulario de solicitudes RGPD
  - FAQ básico

**Implementación Técnica:**
- ✅ Islands de React creadas: `PoliticaPrivacidadIsland.tsx`, `TerminosServicioIsland.tsx`
- ✅ Páginas registradas en `App/Config/pages.php`
- ✅ Estilos coherentes en `styles/paginasLegales.css`
- ✅ URLs públicas accesibles: `task.nakomi.studio/politica-privacidad`, `/terminos-servicio`
- [ ] Añadir links en footer de la app web/móvil
- [ ] Configurar URLs en OAuth Consent Screen de Google Cloud Console

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

<div align="center">
  <img src="App/Assets/svg/Task.svg" alt="Nakomi Task — Vista del Dashboard" width="100%" />
  <h1>Nakomi Task</h1>
  <p><strong>Dashboard de productividad personal — open source</strong></p>
  <p>Tareas, hábitos, proyectos, notas, time tracking, sincronización en tiempo real, cifrado, plugins — todo en un solo lugar.</p>
  <p>
    <a href="https://task.nakomi.studio">Demo en vivo</a> ·
    <a href="#funcionalidades">Funcionalidades</a> ·
    <a href="#primeros-pasos">Primeros pasos</a> ·
    <a href="#sistema-de-plugins">Plugins</a> ·
    <a href="#stack-tecnológico">Stack</a>
  </p>
</div>

---

## Funcionalidades

### Gestión de tareas
Crea, organiza y da seguimiento a tareas con reordenamiento drag-and-drop, subtareas, proyectos, prioridades, niveles de urgencia, etiquetas y fechas límite. Las tareas se agrupan por proyecto y se filtran por múltiples criterios.

### Seguimiento de hábitos
Construye y mantén hábitos con frecuencia configurable (diaria, días personalizados, intervalos), niveles de importancia, rachas, visualización heatmap, sub-hábitos, pausa/aplazamiento, e historial detallado de cumplimiento con edición retroactiva.

### Proyectos
Agrupa tareas bajo proyectos con seguimiento de progreso, fechas límite, etiquetas y acceso compartido. Los proyectos se integran directamente con el panel de tareas para flujos de trabajo enfocados.

### Notas y carpetas
Notas de texto enriquecido con Editor.js, organización en carpetas, sincronización en tiempo real y CRUD completo. Las notas se sincronizan entre dispositivos junto con el resto del dashboard.

### Time Tracker
Registra el tiempo dedicado a cualquier actividad con controles de inicio/pausa integrados en el dashboard.

### Sincronización en tiempo real
Sincronización basada en WebSocket que mantiene todos tus dispositivos al día. Los cambios se propagan al instante — crea una tarea en el móvil y aparece en el escritorio en tiempo real. Incluye resolución de conflictos, prevención de eco y reconexión automática con backoff exponencial.

### Arquitectura offline-first
Almacenamiento local de datos: la app funciona sin conexión a internet. Los cambios se encolan y sincronizan automáticamente cuando vuelve la conectividad.

### Cifrado de extremo a extremo
Cifrado E2E opcional para datos sensibles del dashboard. Las claves se gestionan en el cliente; el servidor nunca ve contenido en texto plano.

### Backups en Google Drive
Backup y restauración automáticos y manuales a Google Drive. Mantén tus datos seguros con copias externas que tú controlas.

### Sistema de plugins
Extiende la funcionalidad con plugins propios o personalizados. Los plugins pueden registrar paneles en el dashboard, crear hábitos automáticos, ofrecer UIs de configuración e integrarse con la capa de stores. Ver [Sistema de plugins](#sistema-de-plugins) para más detalles.

### Temas
Soporte para tema oscuro y claro con una estética de terminal por defecto. Las preferencias de tema se sincronizan entre dispositivos.

### Dashboards compartidos y equipos
Comparte tu dashboard con otros usuarios o colabora en equipos. Gestiona permisos de miembros y visualiza la actividad compartida.

### Registro de actividad
Seguimiento completo de cada acción: tareas completadas, hábitos marcados, notas editadas, y más. Filtra por fecha, tipo de entidad o acción.

### Notificaciones push
Notificaciones web push para fechas límite de tareas, recordatorios de rachas y actualizaciones de equipo. Configurables por usuario con preferencias de frecuencia y horario.

### Pagos y suscripciones
Integración con Stripe para suscripciones Pro con manejo de eventos por webhooks. Plan gratuito disponible con límites de funcionalidades.

### Asistente IA
Asistente impulsado por IA para clasificación de tareas, sugerencias y generación de contenido.

### Soporte móvil
Construido con Capacitor para despliegue nativo en Android junto a la app web. Diseño responsive desde 320px (móvil) hasta escritorio.

### Archivos adjuntos
Sube y gestiona archivos adjuntos a tareas, proyectos o notas con seguimiento de cuota de almacenamiento.

### Drag & Drop
Reordena tareas, hábitos y paneles con drag-and-drop impulsado por dnd-kit. El layout de paneles es completamente personalizable por usuario.

### Page Builder
Landing pages y contenido público construido con Measured Puck, un page builder visual con soporte de server-rendering.

---

## Sistema de plugins

Nakomi Task tiene una arquitectura de plugins que permite extender el dashboard con nuevos paneles, hábitos automáticos y configuración personalizada sin modificar el código core.

### Cómo funciona

Los plugins se encuentran en `App/React/plugins/` y se registran en el plugin store. Cada plugin declara:

- **Paneles** — Paneles UI renderizados en la grilla del dashboard
- **Hábitos automáticos** — Hábitos creados al activar el plugin (ej: un plugin de ayuno crea el hábito "Completar ayuno")
- **Configuración** — UI de configuración opcional mostrada en la primera activación

### API de plugins

```typescript
/* Verificar si un plugin está activo */
const isActive = usePluginActivo('mi-plugin');

/* Acciones del store */
activarPlugin(pluginId)              /* Activar plugin */
desactivarPlugin(pluginId)           /* Desactivar plugin */
togglePlugin(pluginId)               /* Alternar on/off */
obtenerConfiguracion<T>(pluginId)    /* Obtener config del plugin */
guardarConfiguracion(pluginId, data) /* Guardar config del plugin */
```

El estado de plugins persiste en localStorage. Los plugins activos y su configuración sobreviven recargas de página y se sincronizan a lo largo del ciclo de vida del dashboard.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18/19, TypeScript 5, Zustand 5 (estado), Vite 6 (build) |
| **Estilos** | CSS Modules, Tailwind CSS 4, Framer Motion (animaciones) |
| **Iconos** | Lucide React |
| **Editor** | Editor.js (notas de texto enriquecido) |
| **Drag & Drop** | dnd-kit |
| **Page Builder** | Measured Puck |
| **Backend** | WordPress + PHP 8, REST API personalizada |
| **WebSocket** | Bun runtime, Ratchet (PHP) |
| **Base de datos** | MariaDB (WordPress), PostgreSQL (búsqueda vectorial opcional) |
| **Pagos** | Stripe (suscripciones + webhooks) |
| **Auth** | WordPress auth + Google OAuth (Capacitor) |
| **Mobile** | Capacitor 6 (Android) |
| **Cloud** | Google API Client (backups en Drive) |
| **Deploy** | Coolify (basado en Docker) |

---

## Estructura del proyecto

```
├── App/
│   ├── Api/              # Controladores REST API (PHP)
│   ├── Assets/           # Assets estáticos (SVG, imágenes)
│   ├── Config/           # Configuración de la aplicación
│   ├── Content/          # Tipos de contenido WordPress
│   ├── Database/         # Schema, repositorios, migraciones
│   ├── Helpers/          # Funciones utilitarias PHP
│   ├── React/            # Aplicación frontend
│   │   ├── components/   # Componentes UI (dashboard, paneles, shared, landing)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── islands/      # Entry points de hidratación (arquitectura React Islands)
│   │   ├── plugins/      # Implementaciones de plugins
│   │   ├── services/     # Servicios API y capa de datos
│   │   ├── stores/       # Stores Zustand
│   │   ├── types/        # Definiciones de tipos TypeScript
│   │   └── utils/        # Utilidades frontend
│   ├── Repository/       # Capa de acceso a datos (PHP)
│   ├── Services/         # Lógica de negocio (PHP)
│   └── Templates/        # Templates de páginas WordPress
├── Glory/                # Submódulo framework reutilizable
│   ├── src/              # Clases PHP core
│   ├── assets/           # Assets frontend compartidos
│   ├── Config/           # Configuración del framework
│   └── tools/            # Herramientas CLI
├── websocket-server/     # Servidor WebSocket (Bun)
├── desktop/              # App de escritorio Tauri (experimental)
└── cli/                  # Utilidades de línea de comandos
```

---

## REST API

Todos los endpoints se registran bajo `/wp-json/glory/v1/`. La autenticación usa nonces y cookies de WordPress.

| Grupo de endpoints | Descripción |
|-------------------|-------------|
| Dashboard | CRUD del dashboard, estado de sync, cambios incrementales |
| Actividad | Creación y filtrado del registro de actividad |
| Adjuntos | Gestión de archivos adjuntos |
| AI | Funcionalidades del asistente IA |
| Auth | Autenticación y gestión de sesiones |
| Backups | Creación y restauración de backups en Google Drive |
| Carpetas Notas | Gestión de carpetas de notas |
| Cifrado | Gestión de claves de cifrado |
| Compartidos | Control de acceso a dashboards compartidos |
| Equipos | Gestión de miembros de equipo |
| Feedback | Recolección de feedback de usuarios |
| Mensajes | Comentarios y mensajes en entidades |
| Notas | Operaciones CRUD de notas |
| Notificaciones | Gestión de notificaciones push |
| Perfil | Actualizaciones de perfil de usuario |
| Stripe | Procesamiento de pagos y webhooks |
| Suscripcion | Gestión de niveles de suscripción |

---

## Primeros pasos

### Requisitos previos

- PHP ≥ 8.0
- Node.js ≥ 18
- Composer
- Instalación de WordPress
- Bun (para el servidor WebSocket)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/1ndoryu/task.git

# Instalar dependencias PHP
composer install

# Instalar dependencias frontend
npm install --prefix Glory/assets/react

# Build del frontend para producción
npm run build

# O ejecutar en modo desarrollo
npm run dev
```

### Entorno

Crea un archivo `.env` en la raíz del proyecto con tu configuración (base de datos, claves de Stripe, credenciales de Google API, etc.). La aplicación usa `vlucas/phpdotenv` para la gestión de variables de entorno.

### Configuración de WordPress

1. Coloca el tema en `wp-content/themes/`
2. Activa el tema desde el admin de WordPress
3. Los endpoints de la REST API se registran automáticamente al activar

---

## Desarrollo

```bash
# Servidor de desarrollo con hot reload
npm run dev

# Build de producción
npm run build

# Verificación de tipos (Glory + App)
npm run type-check

# Build rápido (sin prerender)
npm run build:fast
```

### Arquitectura

Nakomi Task usa una arquitectura de **React Islands**: el tema de WordPress renderiza HTML del lado del servidor, y secciones interactivas específicas (islands) se hidratan independientemente con React. Esto da cargas de página iniciales rápidas mientras habilita interactividad rica donde se necesita.

La gestión de estado usa stores de **Zustand** con persistencia en localStorage y sincronización opcional con el servidor. Cada dominio de funcionalidad tiene su propio store, manteniendo las responsabilidades separadas y habilitando suscripciones selectivas para rendimiento de renderizado.

---

## Licencia

Open source. Consulta el repositorio para detalles de la licencia.

---

<div align="center">
  <sub>Construido con React, TypeScript, WordPress y cafeína.</sub>
</div>
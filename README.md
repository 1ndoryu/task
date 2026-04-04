<div align="center">
  <img src="App/Assets/svg/Task.svg" alt="Nakomi Task — Dashboard Preview" width="100%" />
  <h1>Nakomi Task</h1>
  <p><strong>Open-source personal productivity dashboard</strong></p>
  <p>Tasks, habits, projects, notes, time tracking, real-time sync, encryption, plugins — all in one place.</p>
  <p>
    <a href="https://task.nakomi.studio">Live Demo</a> ·
    <a href="#features">Features</a> ·
    <a href="#getting-started">Getting Started</a> ·
    <a href="#plugin-system">Plugins</a> ·
    <a href="#tech-stack">Tech Stack</a>
  </p>
</div>

---

## Features

### Task Management
Create, organize, and track tasks with drag-and-drop reordering, subtasks, projects, priorities, urgency levels, tags, and due dates. Tasks can be grouped by project and filtered by multiple criteria.

### Habit Tracker
Build and maintain habits with configurable frequency (daily, custom days, intervals), importance levels, streaks, heatmap visualization, sub-habits, pause/postpone capability, and a detailed completion history with retroactive editing.

### Projects
Group tasks under projects with progress tracking, deadlines, tags, and shared access. Projects integrate directly with the task panel for focused workflows.

### Notes & Folders
Rich text notes powered by Editor.js with folder organization, real-time sync, and full CRUD. Notes sync across devices alongside the rest of the dashboard.

### Time Tracker
Track time spent on any activity with start/stop controls integrated into the dashboard.

### Real-Time Sync
WebSocket-based synchronization keeps all your devices in sync. Changes propagate instantly — create a task on your phone and see it appear on your desktop in real time. Includes conflict resolution, echo prevention, and automatic reconnection with exponential backoff.

### Offline-First Architecture
Local-first data storage means the app works without an internet connection. Changes are queued and synced automatically when connectivity returns.

### End-to-End Encryption
Optional E2E encryption for sensitive dashboard data. Keys are managed client-side; the server never sees plaintext content.

### Google Drive Backups
Automatic and manual backup/restore to Google Drive. Keep your data safe with off-site copies you control.

### Plugin System
Extend functionality with first-party or custom plugins. Plugins can register dashboard panels, create automatic habits, provide configuration UIs, and integrate with the store layer. See [Plugin System](#plugin-system) for details.

### Themes
Dark and light theme support with a terminal-inspired default aesthetic. Theme preferences sync across devices.

### Shared Dashboards & Teams
Share your dashboard with other users or collaborate in teams. Manage member permissions and see shared activity.

### Activity Log
Comprehensive activity tracking records every action: tasks completed, habits toggled, notes edited, and more. Filter by date, entity type, or action.

### Push Notifications
Web push notifications for task deadlines, streak reminders, and team updates. Configurable per-user with frequency and time preferences.

### Payments & Subscriptions
Stripe integration for Pro tier subscriptions with webhook-based event handling. Free tier available with feature limits.

### AI Assistant
AI-powered assistant for task classification, suggestions, and content generation.

### Mobile Support
Built with Capacitor for native Android deployment alongside the web app. Responsive design works from 320px mobile to desktop.

### File Attachments
Upload and manage files attached to tasks, projects, or notes with storage quota tracking.

### Drag & Drop
Reorder tasks, habits, and panels with drag-and-drop powered by dnd-kit. Panel layout is fully customizable per user.

### Page Builder
Landing pages and public content built with Measured Puck, a visual page builder with server-rendering support.

---

## Plugin System

Nakomi Task has a plugin architecture that allows extending the dashboard with new panels, automatic habits, and custom configuration without modifying core code.

### How It Works

Plugins live in `App/React/plugins/` and register themselves with the plugin store. Each plugin declares:

- **Panels** — UI panels rendered in the dashboard grid
- **Automatic habits** — Habits created on plugin activation (e.g., a fasting plugin creates a "Complete fast" habit)
- **Configuration** — Optional setup UI shown on first activation

### Plugin API

```typescript
/* Check if a plugin is active */
const isActive = usePluginActivo('my-plugin');

/* Store actions */
activarPlugin(pluginId)              /* Enable plugin */
desactivarPlugin(pluginId)           /* Disable plugin */
togglePlugin(pluginId)               /* Toggle on/off */
obtenerConfiguracion<T>(pluginId)    /* Get plugin config */
guardarConfiguracion(pluginId, data) /* Save plugin config */
```

Plugin state persists in localStorage. Active plugins and their configuration survive page reloads and sync across the dashboard lifecycle.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18/19, TypeScript 5, Zustand 5 (state), Vite 6 (build) |
| **Styling** | CSS Modules, Tailwind CSS 4, Framer Motion (animations) |
| **Icons** | Lucide React |
| **Editor** | Editor.js (rich text notes) |
| **Drag & Drop** | dnd-kit |
| **Page Builder** | Measured Puck |
| **Backend** | WordPress + PHP 8, custom REST API |
| **WebSocket** | Bun runtime, Ratchet (PHP) |
| **Database** | MariaDB (WordPress), PostgreSQL (optional vector search) |
| **Payments** | Stripe (subscriptions + webhooks) |
| **Auth** | WordPress auth + Google OAuth (Capacitor) |
| **Mobile** | Capacitor 6 (Android) |
| **Cloud** | Google API Client (Drive backups) |
| **Deployment** | Coolify (Docker-based) |

---

## Project Structure

```
├── App/
│   ├── Api/              # PHP REST API controllers
│   ├── Assets/           # Static assets (SVG, images)
│   ├── Config/           # Application configuration
│   ├── Content/          # WordPress content types
│   ├── Database/         # Schema, repositories, migrations
│   ├── Helpers/          # PHP utility functions
│   ├── React/            # Frontend application
│   │   ├── components/   # UI components (dashboard, panels, shared, landing)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── islands/      # Hydration entry points (React Islands architecture)
│   │   ├── plugins/      # Plugin implementations
│   │   ├── services/     # API services and data layer
│   │   ├── stores/       # Zustand state stores
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Frontend utilities
│   ├── Repository/       # Data access layer (PHP)
│   ├── Services/         # Business logic (PHP)
│   └── Templates/        # WordPress page templates
├── Glory/                # Reusable framework submodule
│   ├── src/              # Core PHP classes
│   ├── assets/           # Shared frontend assets
│   ├── Config/           # Framework configuration
│   └── tools/            # CLI tools
├── websocket-server/     # Bun-based WebSocket server
├── desktop/              # Tauri desktop app (experimental)
└── cli/                  # Command-line utilities
```

---

## REST API

All endpoints are registered under `/wp-json/glory/v1/`. Authentication uses WordPress nonces and cookies.

| Endpoint Group | Description |
|---------------|-------------|
| Dashboard | Core dashboard CRUD, sync state, incremental changes |
| Actividad | Activity log creation and filtering |
| Adjuntos | File attachment management |
| AI | AI assistant capabilities |
| Auth | Authentication and session management |
| Backups | Google Drive backup creation and restore |
| Carpetas Notas | Note folder management |
| Cifrado | Encryption key management |
| Compartidos | Shared dashboard access control |
| Equipos | Team member management |
| Feedback | User feedback collection |
| Mensajes | Comments and messages on entities |
| Notas | Note CRUD operations |
| Notificaciones | Push notification management |
| Perfil | User profile updates |
| Stripe | Payment processing and webhooks |
| Suscripcion | Subscription tier management |

---

## Getting Started

### Prerequisites

- PHP ≥ 8.0
- Node.js ≥ 18
- Composer
- WordPress installation
- Bun (for WebSocket server)

### Installation

```bash
# Clone the repository
git clone https://github.com/1ndoryu/task.git

# Install PHP dependencies
composer install

# Install frontend dependencies
npm install --prefix Glory/assets/react

# Build frontend for production
npm run build

# Or run in development mode
npm run dev
```

### Environment

Create a `.env` file in the project root with your configuration (database, Stripe keys, Google API credentials, etc.). The application uses `vlucas/phpdotenv` for environment management.

### WordPress Setup

1. Place the theme in `wp-content/themes/`
2. Activate the theme in WordPress admin
3. The REST API endpoints register automatically on activation

---

## Development

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Type checking (both Glory + App)
npm run type-check

# Fast build (skip prerender)
npm run build:fast
```

### Architecture

Nakomi Task uses a **React Islands** architecture: the WordPress theme renders server-side HTML, and specific interactive sections (islands) hydrate independently with React. This gives fast initial page loads while enabling rich interactivity where needed.

State management uses **Zustand** stores with localStorage persistence and optional server sync. Each feature domain has its own store, keeping concerns separated and enabling selective subscriptions for rendering performance.

---

## License

Open source. See repository for license details.

---

<div align="center">
  <sub>Built with React, TypeScript, WordPress, and caffeine.</sub>
</div>
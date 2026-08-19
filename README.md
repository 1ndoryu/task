# task

Aplicación de productividad tipo dashboard (tareas, hábitos, proyectos, notas, actividad) — migrada desde el tema WordPress **glorytemplate** a un stack moderno **Rust (Axum) + React (TypeScript) + Vite** en un solo repositorio.

El frontend reproduce la experiencia del tema original de WordPress: mismo layout de paneles, mismas configuraciones persistidas por usuario (posiciones, columnas, paneles minimizados, preferencias de plugins) y el mismo contrato de datos.

> Estado: la migración está en curso; el refactor del backend Rust se está ejecutando en paralelo. La API canónica es `/api` (la compatibilidad `/wp-json` no se asume).

## Stack

| Capa                 | Herramienta                  | Para qué                                |
| -------------------- | ---------------------------- | --------------------------------------- |
| Framework web        | Axum                         | HTTP, routing, middleware               |
| OpenAPI              | utoipa + utoipa-swagger-ui   | Genera schema OpenAPI desde código      |
| Serialización        | serde                        | JSON ↔ Structs                          |
| Base de datos        | SQLx (PostgreSQL)            | Queries SQL con verificación            |
| Migraciones          | SQLx migrate                 | Control de schema DB                    |
| Validación           | validator                    | Validar inputs del usuario              |
| Variables de entorno | dotenvy                      | Cargar .env                             |
| Logging              | tracing + tracing-subscriber | Logs estructurados                      |
| Errores              | thiserror                    | Errores tipados                         |
| Auth                 | Sesiones opacas + Argon2     | Cookie HttpOnly, CSRF y revocación      |
| Hashing              | argon2                       | Hashing seguro de contraseñas           |
| CORS                 | tower-http                   | Middleware CORS                         |
| Linter               | clippy (paranoia)            | Código limpio                           |
| Frontend             | React + TypeScript + Vite    | UI (dashboard migrado del tema WP)      |
| State management     | Zustand                      | Estado del cliente (layout, sync, UI)   |
| Core compartido      | glory-rs (submodulo)         | Lógica agnóstica reutilizable           |

## Requisitos

- Rust (stable, 1.75+)
- Node.js (18+) y npm
- PostgreSQL corriendo localmente

## Inicio rápido

```bash
# 1. Instalar dependencias del frontend
cd frontend && npm install && cd ..

# 2. Configurar .env (copiar de .env.example y ajustar DATABASE_URL)
cp .env.example .env

# 3. Crear la base de datos y aplicar migraciones
psql -U postgres -c "CREATE DATABASE glory_backend_local;"
DATABASE_URL=postgres://postgres:root@127.0.0.1:5432/glory_backend_local cargo sqlx migrate run

# 4. Arrancar todo (backend + frontend) con el launcher compartido
npm run dev
```

`npm run dev` usa el launcher de `glory-rs/scripts/dev.mjs`: prepara la BD por rama, el target Cargo por rama, sincroniza dependencias del frontend y arranca Vite.

**Puertos por defecto de este proyecto** (aislados para no chocar con otras apps de la máquina):

- Backend: `http://127.0.0.1:3001`
- Frontend (Vite): `http://127.0.0.1:5174` — usar SIEMPRE `127.0.0.1`, no `localhost` (las cookies de `localhost` se comparten entre puertos y otras apps de la máquina pisarían la sesión).

## Comandos útiles

```bash
npm run dev            # Backend + frontend (launcher glory-rs)
npm run check          # cargo check + clippy + type-check + boundary
npm run dev:back       # Solo backend
npm run dev:front      # Solo frontend (Vite con HMR)
npm test               # Tests del backend (con BD)
```

O directamente desde `frontend/`:

```bash
npm run dev            # Dev server con HMR
npm run type-check     # Verificar tipos TypeScript
npm run build          # Build producción
```

## Estructura del proyecto

```
├── Cargo.toml              # Dependencias del backend
├── src/
│   ├── main.rs             # Entry point del servidor
│   ├── lib.rs              # Re-exports y AppState
│   ├── config/             # Configuración desde env vars
│   ├── errors/             # Tipos de error → HTTP status codes
│   ├── handlers/           # Capa HTTP (routing, request/response)
│   ├── middleware/         # Sesión, CSRF, rate limit y límites
│   ├── models/             # Structs de dominio y DTOs
│   ├── repositories/       # Capa de base de datos (queries)
│   └── services/           # Lógica de negocio
├── migrations/             # Migraciones SQL (SQLx)
├── frontend/
│   └── src/app/            # Dashboard migrado del tema WordPress
│       ├── components/     # Paneles, formularios, modales, menús
│       ├── hooks/          # Lógica de dashboard, sync, preferencias
│       ├── stores/         # Stores Zustand (layout, suscripción, UI)
│       ├── styles/         # CSS por componente (variables centralizadas)
│       └── islands/        # Islas (DashboardIsland, etc.)
├── glory-rs/               # Submodulo: core agnóstico compartido
├── Agente/                 # Roadmap, planes y documentación de trabajo
├── .env.example            # Variables de entorno de ejemplo
└── README.md
```

## Arquitectura

El backend sigue separación en capas:

- **handlers/** → Reciben HTTP requests, extraen datos, llaman services, retornan responses
- **services/** → Lógica de negocio, orquestan repositories
- **repositories/** → Queries a PostgreSQL via SQLx
- **models/** → Structs de dominio, DTOs de request/response, schemas OpenAPI
- **errors/** → Enum de errores que mapean a HTTP status codes
- **middleware/** → Extractores de Axum (sesión, CSRF, rate limit y límites)

## API canónica actual

Autenticación por cookie, perfil, dashboard, tareas/proyectos, historial de hábitos, notas/carpetas y actividad. El contrato canónico usa `/api`:

| Método | Ruta               | Descripción             | Auth |
| ------ | ------------------ | ----------------------- | ---- |
| POST   | /api/auth/register | Registrar usuario       | No (rate limit) |
| POST   | /api/auth/login    | Iniciar sesión          | No (rate limit) |
| GET    | /api/auth/me       | Sesión actual           | Cookie |
| POST   | /api/auth/logout   | Revocar sesión          | Cookie + CSRF |
| GET    | /api/profile       | Obtener perfil          | Cookie |
| PUT    | /api/profile       | Actualizar perfil       | Cookie + CSRF |
| GET    | /api/dashboard     | Leer dashboard propio  | Cookie |
| PUT    | /api/tasks/:legacy_id | Mutar una tarea con `expectedUpdatedAt` | Cookie + CSRF |
| PUT    | /api/projects/:legacy_id | Mutar un proyecto con `expectedUpdatedAt` | Cookie + CSRF |
| GET    | /api/notes/folders | Listar carpetas propias | Cookie |
| POST   | /api/notes/folders | Crear carpeta | Cookie + CSRF |
| GET    | /api/habits/:legacy_id/history | Leer historial de hábito | Cookie |
| PUT    | /api/habits/:legacy_id/history | Registrar estado diario | Cookie + CSRF |
| GET    | /api/health        | Health check            | No   |
| POST   | /api/notes         | Crear nota              | Sí   |
| GET    | /api/notes         | Listar notas (paginado) | Sí   |
| GET    | /api/notes/:id     | Obtener nota            | Sí   |
| PUT    | /api/notes/:id     | Actualizar nota         | Sí   |
| DELETE | /api/notes/:id     | Eliminar nota           | Sí   |
| GET    | /api/activity      | Heatmap de actividad     | Cookie |
| GET    | /api/activity/estadisticas | Estadísticas de actividad | Cookie |
| GET    | /api/activity/day  | Detalle diario           | Cookie |
| POST   | /api/activity      | Registrar/desmarcar      | Cookie + CSRF |
| DELETE | /api/activity/:id  | Eliminar actividad propia | Cookie + CSRF |

## Clippy nivel paranoia

El proyecto tiene configurado clippy en modo estricto (`[lints.clippy]` en Cargo.toml):

- `clippy::all` → **deny** (error en cualquier warning estándar)
- `clippy::pedantic` → **warn** (warnings extra para código idiomático)

Antes de cada commit: `cargo fmt --check && cargo clippy && cargo test`

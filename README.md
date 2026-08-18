# Glory RS

Template para sitios web con **Rust (Axum) + React (TypeScript) + OpenAPI** en un solo repositorio.

Pensado para máxima velocidad de desarrollo, seguridad por defecto y escalabilidad.

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
| Frontend             | React + TypeScript + Vite    | UI                                      |
| State management     | React Query + Zustand        | Server state + client state             |
| Codegen              | Orval                        | Genera cliente TypeScript desde OpenAPI |

## Requisitos

- Rust (stable, 1.75+)
- Node.js (18+) y npm
- PostgreSQL corriendo localmente

## Inicio rápido

```bash
# 1. Clonar el template con el framework fijado
git clone --recurse-submodules --branch main https://github.com/1ndoryu/glory-rs-template.git nuevo-proyecto
cd nuevo-proyecto
git submodule update --init --recursive
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# 2. Crear la base de datos
psql -U postgres -c "CREATE DATABASE glory_db;"

# 3. Backend
cargo run
# El servidor inicia en http://localhost:3000
# Swagger UI en http://localhost:3000/swagger-ui/

# 4. Frontend (en otra terminal)
cd frontend
npm install
npm run dev
# Frontend en http://localhost:5173

# 5. Codegen desde el snapshot versionado
npm run codegen
# Para refrescarlo desde un backend local:
# OPENAPI_URL=http://localhost:3000/api-docs/openapi.json npm run openapi:export
```

## Imagen de producción

`Dockerfile` compila el frontend y el binario Rust en etapas separadas, copia únicamente `frontend/dist` y ejecuta un usuario sin privilegios. El proceso sirve el SPA y `/api` desde el mismo binario; PostgreSQL se entrega como servicio externo mediante `DATABASE_URL`.

```bash
docker build --tag glory-react-logic-rs:local .
docker run --rm --publish 3000:3000 \
  --env DATABASE_URL=postgres://usuario:password@host.docker.internal:5432/glory_db \
  --env CORS_ORIGINS=https://app.example.com \
  glory-react-logic-rs:local
```

El runtime fija `HOST=0.0.0.0`, `FRONTEND_DIST=/app/frontend/dist`, `COOKIE_SECURE=true` y expone un healthcheck en `/api/health`. El build Docker real debe ejecutarse en CI/host con Docker disponible antes de exponer el servicio.

## Estructura del proyecto

```
├── Cargo.toml              # Dependencias del backend
├── src/
│   ├── main.rs             # Entry point del servidor
│   ├── lib.rs              # Re-exports y AppState
│   ├── config/             # Configuración desde env vars
│   ├── errors/             # Tipos de error → HTTP status codes
│   ├── handlers/           # Capa HTTP (routing, request/response)
│   ├── middleware/          # Sesión, CSRF, rate limit y límites
│   ├── models/             # Structs de dominio y DTOs
│   ├── repositories/       # Capa de base de datos (queries)
│   └── services/           # Lógica de negocio
├── migrations/             # Migraciones SQL (SQLx)
├── frontend/
│   ├── src/
│   │   ├── api/            # Snapshot OpenAPI y cliente generado por Orval
│   │   ├── App.tsx         # Componente raíz
│   │   └── main.tsx        # Entry point React
│   ├── orval.config.ts     # Configuración de codegen
│   └── vite.config.ts      # Configuración de Vite + proxy
├── .env.example            # Variables de entorno de ejemplo
└── .gitignore
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

El consumidor incluye autenticación por cookie, perfil, dashboard, tareas/proyectos, historial de hábitos, notas/carpetas y actividad en distintos niveles de integración. El contrato canónico usa `/api`; la compatibilidad `/wp-json` no se asume. La paridad completa del frontend y las operaciones avanzadas siguen en migración:

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

## Ramas por sitio

Este template está diseñado para usar **una rama por sitio/proyecto**:

```bash
git checkout -b mi-sitio-web
# Desarrollar en la rama
# Cambiar a otro sitio:
git checkout otro-sitio
```

La estructura es idéntica en cada rama. Solo cambia el contenido específico del sitio.

## Comandos útiles

```bash
# Comando unificado — verifica todo el proyecto (backend + frontend)
npm run check

# Backend
cargo run --bin glory-backend # Iniciar servidor
cargo check                  # Verificar compilación
cargo clippy                 # Linter (nivel paranoia)
cargo test                   # Tests
cargo fmt                    # Formatear código
npm run check:back           # cargo check + clippy

# Frontend
npm run dev:front            # Dev server con HMR
npm run check:front          # Type-check TypeScript
npm run codegen              # Regenerar desde frontend/src/api/openapi.json
npm run openapi:export       # Exportar y normalizar desde un backend local

# O directamente desde frontend/
cd frontend
npm run dev                  # Dev server con HMR
npm run build                # Build producción
npm run type-check           # Verificar tipos TypeScript
npm run codegen               # Regenerar el cliente Orval
```

## Clippy nivel paranoia

El proyecto tiene configurado clippy en modo estricto (`[lints.clippy]` en Cargo.toml):

- `clippy::all` → **deny** (error en cualquier warning estándar)
- `clippy::pedantic` → **warn** (warnings extra para código idiomático)

Antes de cada commit: `cargo fmt --check && cargo clippy && cargo test`

# Glory MCP Server

Servidor MCP (Model Context Protocol) para gestión de tareas, proyectos y hábitos con Glory Tasks.

[![npm version](https://img.shields.io/npm/v/glory-mcp-server.svg)](https://www.npmjs.com/package/glory-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Instalación Rápida

No necesitas clonar ningún repositorio. Simplemente configura tu cliente MCP:

### Para Antigravity / Claude Desktop / Cursor

1. **Obtén tu token** desde Glory Tasks → Configuración → Conectar con IA
2. **Copia la configuración** al archivo de configuración de tu cliente MCP:

```json
{
  "mcpServers": {
    "glory-tareas": {
      "command": "npx",
      "args": ["-y", "glory-mcp-server"],
      "env": {
        "GLORY_API_URL": "https://task.nakomi.studio/wp-json/glory/v1",
        "GLORY_AUTH_TOKEN": "TU_TOKEN_BASE64_AQUI"
      }
    }
  }
}
```

3. **Reinicia tu cliente** y empieza a usar comandos

### Ubicaciones de archivos de configuración:

| Cliente                  | Archivo                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json`                     |
| Claude Desktop (macOS)   | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Antigravity (Windows)    | `%USERPROFILE%\.gemini\antigravity\mcp_config.json`               |
| Cursor                   | `.cursor/mcp.json` en tu proyecto                                 |

## Características

- **11 Herramientas MCP** para gestión completa de tareas, proyectos y hábitos
- **4 Recursos** de solo lectura para consultas rápidas
- **Autenticación segura** con WordPress Application Passwords
- **Sin dependencias locales** - funciona con `npx` directamente

## Herramientas Disponibles

### Tareas (7)
| Herramienta               | Descripción                                               |
| ------------------------- | --------------------------------------------------------- |
| `obtener_tareas`          | Lista tareas con filtros (pendientes, completadas, todas) |
| `obtener_tareas_proyecto` | Tareas de un proyecto específico                          |
| `obtener_tarea`           | Detalle completo de una tarea                             |
| `crear_tarea`             | Nueva tarea con prioridad, urgencia, tags                 |
| `editar_tarea`            | Modificar cualquier campo de una tarea                    |
| `completar_tarea`         | Marcar/desmarcar como completada                          |
| `eliminar_tarea`          | Eliminar permanentemente                                  |

### Proyectos (2)
| Herramienta         | Descripción                            |
| ------------------- | -------------------------------------- |
| `obtener_proyectos` | Lista proyectos con filtros por estado |
| `obtener_proyecto`  | Detalle de proyecto con sus tareas     |

### Hábitos (1)
| Herramienta       | Descripción                              |
| ----------------- | ---------------------------------------- |
| `obtener_habitos` | Lista hábitos con filtro por importancia |

### Dashboard (1)
| Herramienta         | Descripción                                             |
| ------------------- | ------------------------------------------------------- |
| `resumen_dashboard` | Estadísticas: total tareas, proyectos, hábitos urgentes |

## Recursos MCP

Los recursos permiten acceso rápido de solo lectura:

- `tareas://todas` - Todas las tareas
- `tareas://pendientes` - Solo tareas pendientes  
- `proyectos://todos` - Todos los proyectos
- `habitos://todos` - Todos los hábitos

## Variables de Entorno

| Variable            | Descripción                                         | Requerida                        |
| ------------------- | --------------------------------------------------- | -------------------------------- |
| `GLORY_API_URL`     | URL base de la API                                  | Sí                               |
| `GLORY_AUTH_TOKEN`  | Token Base64 (formato: `user:application_password`) | Sí*                              |
| `GLORY_WP_USERNAME` | Usuario de WordPress                                | Solo si no usas GLORY_AUTH_TOKEN |
| `GLORY_WP_PASSWORD` | Application Password                                | Solo si no usas GLORY_AUTH_TOKEN |

*Puedes usar `GLORY_AUTH_TOKEN` (recomendado) o la combinación de `GLORY_WP_USERNAME` + `GLORY_WP_PASSWORD`.

## Ejemplos de Uso

Una vez configurado, puedes pedirle a tu asistente IA:

- *"Muéstrame mis tareas pendientes"*
- *"Crea una tarea urgente para revisar el código"*
- *"¿Cuántas tareas tengo en el proyecto SaaS?"*
- *"Marca como completada la tarea 42"*
- *"Dame un resumen de mi dashboard"*

## Requisitos

- Node.js 18.0.0 o superior
- Cuenta en Glory Tasks con Application Password

## Desarrollo Local

Si deseas contribuir o ejecutar desde el código fuente:

```bash
git clone https://github.com/nakomidev/glory-mcp-server
cd glory-mcp-server
npm install
npm run build
npm start
```

## Licencia

MIT © Glory Builder

## Enlaces

- [Glory Tasks](https://task.nakomi.studio)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Reportar Issues](https://github.com/nakomidev/glory-mcp-server/issues)

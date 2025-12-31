# MCP y API REST para Glory Dashboard

## Resumen
Servidor MCP + API REST Universal que permite a asistentes de IA (Claude, Cursor, Antigravity) gestionar tareas, proyectos y hábitos.

---

## Estado del Proyecto ✅ COMPLETADO (31/12/2024)

| Componente         | Estado                  |
| ------------------ | ----------------------- |
| Servidor MCP       | ✅ Funcional             |
| API REST Universal | ✅ 10 endpoints          |
| Frontend (Modal)   | ✅ Con pestaña API REST  |
| Autenticación      | ✅ Application Passwords |

---

## Arquitectura

```
┌─────────────────────────────────────┐
│   Claude / Cursor / Antigravity     │
└───────────────┬─────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
┌─────────┐         ┌──────────────┐
│   MCP   │         │   API REST   │
│ (STDIO) │         │   (HTTP)     │
└────┬────┘         └──────┬───────┘
     │                     │
     └──────────┬──────────┘
                ▼
┌─────────────────────────────────────┐
│        WordPress REST API           │
│   https://task.nakomi.studio        │
└─────────────────────────────────────┘
```

---

## API REST Universal (Preferida)

**URL Base:** `https://task.nakomi.studio/wp-json/glory/v1`

### Autenticación
```
Authorization: Basic base64(usuario:password)
```

### Endpoints

#### Tareas
| Método | Endpoint                                           | Descripción                                  |
| ------ | -------------------------------------------------- | -------------------------------------------- |
| GET    | `/ai/tareas?filtro=pendientes\|completadas\|todas` | Listar                                       |
| POST   | `/ai/tareas`                                       | Crear (body: {texto, prioridad?, urgencia?}) |
| GET    | `/ai/tareas/{id}`                                  | Obtener                                      |
| PUT    | `/ai/tareas/{id}`                                  | Editar                                       |
| POST   | `/ai/tareas/{id}/completar`                        | Toggle completado                            |
| DELETE | `/ai/tareas/{id}`                                  | Eliminar                                     |

#### Proyectos
| GET | `/ai/proyectos?estado=activo\|completado\|pausado\|todos` | Listar |
| GET | `/ai/proyectos/{id}` | Obtener con tareas |

#### Hábitos
| GET | `/ai/habitos?importancia=Alta\|Media\|Baja` | Listar |

#### Resumen
| GET | `/ai/resumen` | Estadísticas dashboard |

### Valores válidos
- **prioridad**: Alta, Media, Baja
- **urgencia**: bloqueante, urgente, normal, chill
- **estado**: activo, completado, pausado

---

## Archivos Implementados

### Backend PHP
- `App/Api/AIApiController.php` - API REST Universal ✅
- `App/Api/MCPTokenController.php` - Gestión de tokens ✅

### Frontend React
- `components/configuracion/ModalConfiguracionMCP.tsx` - Modal principal ✅
- `components/configuracion/SeccionTokenMCP.tsx` - Gestión token ✅
- `components/configuracion/ConfiguracionMCPCopiable.tsx` - Código copiable ✅
- `styles/dashboard/componentes/modalConfiguracionMCP.css` - Estilos ✅

### MCP Server (TypeScript)
- `mcp/src/index.ts` - Servidor MCP ✅
- `mcp/src/api/gloryClient.ts` - Cliente API ✅
- `mcp/src/tools/*.ts` - Herramientas ✅

---

## Uso

### Desde Antigravity/GPT (API REST)
1. Ve a "Conectar con IA" en el dashboard
2. Genera un token de acceso
3. Copia el "Contexto para IA"
4. Pégalo en tu asistente de IA

### Desde Claude Desktop (MCP)
1. Genera token en dashboard
2. Copia configuración JSON
3. Pega en `%APPDATA%\Claude\claude_desktop_config.json`
4. Reinicia Claude

### Desde Cursor (MCP)
1. Genera token en dashboard
2. Copia configuración JSON
3. Pega en `.cursor/mcp.json`
4. Reinicia Cursor

---

## Problemas Conocidos

### Antigravity y MCP
Antigravity cancela las llamadas MCP. Usar **API REST** en su lugar.

### Error 401 Unauthorized
- Verificar que el token no esté expirado
- Regenerar Application Password
- Asegurar que las credenciales estén en formato Base64

---

## Ejemplo de Petición

```bash
# Obtener resumen
curl -u "usuario:password" \
  "https://task.nakomi.studio/wp-json/glory/v1/ai/resumen"

# Crear tarea
curl -X POST -u "usuario:password" \
  -H "Content-Type: application/json" \
  -d '{"texto": "Mi tarea", "prioridad": "Alta"}' \
  "https://task.nakomi.studio/wp-json/glory/v1/ai/tareas"
```

---

## Contexto Copiable para IA

El modal "Conectar con IA" genera automáticamente un contexto markdown que el usuario puede copiar y pegar en cualquier asistente de IA. Este contexto incluye:
- Token de autenticación en Base64
- Todos los endpoints disponibles
- Ejemplos de uso
- Valores válidos para cada campo

---

## ✅ PROBLEMA RESUELTO (31/12/2024)

### Solución aplicada:

El problema era que `generarContextoIA()` en el frontend recalculaba el Base64 con `btoa(usuario:token)`, pero cuando el usuario ya tenía un token existente (sin haberlo regenerado en la sesión actual), `tokenGenerado` era `null` y el contexto mostraba el placeholder.

**Cambios realizados:**

1. **ModalConfiguracionMCP.tsx:**
   - Se modificó `generarContextoIA()` para recibir directamente el `tokenBase64` pre-calculado del backend
   - Se eliminó la lógica de `btoa()` del frontend
   - Se eliminó la función `obtenerUsuario()` que ya no era necesaria
   - Se actualizó la llamada en `obtenerConfiguracion('apirest')` para pasar `tokenBase64`

2. **Backend (Glory/src/Api/MCPController.php):**
   - Ya generaba correctamente `tokenBase64 = base64_encode($user->user_login . ':' . $password)` 
   - No requirió cambios

**Flujo actual correcto:**
1. Usuario genera token → backend devuelve `tokenBase64` con usuario:password codificado
2. Usuario va a pestaña "API REST" → ve contexto con `Authorization: Basic dGFza05ha29taTp...`
3. Si `tokenBase64` es null (token existe pero no fue regenerado en esta sesión) → muestra placeholder con nota de regenerar



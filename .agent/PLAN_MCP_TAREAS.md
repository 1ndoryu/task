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

## 🚨 PROBLEMA PENDIENTE (31/12/2024)

### Error 401 en producción + Username no incluido

**Síntoma:** La API devuelve `rest_forbidden` (401) incluso con token válido.

**Problemas identificados:**

1. **Username no incluido automáticamente**
   - El contexto copiable requiere que el usuario sepa su username
   - Si el usuario está logueado, ya sabemos quién es
   - **Solución:** Incluir el username en el contexto automáticamente

2. **Formato del token**
   - WordPress Application Passwords usan Basic Auth: `base64(usuario:password)`
   - El usuario no debería tener que construir esto manualmente
   - **Solución:** Generar el token Base64 completo y mostrarlo listo para usar

3. **Posible problema de despliegue**
   - El AIApiController.php debe estar cargado en WordPress
   - Verificar que el archivo esté siendo incluido

### TODO:
- [ ] Modificar `generarContextoIA()` para incluir username automáticamente
- [ ] Mostrar el header `Authorization: Basic xxx` completo y listo para copiar
- [ ] Verificar que AIApiController.php esté registrado en WordPress
- [ ] Probar en producción después de las correcciones

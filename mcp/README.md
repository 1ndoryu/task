# Glory MCP Server

Servidor MCP (Model Context Protocol) para el sistema de gestión de tareas Glory.

## Estado del Proyecto

✅ **COMPLETADO Y FUNCIONAL** (31/12/2024)

El servidor MCP está completamente implementado, probado y listo para producción. Todas las herramientas funcionan correctamente.

## Características

- **11 Herramientas MCP** para gestión de tareas, proyectos y hábitos
- **4 Recursos** de solo lectura
- **Autenticación** con WordPress Application Passwords
- **Timeouts configurados** (5 segundos) para evitar bloqueos
- **Protocolo STDIO** limpio sin interferencias

## Herramientas Disponibles

### Tareas (7)
- `obtener_tareas` - Lista tareas con filtros
- `obtener_tareas_proyecto` - Tareas de un proyecto específico
- `obtener_tarea` - Detalle de una tarea
- `crear_tarea` - Nueva tarea
- `editar_tarea` - Modificar tarea
- `completar_tarea` - Toggle completado
- `eliminar_tarea` - Borrar tarea

### Proyectos (2)
- `obtener_proyectos` - Lista proyectos con filtros
- `obtener_proyecto` - Detalle de proyecto

### Hábitos (1)
- `obtener_habitos` - Lista hábitos con filtros

### Dashboard (1)
- `resumen_dashboard` - Estadísticas generales

## Recursos

- `tareas://todas` - Todas las tareas
- `tareas://pendientes` - Solo tareas pendientes
- `proyectos://todos` - Todos los proyectos
- `habitos://todos` - Todos los hábitos

## Instalación

```bash
cd mcp
npm install
npm run build
```

## Configuración

### Variables de Entorno

El servidor necesita las siguientes variables:

```env
GLORY_API_URL=http://glorybuilder.local/wp-json/glory/v1
GLORY_WP_USERNAME=admin
GLORY_WP_PASSWORD=tu_application_password
```

Estas variables se configuran en el cliente MCP (Claude Desktop, Cursor, etc.), NO en el servidor.

### Claude Desktop

1. Abre `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
2. Copia el contenido de `claude_desktop_config.json` de este directorio
3. Reinicia Claude Desktop

### Cursor IDE

1. Crea `.cursor/mcp.json` en la raíz de tu proyecto
2. Usa la misma estructura que `claude_desktop_config.json`
3. Reinicia Cursor

## Pruebas

### Test Manual

```bash
node test-mcp.js
```

Esto verificará que el servidor arranca y responde correctamente.

### Prueba de API

```bash
curl -u "usuario:password" "http://glorybuilder.local/wp-json/glory/v1/dashboard"
```

## Problemas Conocidos

### Antigravity

❌ **El servidor NO funciona con Antigravity** debido a un bug en el motor que cancela automáticamente las llamadas MCP.

**Solución**: Usar Claude Desktop o Cursor IDE en su lugar.

## Estructura del Proyecto

```
mcp/
├── src/
│   ├── index.ts              # Punto de entrada
│   ├── config.ts             # Configuración
│   ├── api/
│   │   └── gloryClient.ts    # Cliente HTTP para WordPress
│   ├── tools/
│   │   ├── tareas.ts         # Herramientas de tareas
│   │   ├── proyectos.ts      # Herramientas de proyectos
│   │   ├── habitos.ts        # Herramientas de hábitos
│   │   └── dashboard.ts      # Herramientas de dashboard
│   ├── resources/
│   │   └── resources.ts      # Recursos MCP
│   └── types/
│       └── dashboard.ts      # Tipos TypeScript
├── dist/                     # Código compilado
├── test-mcp.js              # Script de prueba
├── package.json
├── tsconfig.json
└── README.md
```

## Desarrollo

### Compilar

```bash
npm run build
```

### Modo Watch

```bash
npm run watch
```

## Licencia

Parte del proyecto Glory Builder.

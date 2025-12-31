#!/usr/bin/env node
/*
 * Glory MCP Server
 * Servidor MCP para gestión de tareas, proyectos y hábitos
 *
 * Uso:
 *   node dist/index.js
 *
 * Variables de entorno requeridas:
 *   GLORY_API_URL - URL base de la API (default: http://glorybuilder.local/wp-json/glory/v1)
 *   GLORY_AUTH_TOKEN - Token de autenticación (Application Password en Base64)
 */

/*
 * Cargar variables de entorno manualmente para evitar logs de dotenv
 * que interfieren con el protocolo STDIO del MCP.
 * Las variables de entorno del proceso tienen PRIORIDAD sobre el archivo .env
 */
import {readFileSync} from 'fs';
import {resolve} from 'path';

/* Cargar .env manualmente como fallback (sin ningún output) */
try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').trim();
            /* Solo asignar si la variable NO existe ya en process.env */
            if (key && value && !process.env[key.trim()]) {
                process.env[key.trim()] = value;
            }
        }
    });
} catch (error) {
    /* Si no existe .env o hay error, continuar sin problema */
}

/*
 * Debug desactivado: Los logs interfieren con el protocolo STDIO del MCP
 * Para debug, ejecutar: node dist/index.js 2>debug.log
 */
// console.error('[Glory MCP] Configuración detectada:');
// console.error(`  - GLORY_API_URL: ${process.env.GLORY_API_URL || '(no definida)'} ${envFromProcess.apiUrl ? '(del cliente)' : '(de .env)'}`);
// console.error(`  - GLORY_WP_USERNAME: ${process.env.GLORY_WP_USERNAME || '(no definido)'} ${envFromProcess.username ? '(del cliente)' : '(de .env)'}`);
// console.error(`  - GLORY_WP_PASSWORD: ${process.env.GLORY_WP_PASSWORD ? '***configurado***' : '(no definido)'} ${envFromProcess.password ? '(del cliente)' : '(de .env)'}`);
// console.error(`  - GLORY_AUTH_TOKEN: ${process.env.GLORY_AUTH_TOKEN ? '***configurado***' : '(no definido)'} ${envFromProcess.token ? '(del cliente)' : '(de .env)'}`);

import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema} from '@modelcontextprotocol/sdk/types.js';

/* Importar herramientas de tareas */
import {obtenerTareasSchema, obtenerTareasProyectoSchema, obtenerTareaSchema, crearTareaSchema, editarTareaSchema, completarTareaSchema, eliminarTareaSchema, handleObtenerTareas, handleObtenerTareasProyecto, handleObtenerTarea, handleCrearTarea, handleEditarTarea, handleCompletarTarea, handleEliminarTarea} from './tools/tareas.js';

/* Importar herramientas de proyectos */
import {obtenerProyectosSchema, obtenerProyectoSchema, handleObtenerProyectos, handleObtenerProyecto} from './tools/proyectos.js';

/* Importar herramientas de hábitos */
import {obtenerHabitosSchema, handleObtenerHabitos} from './tools/habitos.js';

/* Importar herramientas de dashboard */
import {handleResumenDashboard} from './tools/dashboard.js';

/* Importar recursos */
import {listaRecursos, handleRecursoTareas, handleRecursoProyectos, handleRecursoHabitos} from './resources/resources.js';

/* Crear servidor MCP */
const server = new Server(
    {
        name: 'glory-tareas',
        version: '1.0.0'
    },
    {
        capabilities: {
            tools: {},
            resources: {}
        }
    }
);

/* Definición de herramientas disponibles */
const toolDefinitions = [
    /* Herramientas de Tareas */
    {
        name: 'obtener_tareas',
        description: 'Lista todas las tareas del usuario. Puede filtrar por estado (pendientes, completadas, todas).',
        inputSchema: {
            type: 'object',
            properties: {
                filtro: {
                    type: 'string',
                    enum: ['pendientes', 'completadas', 'todas'],
                    description: 'Filtrar tareas por estado'
                }
            }
        }
    },
    {
        name: 'obtener_tareas_proyecto',
        description: 'Lista las tareas de un proyecto específico.',
        inputSchema: {
            type: 'object',
            properties: {
                proyectoId: {
                    type: 'number',
                    description: 'ID del proyecto'
                }
            },
            required: ['proyectoId']
        }
    },
    {
        name: 'obtener_tarea',
        description: 'Obtiene los detalles completos de una tarea específica.',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'ID de la tarea'
                }
            },
            required: ['id']
        }
    },
    {
        name: 'crear_tarea',
        description: 'Crea una nueva tarea. Puede asignarla a un proyecto y configurar prioridad/urgencia.',
        inputSchema: {
            type: 'object',
            properties: {
                texto: {
                    type: 'string',
                    description: 'Texto/título de la tarea'
                },
                proyectoId: {
                    type: 'number',
                    description: 'ID del proyecto (opcional)'
                },
                prioridad: {
                    type: 'string',
                    enum: ['alta', 'media', 'baja'],
                    description: 'Nivel de prioridad'
                },
                urgencia: {
                    type: 'string',
                    enum: ['bloqueante', 'urgente', 'normal', 'chill'],
                    description: 'Nivel de urgencia temporal'
                },
                fechaMaxima: {
                    type: 'string',
                    description: 'Fecha límite en formato ISO (ej: 2024-12-31)'
                },
                tags: {
                    type: 'array',
                    items: {type: 'string'},
                    description: 'Etiquetas de la tarea'
                }
            },
            required: ['texto']
        }
    },
    {
        name: 'editar_tarea',
        description: 'Modifica una tarea existente. Solo incluye los campos que deseas cambiar.',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'ID de la tarea a editar'
                },
                texto: {
                    type: 'string',
                    description: 'Nuevo texto de la tarea'
                },
                prioridad: {
                    type: ['string', 'null'],
                    enum: ['alta', 'media', 'baja', null],
                    description: 'Nueva prioridad (null para eliminar)'
                },
                urgencia: {
                    type: ['string', 'null'],
                    enum: ['bloqueante', 'urgente', 'normal', 'chill', null],
                    description: 'Nueva urgencia'
                },
                proyectoId: {
                    type: 'number',
                    description: 'Nuevo proyecto'
                },
                tags: {
                    type: 'array',
                    items: {type: 'string'},
                    description: 'Nuevas etiquetas'
                }
            },
            required: ['id']
        }
    },
    {
        name: 'completar_tarea',
        description: 'Marca una tarea como completada o la desmarca si ya está completada (toggle).',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'ID de la tarea'
                }
            },
            required: ['id']
        }
    },
    {
        name: 'eliminar_tarea',
        description: 'Elimina permanentemente una tarea.',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'ID de la tarea a eliminar'
                }
            },
            required: ['id']
        }
    },
    /* Herramientas de Proyectos */
    {
        name: 'obtener_proyectos',
        description: 'Lista todos los proyectos. Puede filtrar por estado.',
        inputSchema: {
            type: 'object',
            properties: {
                estado: {
                    type: 'string',
                    enum: ['activo', 'completado', 'pausado', 'todos'],
                    description: 'Filtrar por estado del proyecto'
                }
            }
        }
    },
    {
        name: 'obtener_proyecto',
        description: 'Obtiene detalles de un proyecto incluyendo sus tareas.',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'ID del proyecto'
                }
            },
            required: ['id']
        }
    },
    /* Herramientas de Hábitos */
    {
        name: 'obtener_habitos',
        description: 'Lista todos los hábitos. Puede filtrar por importancia.',
        inputSchema: {
            type: 'object',
            properties: {
                importancia: {
                    type: 'string',
                    enum: ['Alta', 'Media', 'Baja'],
                    description: 'Filtrar por importancia'
                }
            }
        }
    },
    /* Herramientas de Dashboard */
    {
        name: 'resumen_dashboard',
        description: 'Obtiene un resumen estadístico del dashboard: total de tareas, proyectos, hábitos, y tareas urgentes.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    }
];

/* Handler para listar herramientas */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {tools: toolDefinitions};
});

/* Handler para ejecutar herramientas */
server.setRequestHandler(CallToolRequestSchema, async request => {
    const {name, arguments: args} = request.params;

    try {
        switch (name) {
            /* Tareas */
            case 'obtener_tareas':
                return await handleObtenerTareas(obtenerTareasSchema.parse(args));
            case 'obtener_tareas_proyecto':
                return await handleObtenerTareasProyecto(obtenerTareasProyectoSchema.parse(args));
            case 'obtener_tarea':
                return await handleObtenerTarea(obtenerTareaSchema.parse(args));
            case 'crear_tarea':
                return await handleCrearTarea(crearTareaSchema.parse(args));
            case 'editar_tarea':
                return await handleEditarTarea(editarTareaSchema.parse(args));
            case 'completar_tarea':
                return await handleCompletarTarea(completarTareaSchema.parse(args));
            case 'eliminar_tarea':
                return await handleEliminarTarea(eliminarTareaSchema.parse(args));

            /* Proyectos */
            case 'obtener_proyectos':
                return await handleObtenerProyectos(obtenerProyectosSchema.parse(args));
            case 'obtener_proyecto':
                return await handleObtenerProyecto(obtenerProyectoSchema.parse(args));

            /* Hábitos */
            case 'obtener_habitos':
                return await handleObtenerHabitos(obtenerHabitosSchema.parse(args));

            /* Dashboard */
            case 'resumen_dashboard':
                return await handleResumenDashboard();

            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Herramienta desconocida "${name}"`
                        }
                    ],
                    isError: true
                };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error ejecutando ${name}: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
});

/* Handler para listar recursos */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {resources: listaRecursos};
});

/* Handler para leer recursos */
server.setRequestHandler(ReadResourceRequestSchema, async request => {
    const {uri} = request.params;

    try {
        if (uri.startsWith('tareas://')) {
            return await handleRecursoTareas(uri);
        }
        if (uri.startsWith('proyectos://')) {
            return await handleRecursoProyectos();
        }
        if (uri.startsWith('habitos://')) {
            return await handleRecursoHabitos();
        }

        throw new Error(`Recurso no encontrado: ${uri}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Error leyendo recurso: ${errorMessage}`);
    }
});

/* Iniciar servidor */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // console.error('[Glory MCP] Servidor iniciado correctamente');
}

main().catch(error => {
    // console.error('[Glory MCP] Error fatal:', error);
    process.exit(1);
});

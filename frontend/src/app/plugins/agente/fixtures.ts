/*
 * plugins/agente/fixtures.ts
 * Fuente única de verdad de la galería visual (Fase 4.5, sección 9.5 del plan):
 * datos realistas y catálogo de entradas. La galería (/agente/visuales, dev) y
 * el test (.freebuff/galeria-visual.mjs) importan ESTE archivo, así no divergen.
 * Archivo de datos puro (sin React ni imports de la app) para que Node 24 pueda
 * importarlo directamente con type-stripping.
 */

/* ---------- Tipos (espejo de los shapes del store/servicio) ---------- */

export interface FixtureTool {
    tool: string;
    ok: boolean;
    resumen: string;
    argumentos?: unknown;
    diff?: string;
}

export interface FixtureContexto {
    ocupacionPct: number | null;
    tokensPrompt: number;
    tokensComplecion: number;
    skills: number;
    /* [318A-7] Desglose de la ventana de contexto (evento contexto_detalle). */
    maxVentana?: number;
    reservaSalida?: number;
    systemInstrucciones?: number;
    definicionesTools?: number;
    mensajes?: number;
    resultadosTools?: number;
    totalEntrada?: number;
}

export interface FixtureMensaje {
    rol: 'user' | 'assistant';
    contenido: string;
    herramientas?: FixtureTool[];
    contexto?: FixtureContexto | null;
    aprobacionPendiente?: {tool: string; argumentos: unknown} | null;
    reintentar?: boolean | null;
}

export interface FixtureTarea {
    id: string;
    nombre: string;
    tipo: 'una_vez' | 'recurrente';
    cron_expr: string | null;
    estado: 'pendiente' | 'ejecutando' | 'completada' | 'fallida' | 'cancelada';
    proxima_ejecucion: string | null;
    result_summary: string | null;
}

export interface FixtureTab {
    id: string;
    titulo: string;
}

export interface FixtureSkill {
    id: string;
    nombre: string;
    descripcion: string;
    activa: boolean;
}

export interface FixtureEntrada {
    id: string;
    titulo: string;
    descripcion: string;
    estados: string[];
    /* Componente aún no implementado en el chat (automejora/verificación
     * aplazada en Fase 3): la entrada existe con fixture, marcada como pendiente. */
    pendiente?: string;
}

/* ---------- Catálogo (los 19 ítems de 9.5) ---------- */

export const CATALOGO: FixtureEntrada[] = [
    {id: '01-usuario', titulo: 'Burbuja de mensaje del usuario', descripcion: 'Mensajes cortos, largos y multilínea alineados a la derecha.', estados: ['corto', 'largo', 'multilínea']},
    {id: '02-asistente', titulo: 'Burbuja del asistente', descripcion: 'Texto completo y cursor de streaming (burbuja "pensando") con avatar.', estados: ['texto completo', 'streaming', 'markdown básico']},
    {id: '03-tool-ejecutando', titulo: 'Tarjeta de tool — ejecutando', descripcion: 'Tool en curso: abierta por defecto con resumen "ejecutando...".', estados: ['en curso']},
    {id: '04-tool-ok', titulo: 'Tarjeta de tool — ok', descripcion: 'Tool exitosa con argumentos expandibles y resultado.', estados: ['éxito', 'argumentos', 'resultado']},
    {id: '05-tool-error', titulo: 'Tarjeta de tool — error', descripcion: 'Tool fallida con el mensaje de error real.', estados: ['error']},
    {id: '06-diff', titulo: 'Bloque diff de archivo modificado', descripcion: 'Diff de líneas add/modify/delete renderizado en <pre> mono.', estados: ['añadir', 'modificar', 'eliminar']},
    {id: '07-trabajando', titulo: 'Indicador "agente trabajando"', descripcion: 'Lista de tools en ejecución con spinner.', estados: ['varias tools', 'una tool']},
    {id: '08-contexto', titulo: 'Barra de contexto real', descripcion: 'Ocupación %, tokens usados, skills/memoria inyectadas.', estados: ['ocupación media', 'tokens', 'skills']},
    {id: '09-tarea-programada', titulo: 'Tarjeta de tarea programada', descripcion: 'Todos los estados de una tarea programada con próxima ejecución y último resultado.', estados: ['pendiente', 'ejecutando', 'completada', 'fallida']},
    {id: '10-tabs-workspace', titulo: 'Tabs de workspace', descripcion: 'Tabs activa/inactiva, varias abiertas y una en renombrado.', estados: ['activa', 'inactiva', 'renombrado']},
    {id: '11-selector-modo', titulo: 'Selector de modo de operación', descripcion: 'Predeterminado / Meta / Autónomo con aviso cuando el modo autónomo está seleccionado.', estados: ['predeterminado', 'meta', 'autónomo + aviso']},
    {id: '12-skills', titulo: 'Badge/lista de skills', descripcion: 'Skills activas e inactivas con su descripción.', estados: ['activa', 'inactiva']},
    {id: '13-error-retryable', titulo: 'Mensaje de error retryable', descripcion: 'Fallo del proveedor con botón "reintentar" (misma clave de idempotencia).', estados: ['error', 'reintentar']},
    {id: '14-estado-vacio', titulo: 'Estado vacío (sin conversación)', descripcion: 'Panel sin conversación activa con acción de crear.', estados: ['vacío']},
    {id: '15-estado-carga', titulo: 'Estado de carga', descripcion: 'Carga de lista/historial con spinner.', estados: ['cargando']},
    {id: '16-boton-cancelar', titulo: 'Botón de cancelación', descripcion: 'Mientras el turno corre, el botón de enviar se vuelve cancelar (AbortController).', estados: ['enviando', 'cancelar']},
    {id: '17-propuesta-skill', titulo: 'Propuesta de skill (automejora)', descripcion: 'Aprobar / descartar una skill sugerida tras un turno.', estados: ['propuesta', 'aprobar', 'descartar'], pendiente: 'Automejora post-turno aplazada (Fase 3): sin contrato backend ni componente en el chat.'},
    {id: '18-aviso-meta', titulo: 'Aviso de meta (modo meta)', descripcion: '"Meta: … · cumplida: sí/no · continúo" visible en turnos meta.', estados: ['cumplida', 'no cumplida'], pendiente: 'Sin contrato SSE de meta en el runtime; aplazada con Fase 3.'},
    {id: '19-verificacion-autonoma', titulo: 'Verificación autónoma', descripcion: 'Razonamiento del verificador visible (seguro/inseguro) en modo autónomo.', estados: ['seguro', 'inseguro'], pendiente: 'Verificador autónomo sin implementar; aplazado.'},
    {id: '20-contexto-detallado', titulo: 'Barra de contexto con desglose (318A-7)', descripcion: 'Barra inferior con desglose por secciones (System Instructions, Tool Definitions, Messages, Tool Results, Reservado para respuesta) + botón Compactar.', estados: ['desglose', 'compactar']},
];

/* ---------- Fixtures de datos realistas ---------- */

const DIFF_EJEMPLO = [
    '--- src/tareas.rs',
    '+++ src/tareas.rs',
    '@@ -12,4 +12,5 @@ pub fn crear(datos: DatosTarea) -> Tarea {',
    '     let tarea = Tarea {',
    '+        estado: Estado::Pendiente,',
    '         prioridad: datos.prioridad,',
    '-        completada: false,',
    '+        completada_el: None,',
    '     };',
    '     guardar(&tarea);',
    ' }',
].join('\n');

export const fixtureMensajes: FixtureMensaje[] = [
    {
        rol: 'user',
        contenido: 'Crea una tarea para mañana: revisar el plan de la semana.',
    },
    {
        rol: 'user',
        contenido: 'Necesito un resumen de las notas de la última reunión.\nIncluye también las decisiones pendientes.\nY separa por tema con viñetas.',
    },
    {
        rol: 'assistant',
        contenido: 'Listo. Creé la tarea "Revisar el plan de la semana" con vencimiento mañana y prioridad media.',
        herramientas: [
            {
                tool: 'crear_tarea',
                ok: true,
                resumen: 'Tarea creada (id 7c2f9a)',
                argumentos: {titulo: 'Revisar el plan de la semana', prioridad: 'media', vencimiento: '2026-08-30'},
            },
        ],
        contexto: {ocupacionPct: 18, tokensPrompt: 2410, tokensComplecion: 120, skills: 2},
    },
    {
        rol: 'assistant',
        contenido: 'Voy a leer el archivo y aplicar los cambios.',
        herramientas: [
            {
                tool: 'file_write',
                ok: true,
                resumen: '3 líneas cambiadas en src/tareas.rs',
                diff: DIFF_EJEMPLO,
            },
        ],
        contexto: {ocupacionPct: 41, tokensPrompt: 6720, tokensComplecion: 388, skills: 2},
    },
    {
        rol: 'assistant',
        contenido: 'La búsqueda web no está disponible ahora mismo.',
        herramientas: [
            {
                tool: 'buscar_web',
                ok: false,
                resumen: '503: el proveedor de búsqueda no responde',
                argumentos: {consulta: 'glory api documentación'},
            },
        ],
        reintentar: true,
    },
];

export const fixtureToolEjecutando: FixtureTool[] = [
    {tool: 'crear_tarea', ok: true, resumen: 'ejecutando...', argumentos: {titulo: 'Revisar plan', prioridad: 'media'}},
];

export const fixtureTrabajando: string[] = ['crear_tarea', 'crear_recordatorio'];

export const fixtureContexto: FixtureContexto = {
    ocupacionPct: 62,
    tokensPrompt: 10160,
    tokensComplecion: 1440,
    skills: 3,
};

/* [318A-7] Contexto con desglose completo (evento contexto_detalle real).
 * Valores coherentes: totalEntrada = system + tools + mensajes + resultados;
 * ocupacionPct = totalEntrada / (maxVentana − reservaSalida). */
export const fixtureContextoDetallado: FixtureContexto = {
    ocupacionPct: 18.6,
    tokensPrompt: 15872,
    tokensComplecion: 320,
    skills: 2,
    maxVentana: 128000,
    reservaSalida: 20000,
    systemInstrucciones: 1920,
    definicionesTools: 2176,
    mensajes: 12800,
    resultadosTools: 3072,
    totalEntrada: 19968,
};

export const fixtureTareas: FixtureTarea[] = [
    {id: 't1', nombre: 'Resumen semanal', tipo: 'recurrente', cron_expr: 'cadaLun', estado: 'pendiente', proxima_ejecucion: '2026-09-02T09:00:00Z', result_summary: null},
    {id: 't2', nombre: 'Enviar informe', tipo: 'una_vez', cron_expr: null, estado: 'ejecutando', proxima_ejecucion: null, result_summary: null},
    {id: 't3', nombre: 'Revisar métricas', tipo: 'una_vez', cron_expr: null, estado: 'completada', proxima_ejecucion: null, result_summary: '3 métricas actualizadas y resumen enviado.'},
    {id: 't4', nombre: 'Backup nocturno', tipo: 'recurrente', cron_expr: 'cada3d', estado: 'fallida', proxima_ejecucion: '2026-09-05T02:00:00Z', result_summary: 'Error: disco lleno en el destino de copia.'},
];

export const fixtureTabs: FixtureTab[] = [
    {id: 'c1', titulo: 'Planificación semanal'},
    {id: 'c2', titulo: 'Notas de la reunión'},
    {id: 'c3', titulo: 'Tareas del proyecto'},
];

export const fixtureSkills: FixtureSkill[] = [
    {id: 's1', nombre: 'Productividad', descripcion: 'Prefiere tareas cortas y prioridad alta para bloques de 25 min.', activa: true},
    {id: 's2', nombre: 'Idioma', descripcion: 'Responde siempre en español, salvo que el usuario escriba en otro idioma.', activa: true},
    {id: 's3', nombre: 'Informes', descripcion: 'Los resúmenes terminan con una sección de próximos pasos.', activa: false},
];

export const fixturePropuestaSkill = {
    nombre: 'Resúmenes por secciones',
    descripcion: 'Observado en 3 turnos: dividir los resúmenes largos en secciones con encabezados.',
    activa: false,
};

export const fixtureAvisoMeta = {
    meta: 'Reordenar las tareas de hoy por prioridad',
    cumplida: false,
    continúo: true,
};

export const fixtureVerificacionAutonoma = {
    seguro: true,
    razonamiento: 'Las herramientas ejecutadas fueron de solo lectura (listar_tareas, listar_notas); no hay efecto persistente que confirmar.',
    inseguro: 'El turno incluye file_write fuera del workspace registrado; se requiere aprobación.',
};

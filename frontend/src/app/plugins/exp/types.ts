/*
 * plugins/exp/types.ts
 * Tipos del plugin EXP (gamificación).
 * La dificultad se guarda en el payload de cada hábito/tarea; la vida/EXP/nivel
 * viven en el store persist `glory-exp` (sincronizado a preferencias del servidor,
 * como ayuno/déficit). Los incumplimientos para la vida se DERIVAN del historial
 * real (payload historialCompletados/pospuestos + frecuencia), igual que el panel
 * de Actividad: hecho durable, sin depender de activity_events.
 */

/* Misma escala que la importancia para que la curva sea coherente. */
export type Dificultad = 'Muy Baja' | 'Baja' | 'Media' | 'Alta' | 'Muy Alta';

export const DIFICULTADES: Dificultad[] = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];

/* Tipo de entidad que otorga EXP. */
export type TipoEntidadExp = 'tarea' | 'habito' | 'subhabito' | 'proyecto';

/* Registro de EXP ganada (se persiste en el store, con fecha). */
export interface RegistroExp {
    id: string;
    fecha: string; /* YYYY-MM-DD local */
    entidadId: number;
    entidadTipo: TipoEntidadExp;
    nombre: string;
    dificultad: Dificultad;
    exp: number;
}

/* Configuración del plugin (editable en el modal de configuración). */
export interface ConfigExp {
    /* Dificultad automática por IA al crear/editar entidades (solo plugin activo). */
    dificultadAutomatica: boolean;
    /* Vida máxima (por defecto 100). */
    vidaMaxima: number;
    /* Penalización por incumplimiento: fracción de (baseDificultad × multImportancia). */
    penalizacionFraccion: number; /* 0.5 = mitad */
    /* Ventana de días hacia atrás que cuentan como incumplimiento para la vida. */
    ventanaIncumplimientos: number; /* 14 */
    /* Multiplicador por tipo de entidad. */
    multHabito: number;
    multTarea: number;
    multSubhabito: number;
    multProyecto: number;
    /* Umbral base del nivel 1 (nivel N → expNecesaria = base × N^1.5). */
    expBaseNivel: number; /* 100 */
}

export const CONFIG_EXP_POR_DEFECTO: ConfigExp = {
    dificultadAutomatica: true,
    vidaMaxima: 100,
    penalizacionFraccion: 0.5,
    ventanaIncumplimientos: 14,
    multHabito: 1,
    multTarea: 1,
    multSubhabito: 0.5,
    multProyecto: 2,
    expBaseNivel: 100
};

/* Estado completo persistido del plugin. */
export interface EstadoExp {
    vida: number;
    exp: number;
    /* exp del nivel actual (para la barra) */
    expEnNivel: number;
    expParaSiguienteNivel: number;
    nivel: number;
    /* Dificultades por entidad (id → dificultad), cache local del payload. */
    dificultades: Record<string, Dificultad>;
    /* Registros de EXP ganada (últimos; el resto se deriva). */
    registros: RegistroExp[];
    /* Timestamp de última sincronización a preferencias del servidor. */
    ultimaSync: number;
    /* Fecha del último recálculo de vida (para no penalizar dos veces). */
    ultimoCalculoVida: string;
    /* [28-08-2026] Imágenes editadas por el usuario por estado (0..100): cada
     * estado guarda las claves "x,y" de TODAS las celdas del árbol dibujadas en
     * el editor pixel-art (tronco incluido si el usuario lo conservó). La imagen
     * editada reemplaza por completo a la por defecto en el render. Arrays para
     * persistencia JSON fiable (Set no serializa). */
    copasArbol: Record<string, string[]>;
    /* [28-08-2026] Flag de migración del editor del árbol: la v1 guardaba solo
     * la copa (sin tronco, porque era bloqueado). Al migrar una sola vez se
     * añade el tronco por defecto (migrarCopaLegacy) y se marca aquí para no
     * volver a fusionar (el usuario YA puede borrar el tronco a propósito). */
    copasArbolMigrado: boolean;
}

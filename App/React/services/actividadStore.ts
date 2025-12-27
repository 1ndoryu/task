/**
 * Store de Actividad
 *
 * Gestiona el cache de datos del mapa de calor y proporciona
 * un sistema de eventos para invalidación en tiempo real.
 *
 * Este store permite:
 * - Cache de datos del heatmap con TTL configurable
 * - Invalidacion automatica al registrar nuevas actividades
 * - Suscripcion a cambios para actualizar componentes en tiempo real
 *
 * @package App/React/services
 */

import type {DatosHeatmap, FiltrosActividad, PeriodoActividad, EstadisticasActividad} from '../hooks/useActividad';

/* Configuracion del cache */
const CACHE_TTL_MS = 5 * 60 * 1000; /* 5 minutos */
const CACHE_KEY_PREFIX = 'actividad_cache_';
const SESSION_STORAGE_KEY = 'glory_actividad_cache';

/* Tipos para el store */
interface CacheEntry {
    datos: DatosHeatmap;
    periodo: PeriodoActividad | null;
    estadisticas: EstadisticasActividad | null;
    timestamp: number;
    filtrosKey: string;
}

type ActividadListener = () => void;

/**
 * Carga el cache desde sessionStorage al inicializar
 */
function cargarCacheDeStorage(): Map<string, CacheEntry> {
    try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as [string, CacheEntry][];
            return new Map(parsed);
        }
    } catch (e) {
        console.warn('[ActividadStore] Error cargando cache:', e);
    }
    return new Map();
}

/**
 * Guarda el cache en sessionStorage
 */
function guardarCacheEnStorage(): void {
    try {
        const entries = Array.from(cache.entries());
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
        console.warn('[ActividadStore] Error guardando cache:', e);
    }
}

/* Estado global del store - inicializado desde sessionStorage */
let cache: Map<string, CacheEntry> = cargarCacheDeStorage();
let listeners: Set<ActividadListener> = new Set();
let invalidacionPendiente = false;

/**
 * Genera una key unica para los filtros dados
 */
function generarCacheKey(filtros: FiltrosActividad = {}): string {
    const partes: string[] = [];

    if (filtros.periodo) partes.push(`p:${filtros.periodo}`);
    if (filtros.fechaInicio) partes.push(`fi:${filtros.fechaInicio}`);
    if (filtros.fechaFin) partes.push(`ff:${filtros.fechaFin}`);
    if (filtros.tipo) partes.push(`t:${filtros.tipo}`);
    if (filtros.proyectoId) partes.push(`pr:${filtros.proyectoId}`);
    if (filtros.habitoId) partes.push(`h:${filtros.habitoId}`);

    return CACHE_KEY_PREFIX + (partes.length > 0 ? partes.join('_') : 'default');
}

/**
 * Verifica si una entrada de cache es valida (no expirada)
 */
function esCacheValido(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Obtiene datos del cache si existen y son validos
 */
export function obtenerDelCache(filtros: FiltrosActividad = {}): CacheEntry | null {
    const key = generarCacheKey(filtros);
    const entry = cache.get(key);

    if (entry && esCacheValido(entry)) {
        return entry;
    }

    /* Si existe pero esta expirado, eliminarlo */
    if (entry) {
        cache.delete(key);
    }

    return null;
}

/**
 * Guarda datos en el cache
 */
export function guardarEnCache(filtros: FiltrosActividad, datos: DatosHeatmap, periodo: PeriodoActividad | null, estadisticas: EstadisticasActividad | null = null): void {
    const key = generarCacheKey(filtros);
    cache.set(key, {
        datos,
        periodo,
        estadisticas,
        timestamp: Date.now(),
        filtrosKey: key
    });
    /* Persistir en sessionStorage */
    guardarCacheEnStorage();
}

/**
 * Invalida todo el cache
 * Notifica a los listeners para que recarguen sus datos
 */
export function invalidarCache(): void {
    /* Evitar multiples invalidaciones simultaneas */
    if (invalidacionPendiente) return;

    invalidacionPendiente = true;
    cache.clear();
    /* Limpiar sessionStorage */
    guardarCacheEnStorage();

    /* Usar requestAnimationFrame para agrupar notificaciones */
    requestAnimationFrame(() => {
        notificarListeners();
        invalidacionPendiente = false;
    });
}

/**
 * Invalida solo las entradas de cache que coincidan con ciertos filtros
 * Util para invalidaciones parciales (ej: solo tareas de un proyecto)
 */
export function invalidarCacheParcial(filtros: Partial<FiltrosActividad>): void {
    const keysAEliminar: string[] = [];

    cache.forEach((entry, key) => {
        /* Si no hay filtros especificos, eliminar todo */
        if (Object.keys(filtros).length === 0) {
            keysAEliminar.push(key);
            return;
        }

        /* Verificar si la key contiene los filtros especificados */
        let coincide = true;
        if (filtros.tipo && !key.includes(`t:${filtros.tipo}`)) {
            coincide = false;
        }
        if (filtros.proyectoId && !key.includes(`pr:${filtros.proyectoId}`)) {
            coincide = false;
        }
        if (filtros.habitoId && !key.includes(`h:${filtros.habitoId}`)) {
            coincide = false;
        }

        /* Si coincide con los filtros, o es cache general, eliminar */
        if (coincide || key === CACHE_KEY_PREFIX + 'default') {
            keysAEliminar.push(key);
        }
    });

    if (keysAEliminar.length > 0) {
        keysAEliminar.forEach(key => cache.delete(key));
        notificarListeners();
    }
}

/**
 * Notifica a todos los listeners de un cambio
 */
function notificarListeners(): void {
    listeners.forEach(listener => {
        try {
            listener();
        } catch (error) {
            console.warn('[ActividadStore] Error en listener:', error);
        }
    });
}

/**
 * Suscribe un listener para cambios en la actividad
 * Retorna una funcion para desuscribirse
 */
export function suscribirACambios(listener: ActividadListener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/**
 * Obtiene el numero de entradas en cache (para debug)
 */
export function obtenerTamanoCache(): number {
    return cache.size;
}

/**
 * Limpia entradas expiradas del cache
 */
export function limpiarCacheExpirado(): void {
    const ahora = Date.now();
    const keysAEliminar: string[] = [];

    cache.forEach((entry, key) => {
        if (ahora - entry.timestamp >= CACHE_TTL_MS) {
            keysAEliminar.push(key);
        }
    });

    keysAEliminar.forEach(key => cache.delete(key));
}

/**
 * Resetea completamente el store (para testing)
 */
export function resetearStore(): void {
    cache.clear();
    listeners.clear();
    invalidacionPendiente = false;
}

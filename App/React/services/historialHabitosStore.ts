/**
 * Store de Historial de Habitos
 *
 * Gestiona la sincronizacion y cache del historial de habitos entre
 * diferentes componentes (panel de ejecucion, modal de habito).
 *
 * Este store permite:
 * - Notificar cuando un habito es marcado/desmarcado
 * - Mantener sincronizados el MapaCalorHabito y el HistorialHabito
 * - Cache de historial con TTL para carga instantanea del modal
 *
 * @package App/React/services
 */

import type {HistorialHabito, DiaHistorial, EstadisticasHabito} from '../types/historialHabitos';

/* Configuracion del cache */
const CACHE_TTL_MS = 10 * 60 * 1000; /* 10 minutos */
const SESSION_STORAGE_KEY = 'glory_historial_habitos_cache';

/* Tipos para el cache */
interface CacheEntryHistorial {
    historial: HistorialHabito;
    resumen7Dias: DiaHistorial[];
    estadisticas: EstadisticasHabito | null;
    timestamp: number;
    dias: number;
}

type HistorialListener = (habitoId: number, fecha: string) => void;

/**
 * Carga el cache desde sessionStorage al inicializar
 */
function cargarCacheDeStorage(): Map<number, CacheEntryHistorial> {
    try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as [number, CacheEntryHistorial][];
            return new Map(parsed);
        }
    } catch (e) {
        console.warn('[HistorialHabitosStore] Error cargando cache:', e);
    }
    return new Map();
}

/**
 * Guarda el cache en sessionStorage
 */
function guardarCacheEnStorage(): void {
    try {
        const entries = Array.from(cacheHistorial.entries());
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
        console.warn('[HistorialHabitosStore] Error guardando cache:', e);
    }
}

/* Estado global - inicializado desde sessionStorage */
let listeners: Set<HistorialListener> = new Set();
let cacheHistorial: Map<number, CacheEntryHistorial> = cargarCacheDeStorage();

/**
 * Verifica si una entrada de cache es valida (no expirada)
 */
function esCacheValido(entry: CacheEntryHistorial): boolean {
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Obtiene el historial de un habito desde el cache
 * Retorna null si no existe o esta expirado
 */
export function obtenerHistorialDelCache(habitoId: number, diasRequeridos: number = 30): CacheEntryHistorial | null {
    const entry = cacheHistorial.get(habitoId);

    if (entry && esCacheValido(entry) && entry.dias >= diasRequeridos) {
        return entry;
    }

    /* Si existe pero esta expirado o tiene menos dias, eliminarlo */
    if (entry) {
        cacheHistorial.delete(habitoId);
    }

    return null;
}

/**
 * Guarda el historial de un habito en el cache
 */
export function guardarHistorialEnCache(habitoId: number, historial: HistorialHabito, resumen7Dias: DiaHistorial[], estadisticas: EstadisticasHabito | null, dias: number): void {
    cacheHistorial.set(habitoId, {
        historial,
        resumen7Dias,
        estadisticas,
        timestamp: Date.now(),
        dias
    });
    /* Persistir en sessionStorage */
    guardarCacheEnStorage();
}

/**
 * Actualiza una fecha especifica en el cache sin invalidar todo
 * Util para actualizaciones optimistas
 */
export function actualizarFechaEnCache(habitoId: number, fecha: string, estado: 'completado' | 'pospuesto' | 'omitido' | null): void {
    const entry = cacheHistorial.get(habitoId);
    if (!entry) return;

    const nuevoHistorial = {...entry.historial};

    if (estado === null) {
        delete nuevoHistorial[fecha];
    } else {
        nuevoHistorial[fecha] = {
            estado,
            notas: null,
            fechaRegistro: new Date().toISOString()
        };
    }

    cacheHistorial.set(habitoId, {
        ...entry,
        historial: nuevoHistorial,
        timestamp: Date.now()
    });
    /* Persistir en sessionStorage */
    guardarCacheEnStorage();
}

/**
 * Invalida el cache de un habito especifico
 */
export function invalidarCacheHabito(habitoId: number): void {
    cacheHistorial.delete(habitoId);
    guardarCacheEnStorage();
}

/**
 * Invalida todo el cache de historial
 */
export function invalidarTodoCacheHistorial(): void {
    cacheHistorial.clear();
    guardarCacheEnStorage();
}

/**
 * Notifica que un habito ha sido marcado o desmarcado
 * Esto permite que otros componentes actualicen su estado
 */
export function notificarCambioHabito(habitoId: number, fecha: string): void {
    listeners.forEach(listener => {
        try {
            listener(habitoId, fecha);
        } catch (error) {
            console.warn('[HistorialHabitosStore] Error en listener:', error);
        }
    });
}

/**
 * Suscribe un listener para cambios en el historial de habitos
 * Retorna una funcion para desuscribirse
 */
export function suscribirACambiosHistorial(listener: HistorialListener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/**
 * Limpia todos los listeners (para testing)
 */
export function limpiarListeners(): void {
    listeners.clear();
}

/**
 * Resetea completamente el store (para testing)
 */
export function resetearStoreHistorial(): void {
    listeners.clear();
    cacheHistorial.clear();
}

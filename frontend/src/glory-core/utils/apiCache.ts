/*
 * Cache en memoria para la API de WordPress.
 * Extraído de useWordPressApi para cumplir SRP y límite de líneas.
 *
 * Implementa stale-while-revalidate con TTL y límite máximo de entries
 * para evitar crecimiento ilimitado de memoria.
 */

import type { ApiRequestOptions } from '../types/api';

export const DEFAULT_CACHE_TTL = 30_000; /* 30 segundos */
const MAX_CACHE_ENTRIES = 100;

type EntryCache = { data: unknown; timestamp: number };

/* El estado mutable vive privado en este modulo (regla singleton-mutable-state):
 * externamente solo se accede via leerCache/escribirCache/clear/invalidate. */
const apiCache = new Map<string, EntryCache>();

/* Acceso seguro por clave para stale-while-revalidate. */
export function leerCache(key: string): EntryCache | undefined {
    return apiCache.get(key);
}

/* Escribe una entrada y acota la memoria con limpiarCacheExpirado. */
export function escribirCache(key: string, data: unknown, timestamp: number, ttl: number = DEFAULT_CACHE_TTL): void {
    apiCache.set(key, { data, timestamp });
    limpiarCacheExpirado(ttl);
}

/* Limpia entries expiradas del cache para evitar memory leak */
export function limpiarCacheExpirado(ttl: number): void {
    if (apiCache.size <= MAX_CACHE_ENTRIES) return;
    const ahora = Date.now();
    for (const [key, entry] of apiCache) {
        if (ahora - entry.timestamp > ttl) {
            apiCache.delete(key);
        }
    }
    /* Si sigue excediendo, eliminar las mas antiguas */
    if (apiCache.size > MAX_CACHE_ENTRIES) {
        const entries = [...apiCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        const sobran = entries.length - MAX_CACHE_ENTRIES;
        for (let i = 0; i < sobran; i++) {
            apiCache.delete(entries[i][0]);
        }
    }
}

export function getCacheKey(endpoint: string, options?: ApiRequestOptions): string {
    const method = options?.method ?? 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
}

/* Limpia toda la cache de la API. Util al invalidar datos (ej: despues de un POST). */
export function clearApiCache(): void {
    apiCache.clear();
}

/* Invalida una entrada especifica de la cache. */
export function invalidateApiCache(endpoint: string, options?: ApiRequestOptions): void {
    const key = getCacheKey(endpoint, options);
    apiCache.delete(key);
}

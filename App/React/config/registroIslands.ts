/*
 * config/registroIslands.ts
 * Registro central de islands React (OCP)
 *
 * Este registro permite agregar nuevas islands sin modificar appIslands.tsx
 * Cada island se auto-registra al ser importada.
 *
 * COMPATIBILIDAD: Este sistema es ADITIVO. Los proyectos que usan
 * el método manual (appIslands.tsx con objeto exportado) siguen funcionando.
 */

import type {ComponentType} from 'react';

/* Tipo para props de islands */
type IslandProps = Record<string, unknown>;

/* Tipo para componentes de islands */
type IslandComponent = ComponentType<IslandProps>;

/* Definición de una island */
export interface DefinicionIsland {
    id: string;
    componente: IslandComponent;
    descripcion?: string;
}

/* Mapa interno del registro */
const _registro: Map<string, DefinicionIsland> = new Map();

/* Bandera para detectar si el registro ya fue inicializado */
let _inicializado = false;

/*
 * Registrar una nueva island
 * @param id - Nombre único de la island (usado en data-island)
 * @param componente - Componente React a renderizar
 * @param descripcion - Descripción opcional para documentación
 */
export function registrarIsland(id: string, componente: IslandComponent, descripcion?: string): void {
    if (_registro.has(id)) {
        console.warn(`[Glory Islands] Island "${id}" ya registrada, sobrescribiendo...`);
    }
    _registro.set(id, {id, componente, descripcion});
}

/* Verificar si el registro está vacío */
export function registroIslandsVacio(): boolean {
    return _registro.size === 0;
}

/* Marcar el registro como inicializado */
export function marcarIslandsInicializadas(): void {
    _inicializado = true;
}

/* Verificar si está inicializado */
export function islandsInicializadas(): boolean {
    return _inicializado;
}

/* Obtener todos los IDs de islands registradas */
export function obtenerIdsIslands(): string[] {
    return Array.from(_registro.keys());
}

/* Obtener definición de una island */
export function obtenerIsland(id: string): DefinicionIsland | undefined {
    return _registro.get(id);
}

/* Obtener todas las definiciones de islands */
export function obtenerTodasIslands(): DefinicionIsland[] {
    return Array.from(_registro.values());
}

/*
 * Obtener mapa de componentes para main.tsx
 * Formato: { islandName: Component }
 */
export function obtenerMapaComponentes(): Record<string, IslandComponent> {
    const mapa: Record<string, IslandComponent> = {};
    _registro.forEach(def => {
        mapa[def.id] = def.componente;
    });
    return mapa;
}

/*
 * Fusionar islands del registro con islands manuales (compatibilidad)
 * Las islands manuales tienen prioridad para evitar romper proyectos existentes
 */
export function fusionarConIslandsManuales(islandsManuales: Record<string, IslandComponent>): Record<string, IslandComponent> {
    const islandsRegistro = obtenerMapaComponentes();

    /* Manual tiene prioridad sobre registro para backwards-compatibility */
    return {
        ...islandsRegistro,
        ...islandsManuales
    };
}

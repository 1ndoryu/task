/*
 * config/registroPaneles.ts
 * Registro central de paneles del dashboard
 * Fuente única de verdad para definición de paneles (OCP)
 *
 * Este registro permite agregar nuevos paneles sin modificar otros archivos.
 * Cada panel se auto-registra al ser importado.
 */

import type {DefinicionPanel, ModoColumnas, OrdenPanel} from '../types/paneles';

/* Mapa interno del registro */
const _registro: Map<string, DefinicionPanel> = new Map();

/* Bandera para detectar si el registro ya fue inicializado */
let _inicializado = false;

/* Registrar un nuevo panel */
export function registrarPanel(definicion: DefinicionPanel): void {
    if (_registro.has(definicion.id)) {
        console.warn(`Panel "${definicion.id}" ya registrado, sobrescribiendo...`);
    }
    _registro.set(definicion.id, definicion);
}

/* Verificar si el registro está vacío (para debugging) */
export function registroEstaVacio(): boolean {
    return _registro.size === 0;
}

/* Marcar el registro como inicializado */
export function marcarRegistroInicializado(): void {
    _inicializado = true;
}

/* Verificar si está inicializado */
export function registroEstaInicializado(): boolean {
    return _inicializado;
}

/* Obtener todos los IDs de paneles registrados */
export function obtenerIdsPaneles(): string[] {
    return Array.from(_registro.keys());
}

/* Obtener definición de un panel */
export function obtenerPanel(id: string): DefinicionPanel | undefined {
    return _registro.get(id);
}

/* Obtener todas las definiciones de paneles */
export function obtenerTodosPaneles(): DefinicionPanel[] {
    return Array.from(_registro.values());
}

/* Generar configuración de visibilidad por defecto */
export function generarVisibilidadDefecto(): Record<string, boolean> {
    const visibilidad: Record<string, boolean> = {};
    _registro.forEach((def, id) => {
        visibilidad[id] = def.visiblePorDefecto;
    });
    return visibilidad;
}

/* Generar configuración de alturas por defecto */
export function generarAlturasDefecto(): Record<string, string> {
    const alturas: Record<string, string> = {};
    _registro.forEach((def, id) => {
        alturas[id] = def.alturaDefecto;
    });
    return alturas;
}

/* Generar orden de paneles por defecto para un modo de columnas */
export function generarOrdenDefecto(modo: ModoColumnas): OrdenPanel[] {
    const orden: OrdenPanel[] = [];

    _registro.forEach((def, id) => {
        const pos = def.posicionDefecto[modo];
        orden.push({id, columna: pos.columna, posicion: pos.posicion});
    });

    return orden.sort((a, b) => {
        if (a.columna !== b.columna) return a.columna - b.columna;
        return a.posicion - b.posicion;
    });
}

/* Obtener paneles para navegación móvil */
export function obtenerPanelesMovil(): Array<{id: string; titulo: string; idPagina: string}> {
    const paneles: Array<{id: string; titulo: string; idPagina: string}> = [];

    _registro.forEach((def, id) => {
        if (def.enNavegacionMovil) {
            paneles.push({
                id,
                titulo: def.tituloMovil || def.titulo,
                idPagina: def.idPaginaMovil || id
            });
        }
    });

    return paneles;
}

/* Obtener título de un panel para móvil */
export function obtenerTituloPanelMovil(panelId: string): string {
    const panel = _registro.get(panelId);
    return panel?.tituloMovil || panel?.titulo || panelId;
}

/* Mapear una página móvil a su panelId correspondiente */
export function paginaMovilAPanelId(idPagina: string): string | undefined {
    for (const [panelId, def] of _registro) {
        if (def.enNavegacionMovil) {
            const idPaginaPanel = def.idPaginaMovil || panelId;
            if (idPaginaPanel === idPagina) {
                return panelId;
            }
        }
    }
    return undefined;
}

/* Obtener todas las páginas móvil válidas */
export function obtenerPaginasMovilValidas(): string[] {
    const paginas: string[] = [];
    _registro.forEach((def, panelId) => {
        if (def.enNavegacionMovil) {
            paginas.push(def.idPaginaMovil || panelId);
        }
    });
    return paginas;
}

/* Verificar si un panel maneja su propia altura */
export function panelManejaAlturaPropia(panelId: string): boolean {
    const panel = _registro.get(panelId);
    return panel?.manejaAlturaPropia ?? false;
}

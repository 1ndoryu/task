/*
 * borradosPendientes.ts
 *
 * [18-08-2026] Tombstones de entidades eliminadas localmente.
 *
 * Por qué existe: el guardado del dashboard syncroniza POR ENTIDAD (PUT
 * /api/tasks|projects|habits/{id}) y solo envía lo que sigue presente. Si el
 * usuario elimina una tarea, el servidor nunca se entera (nunca llega un
 * "delete"), la conserva con deleted_at IS NULL, y en el siguiente refresh
 * (30s/foco/recarga) vuelve a aparecer. Este módulo guarda los IDs pendientes
 * de soft-delete en localStorage (sobreviven recargas) y guardar() los envía
 * como DELETE /api/{tipo}/{id} por lote.
 *
 * Deshacer: al deshacer una eliminación se desmarca el tombstone; si el DELETE
 * ya se envió, el siguiente upsert revive la fila (el backend pone
 * deleted_at = NULL en el ON CONFLICT). Ambos órdenes convergen al estado
 * local.
 */

export type TipoEntidadBorrable = 'tareas' | 'proyectos' | 'habitos';

interface RegistroBorrados {
    tareas: number[];
    proyectos: number[];
    habitos: number[];
}

const CLAVE_LOCALSTORAGE = 'glory_borrados_pendientes';

const REGISTRO_VACIO: RegistroBorrados = {tareas: [], proyectos: [], habitos: []};

function leerRegistro(): RegistroBorrados {
    try {
        const crudo = localStorage.getItem(CLAVE_LOCALSTORAGE);
        if (!crudo) return {...REGISTRO_VACIO};
        const parseado = JSON.parse(crudo) as Partial<RegistroBorrados>;
        return {
            tareas: Array.isArray(parseado.tareas) ? parseado.tareas.filter(n => typeof n === 'number') : [],
            proyectos: Array.isArray(parseado.proyectos) ? parseado.proyectos.filter(n => typeof n === 'number') : [],
            habitos: Array.isArray(parseado.habitos) ? parseado.habitos.filter(n => typeof n === 'number') : []
        };
    } catch {
        return {...REGISTRO_VACIO};
    }
}

function escribirRegistro(registro: RegistroBorrados): void {
    try {
        localStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(registro));
    } catch (error) {
        console.warn('[BorradosPendientes] No se pudo persistir:', error);
    }
}

/** Marca una entidad como eliminada localmente (pendiente de DELETE en servidor). */
export function marcarBorrado(tipo: TipoEntidadBorrable, id: number): void {
    if (!Number.isFinite(id) || id <= 0) return;
    const registro = leerRegistro();
    if (!registro[tipo].includes(id)) {
        registro[tipo].push(id);
        escribirRegistro(registro);
    }
}

/** Desmarca un borrado (deshacer): la entidad volverá a subirse con el próximo upsert. */
export function desmarcarBorrado(tipo: TipoEntidadBorrable, id: number): void {
    const registro = leerRegistro();
    registro[tipo] = registro[tipo].filter(existente => existente !== id);
    escribirRegistro(registro);
}

/** Copia del registro de borrados pendientes. */
export function obtenerBorradosPendientes(): RegistroBorrados {
    return leerRegistro();
}

/** True si hay algún borrado pendiente (permite al guard anti-wipeout dejar pasar el flush). */
export function hayBorradosPendientes(): boolean {
    const registro = leerRegistro();
    return registro.tareas.length > 0 || registro.proyectos.length > 0 || registro.habitos.length > 0;
}

/** Elimina del registro los borrados que ya se confirmaron contra el servidor. */
export function confirmarBorradosConfirmados(confirmados: Array<{tipo: TipoEntidadBorrable; id: number}>): void {
    if (confirmados.length === 0) return;
    const registro = leerRegistro();
    const conjunto = new Set(confirmados.map(c => `${c.tipo}:${c.id}`));
    (['tareas', 'proyectos', 'habitos'] as const).forEach(tipo => {
        registro[tipo] = registro[tipo].filter(id => !conjunto.has(`${tipo}:${id}`));
    });
    escribirRegistro(registro);
}

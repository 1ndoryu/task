/* [18-08-2026] notasService contra /api/notes (backend Rust).
 * El backend devuelve JSON plano (Note: id/folderId/title/content/createdAt/
 * updatedAt, ids UUID) y envelope de carpetas como array plano. Este servicio
 * mapea al contrato del front ({success, notas, total, hayMas}, CarpetaNota).
 * Sesion por cookie HttpOnly + X-CSRF-Token en mutaciones. */

import {apiFetch} from '../utils/apiClient';
import {Nota, CarpetaNota, RespuestaListaNotas} from '../types/notas';

interface NotaRust {
    id: string;
    folderId: string | null;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

interface CarpetaRust {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

interface ListadoRust {
    items: NotaRust[];
    total: number;
}

function mapearNota(n: NotaRust): Nota {
    return {
        id: n.id as unknown as number,
        carpetaId: (n.folderId ?? null) as unknown as number | null,
        titulo: n.title,
        contenido: n.content,
        fechaCreacion: n.createdAt,
        fechaModificacion: n.updatedAt
    };
}

function mapearCarpeta(c: CarpetaRust): CarpetaNota {
    return {
        id: c.id as unknown as number,
        nombre: c.name,
        orden: 0,
        totalNotas: 0,
        esVirtual: false
    };
}

/**
 * Servicio para interactuar con la API de Notas
 */
export const notasService = {
    /**
     * Carga el listado de notas paginado
     */
    async cargarNotas(limite: number, offset: number): Promise<RespuestaListaNotas> {
        const pagina = Math.floor(offset / limite) + 1;
        const datos = await apiFetch<ListadoRust>(`/notes?page=${pagina}&perPage=${limite}`);

        return {
            success: true,
            notas: (datos?.items || []).map(mapearNota),
            total: datos?.total ?? 0,
            hayMas: offset + (datos?.items?.length || 0) < (datos?.total ?? 0)
        };
    },

    /**
     * Busca notas por término
     */
    async buscarNotas(termino: string): Promise<Nota[]> {
        const datos = await apiFetch<ListadoRust>(`/notes?page=1&perPage=50&search=${encodeURIComponent(termino)}`);
        return (datos?.items || []).map(mapearNota);
    },

    /**
     * Crea una nueva nota
     */
    async crearNota(titulo: string, contenido: string): Promise<Nota> {
        const nota = await apiFetch<NotaRust>('/notes', {
            method: 'POST',
            body: JSON.stringify({title: titulo, content: contenido})
        });
        return mapearNota(nota);
    },

    /**
     * Actualiza una nota existente
     */
    async actualizarNota(id: number, titulo: string, contenido: string): Promise<Nota> {
        const nota = await apiFetch<NotaRust>(`/notes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({title: titulo, content: contenido})
        });
        return mapearNota(nota);
    },

    /**
     * Elimina una nota por ID
     */
    async eliminarNota(id: number): Promise<boolean> {
        await apiFetch(`/notes/${id}`, {method: 'DELETE'});
        return true;
    },

    /**
     * Mueve una nota a otra carpeta
     */
    async moverNota(notaId: number, carpetaId: number | null): Promise<boolean> {
        await apiFetch(`/notes/${notaId}/folder`, {
            method: 'PUT',
            body: JSON.stringify({folderId: carpetaId !== null ? String(carpetaId) : null})
        });
        return true;
    }
};

/*
 * Servicio para carpetas de notas
 */
export const carpetasNotasService = {
    /**
     * Obtiene todas las carpetas del usuario
     */
    async listar(): Promise<CarpetaNota[]> {
        const carpetas = await apiFetch<CarpetaRust[]>('/notes/folders');
        return (carpetas || []).map(mapearCarpeta);
    },

    /**
     * Crea una nueva carpeta
     */
    async crear(nombre: string): Promise<CarpetaNota> {
        const carpeta = await apiFetch<CarpetaRust>('/notes/folders', {
            method: 'POST',
            body: JSON.stringify({name: nombre})
        });
        return mapearCarpeta(carpeta);
    },

    /**
     * Renombra una carpeta
     */
    async renombrar(id: number, nombre: string): Promise<boolean> {
        await apiFetch(`/notes/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify({name: nombre})
        });
        return true;
    },

    /**
     * Elimina una carpeta (las notas se mueven a General)
     */
    async eliminar(id: number): Promise<boolean> {
        await apiFetch(`/notes/folders/${id}`, {method: 'DELETE'});
        return true;
    }
};

/* [253A-11] Service para API de Grupos de Facebook
 * Llamadas REST al backend WordPress para gestión de grupos.
 * Usa cookie auth (dashboard) por defecto. */

function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

const BASE = '/wp-json/glory/v1/grupos-fb';

export interface GrupoFb {
    id: number;
    fbGroupId: string;
    nombre: string;
    url: string;
    tipo: 'public' | 'private' | 'unknown';
    cantidadMiembros: string;
    imagenUrl: string;
    fuente: string;
    categoria: string | null;
    importancia: number;
    notas: string;
    oculto: boolean;
    ultimaPublicacion: string | null;
    fechaDeteccion: string;
    ultimaDeteccion: string;
    datosExtra: Record<string, unknown>;
}

export interface CategoriaGrupoFb {
    id: number;
    nombre: string;
    icono: string;
    color: string;
    orden: number;
}

export interface EstadisticasGruposFb {
    total: number;
    visibles: number;
    ocultos: number;
    publicadosHoy: number;
}

interface RespuestaApi<T> {
    success: boolean;
    data?: T;
    message?: string;
}

async function fetchApi<T>(url: string, opciones: RequestInit = {}): Promise<T> {
    const resp = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': obtenerNonce(),
            ...opciones.headers
        },
        ...opciones
    });

    if (!resp.ok) {
        throw new Error(`Error ${resp.status}: ${resp.statusText}`);
    }

    const json: RespuestaApi<T> = await resp.json();
    if (!json.success) {
        throw new Error(json.message || 'Error desconocido');
    }

    return json.data as T;
}

export const gruposFbService = {
    async listar(filtros?: {oculto?: number; categoria?: string; importancia?: number; busqueda?: string}): Promise<GrupoFb[]> {
        const params = new URLSearchParams();
        if (filtros) {
            Object.entries(filtros).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') {
                    params.set(k, String(v));
                }
            });
        }
        const query = params.toString();
        return fetchApi<GrupoFb[]>(`${BASE}${query ? '?' + query : ''}`);
    },

    async actualizar(id: number, datos: Partial<Pick<GrupoFb, 'categoria' | 'importancia' | 'oculto' | 'notas'>>): Promise<GrupoFb> {
        return fetchApi<GrupoFb>(`${BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
    },

    async eliminar(id: number): Promise<void> {
        await fetchApi<void>(`${BASE}/${id}`, {method: 'DELETE'});
    },

    /* [034A-2] Toggle publicado: retorna el nuevo estado */
    async marcarPublicado(id: number): Promise<{publicado: boolean; ultimaPublicacion: string | null}> {
        return fetchApi<{publicado: boolean; ultimaPublicacion: string | null}>(`${BASE}/${id}/publicar`, {method: 'POST'});
    },

    async estadisticas(): Promise<EstadisticasGruposFb> {
        return fetchApi<EstadisticasGruposFb>(`${BASE}/stats`);
    },

    async listarCategorias(): Promise<CategoriaGrupoFb[]> {
        return fetchApi<CategoriaGrupoFb[]>(`${BASE}/categorias`);
    },

    async guardarCategorias(categorias: Omit<CategoriaGrupoFb, 'id' | 'orden'>[]): Promise<CategoriaGrupoFb[]> {
        return fetchApi<CategoriaGrupoFb[]>(`${BASE}/categorias`, {
            method: 'POST',
            body: JSON.stringify({categorias})
        });
    },

    async obtenerToken(): Promise<{tieneToken?: boolean; token?: string; mensaje: string}> {
        return fetchApi<{tieneToken?: boolean; token?: string; mensaje: string}>(`${BASE}/token`);
    },

    async regenerarToken(): Promise<{token: string; mensaje: string}> {
        return fetchApi<{token: string; mensaje: string}>(`${BASE}/token/regenerar`, {method: 'POST'});
    }
};

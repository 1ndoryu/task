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

/* [034A-14] Entorno: vista filtrada con overrides por grupo */
export interface EntornoGrupoFb {
    id: number;
    nombre: string;
    icono: string;
    color: string;
    activo: boolean;
    aiPrompt: string | null;
    orden: number;
    createdAt: string;
}

/* [034A-14] Override de un grupo en un entorno */
export interface OverrideGrupoFb {
    categoria: string | null;
    importancia: number | null;
    oculto: number | null;
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
    async listar(filtros?: {oculto?: number; categoria?: string; importancia?: number; busqueda?: string; entorno_id?: number}): Promise<GrupoFb[]> {
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
    },

    /* [034A-14] Entornos CRUD */
    async listarEntornos(): Promise<EntornoGrupoFb[]> {
        return fetchApi<EntornoGrupoFb[]>(`${BASE}/entornos`);
    },

    async crearEntorno(datos: Omit<EntornoGrupoFb, 'id' | 'activo' | 'createdAt'>): Promise<EntornoGrupoFb> {
        return fetchApi<EntornoGrupoFb>(`${BASE}/entornos`, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    },

    async actualizarEntorno(id: number, datos: Partial<Omit<EntornoGrupoFb, 'id' | 'createdAt'>>): Promise<EntornoGrupoFb> {
        return fetchApi<EntornoGrupoFb>(`${BASE}/entornos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
    },

    async eliminarEntorno(id: number): Promise<void> {
        await fetchApi<void>(`${BASE}/entornos/${id}`, {method: 'DELETE'});
    },

    async activarEntorno(entornoId: number | null): Promise<EntornoGrupoFb | null> {
        return fetchApi<EntornoGrupoFb | null>(`${BASE}/entornos/activar`, {
            method: 'POST',
            body: JSON.stringify({entornoId})
        });
    },

    /* [034A-14] Overrides por entorno */
    async listarOverrides(entornoId: number): Promise<Record<string, OverrideGrupoFb>> {
        return fetchApi<Record<string, OverrideGrupoFb>>(`${BASE}/entornos/${entornoId}/overrides`);
    },

    async guardarOverride(entornoId: number, grupoId: number, datos: Partial<OverrideGrupoFb>): Promise<void> {
        await fetchApi<void>(`${BASE}/entornos/${entornoId}/overrides`, {
            method: 'POST',
            body: JSON.stringify({grupoId, ...datos})
        });
    },

    /* [034A-17] Config usuario */
    async obtenerConfig(claves: string[]): Promise<Record<string, string>> {
        return fetchApi<Record<string, string>>(`${BASE}/config?claves=${claves.join(',')}`);
    },

    async guardarConfig(datos: Record<string, string>): Promise<{guardadas: number}> {
        return fetchApi<{guardadas: number}>(`${BASE}/config`, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    }
};

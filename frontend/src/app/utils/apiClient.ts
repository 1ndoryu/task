/* [18-08-2026] Cliente API comun para el front original contra el backend Rust.
 * Reemplaza el contrato WordPress (X-WP-Nonce + /wp-json/glory/v1) por sesion
 * por cookie HttpOnly + X-CSRF-Token (cookie csrf_token, no HttpOnly) + /api.
 * El front es el unico cliente; los errores del backend llegan como
 * { error, message }. Las peticiones sin cuerpo GET/HEAD no llevan CSRF. */

export function obtenerTokenCsrf(): string {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export interface OpcionesApi extends Omit<RequestInit, 'body' | 'headers'> {
    body?: unknown;
    headers?: Record<string, string>;
}

export class ErrorApi extends Error {
    readonly status: number;
    readonly tipo: string;

    constructor(status: number, message: string, tipo = 'error') {
        super(message);
        this.name = 'ErrorApi';
        this.status = status;
        this.tipo = tipo;
    }
}

export async function apiFetch<T = unknown>(
    path: string,
    opciones: OpcionesApi = {},
): Promise<T> {
    const { body, headers, ...rest } = opciones;
    const metodo = (rest.method || 'GET').toUpperCase();
    const esMutacion = metodo !== 'GET' && metodo !== 'HEAD';
    const finalHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
    };
    if (esMutacion) {
        finalHeaders['X-CSRF-Token'] = obtenerTokenCsrf();
    }

    /* Si el caller ya serializo el body (string), no volver a serializarlo. */
    const cuerpo = typeof body === 'string' ? body : body !== undefined ? JSON.stringify(body) : undefined;

    const response = await fetch(`/api${path}`, {
        ...rest,
        method: metodo,
        credentials: 'include',
        headers: finalHeaders,
        body: cuerpo,
    });

    if (!response.ok) {
        let mensaje = `Error del servidor: ${response.status}`;
        let tipo = 'error';
        try {
            const cuerpo = (await response.json()) as { message?: string; error?: string };
            if (cuerpo?.message) mensaje = cuerpo.message;
            if (cuerpo?.error) tipo = cuerpo.error;
        } catch {
            /* Sin cuerpo JSON (204, 502, etc.) */
        }
        throw new ErrorApi(response.status, mensaje, tipo);
    }

    if (response.status === 204) {
        return undefined as T;
    }
    return (await response.json()) as T;
}

/* Cliente HTTP del front nuevo.
 * Separado de la vista: aquí no hay React ni DOM de render, solo `fetch`
 * contra `/api` con la sesión por cookie HttpOnly y el CSRF que el backend
 * exige en las mutaciones (`X-CSRF-Token`, espejo de la cookie `csrf_token`).
 * Origen: copiado de `frontend-legacy/src/app/utils/apiClient.ts`. */

export function obtenerTokenCsrf(): string {
  const coincidencia = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return coincidencia ? decodeURIComponent(coincidencia[1]) : '';
}

export class ErrorApi extends Error {
  readonly estado: number;

  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

export async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const metodo = (opciones.method ?? 'GET').toUpperCase();
  const llevaCuerpo = metodo !== 'GET' && metodo !== 'HEAD';
  const cabeceras: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opciones.headers as Record<string, string> | undefined),
  };
  if (llevaCuerpo) cabeceras['X-CSRF-Token'] = obtenerTokenCsrf();

  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    method: metodo,
    credentials: 'include',
    headers: cabeceras,
  });

  if (!respuesta.ok) {
    // El backend responde `{error, message}`; sin cuerpo (204/502) se usa el estado.
    let mensaje = `Error del servidor: ${respuesta.status}`;
    try {
      const cuerpo = (await respuesta.json()) as { message?: string };
      if (cuerpo?.message) mensaje = cuerpo.message;
    } catch {
      /* Sin JSON: se conserva el mensaje por estado. */
    }
    throw new ErrorApi(respuesta.status, mensaje);
  }

  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

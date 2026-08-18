import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  withCredentials: true,
});

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

/* El token CSRF no es una credencial: se replica en el header para mutaciones. */
instance.interceptors.request.use((config) => {
  const csrf = readCookie('csrf_token');
  if (csrf && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = decodeURIComponent(csrf);
  }
  return config;
});

/**
 * Mutator para Orval — adapta RequestInit a axios y conserva la forma
 * response/data/status/headers que declara el cliente generado.
 */
export const customInstance = <T>(url: string, config: RequestInit = {}): Promise<T> => {
  const source = axios.CancelToken.source();
  const { body, headers, method, signal } = config;
  const promise = instance.request({
    url,
    method: method as AxiosRequestConfig['method'],
    headers: headers as AxiosRequestConfig['headers'],
    data: body ?? undefined,
    signal: signal ?? undefined,
    cancelToken: source.token,
  }).then((response) => ({
    data: response.data,
    status: response.status,
    headers: new Headers(response.headers as unknown as Record<string, string>),
  }));

  // @ts-expect-error -- propiedad cancel para React Query
  promise.cancel = () => source.cancel('Query cancelado');

  return promise as Promise<T>;
};

export default instance;

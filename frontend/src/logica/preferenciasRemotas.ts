/* Respaldo de la vista en el servidor: las preferencias, el orden de las cajas
 * y los grupos salen de este equipo y vuelven solos.
 *
 * Vivían solo en el `localStorage` del webview, y el webview se vacía con una
 * reinstalación, un perfil nuevo o un fallo del disco: la configuración se
 * perdía sin que nada la hubiera cambiado. El backend ya tenía el hueco
 * (`config->'preferencias'`, un blob por clave `{valor, ts}` con merge LWW por
 * `ts`), que es como el front original guardaba lo suyo.
 *
 * Se sube cada bloque con la marca de tiempo de su última escritura: así dos
 * escrituras seguidas no se pisan y el servidor se queda con la más nueva. Al
 * cargar, lo que está en `localStorage` manda si es más nuevo; si el equipo se
 * quedó sin él, el servidor lo devuelve. */

import { pedir } from './cliente';
import { CLAVES_VISTA } from './orden';

/** Dónde vive cada bloque en el `localStorage` de este equipo. */
const CLAVE_LOCAL = CLAVES_VISTA;

/** Las tres cosas que se respaldan, con su nombre en el blob del servidor. */
export const CLAVES_RESPALDO = {
  preferencias: 'tareas:vista',
  orden: 'tareas:orden-pestanas',
  grupos: 'tareas:grupos',
} as const;

export type ClaveRespaldo = keyof typeof CLAVES_RESPALDO;

/** Una entrada del blob: el valor y cuándo se escribió. */
interface Entrada<T> {
  valor: T;
  ts: number;
}

/** Sale de `localStorage` o de la memoria del proceso. Un navegador sin
 *  almacenamiento (o lleno) no debe romper la vista: se sigue sin recordar. */
const almacen = {
  leer(clave: string): string | null {
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  },
  escribir(clave: string, valor: string): void {
    try {
      localStorage.setItem(clave, valor);
    } catch {
      /* Sin sitio o sin permiso: lo guardado en el servidor sigue valiendo. */
    }
  },
};

/** Clave interna del `localStorage` donde se anota el `ts` de cada bloque. */
const CLAVE_MARCAS = 'tareas-nuevo:v1:marcas-respaldo';

/** Marca de tiempo de la última escritura de cada bloque. Vive aparte para no
 *  cambiar la forma de lo que ya está guardado. */
function leerMarcas(): Record<string, number> {
  try {
    const crudo = JSON.parse(almacen.leer(CLAVE_MARCAS) ?? '{}') as unknown;
    if (typeof crudo !== 'object' || crudo === null) return {};
    const marcas: Record<string, number> = {};
    for (const [clave, ts] of Object.entries(crudo as Record<string, unknown>)) {
      if (typeof ts === 'number' && Number.isFinite(ts)) marcas[clave] = ts;
    }
    return marcas;
  } catch {
    return {};
  }
}

/** Anota que un bloque cambió ahora y devuelve la marca. */
export function marcarCambio(clave: ClaveRespaldo): number {
  const marcas = leerMarcas();
  // Dos cambios en el mismo milisegundo no deben empatar: el LWW del servidor
  // desempata por `ts`, y un empate deja el valor que llegue primero.
  const ts = Math.max(Date.now(), (marcas[clave] ?? 0) + 1);
  marcas[clave] = ts;
  almacen.escribir(CLAVE_MARCAS, JSON.stringify(marcas));
  return ts;
}

/** Lo guardado en el servidor, por bloque, con la marca con la que se subió.
 *  `null` si la llamada falla: el respaldo no puede impedir que la vista abra. */
export async function leerRespaldo(): Promise<Partial<Record<ClaveRespaldo, Entrada<unknown>>> | null> {
  try {
    const respuesta = await pedir<{ data?: { configuracion?: { preferencias?: Record<string, unknown> } } }>(
      '/dashboard',
    );
    const blob = respuesta.data?.configuracion?.preferencias ?? {};
    const salida: Partial<Record<ClaveRespaldo, Entrada<unknown>>> = {};
    for (const clave of Object.keys(CLAVES_RESPALDO) as ClaveRespaldo[]) {
      const entrada = blob[CLAVES_RESPALDO[clave]] as Entrada<unknown> | undefined;
      if (entrada && 'valor' in entrada) {
        salida[clave] = { valor: entrada.valor, ts: typeof entrada.ts === 'number' ? entrada.ts : 0 };
      }
    }
    return salida;
  } catch {
    return null;
  }
}

/** Sube un bloque con su marca. Un fallo se anota en la consola y nada más: la
 *  vista ya se guardó en el equipo, y el siguiente cambio reintenta el bloque
 *  entero con la marca nueva. */
export function subirRespaldo(clave: ClaveRespaldo, valor: unknown, ts: number): void {
  const cuerpo = { preferencias: { [CLAVES_RESPALDO[clave]]: { valor, ts } } };
  void pedir<void>('/dashboard/settings', { method: 'PUT', body: JSON.stringify(cuerpo) }).catch((error: unknown) => {
    console.warn(`No se pudo respaldar «${clave}» en el servidor`, error);
  });
}

/** Un bloque tal como está ahora en el equipo, ya subido. Lee el
 *  `localStorage` en vez de recibir el valor para que un solo sitio decida qué
 *  es «el estado actual» de esa clave. */
export function respaldar(clave: ClaveRespaldo): void {
  const crudo = almacen.leer(CLAVE_LOCAL[clave]);
  if (crudo === null) return;
  let valor: unknown;
  try {
    valor = JSON.parse(crudo) as unknown;
  } catch {
    return;
  }
  subirRespaldo(clave, valor, marcarCambio(clave));
}

/** Devuelve al equipo lo que el servidor recuerde de un bloque que aquí ya no
 *  está, o que allí es más nuevo. Escribe en el `localStorage` y dice qué
 *  bloques cambiaron para que la vista se rehaga con ellos. */
export async function restaurar(): Promise<ClaveRespaldo[]> {
  const remoto = await leerRespaldo();
  if (!remoto) return [];
  const marcas = leerMarcas();
  const restaurados: ClaveRespaldo[] = [];
  for (const clave of Object.keys(CLAVES_RESPALDO) as ClaveRespaldo[]) {
    const entrada = remoto[clave];
    if (!entrada) continue;
    // El equipo manda mientras su copia sea igual de nueva: solo se repone lo
    // que se perdió o lo que allí es más reciente (otra máquina, otra sesión).
    if (entrada.ts <= (marcas[clave] ?? 0)) continue;
    almacen.escribir(CLAVE_LOCAL[clave], JSON.stringify(entrada.valor));
    marcas[clave] = entrada.ts;
    restaurados.push(clave);
  }
  if (restaurados.length > 0) almacen.escribir(CLAVE_MARCAS, JSON.stringify(marcas));
  return restaurados;
}

/** Sube los tres bloques tal como están en el equipo. Se usa una vez al abrir,
 *  para poner al día un servidor vacío sin esperar a que se toque un ajuste. */
export function subirTodo(bloques: Partial<Record<ClaveRespaldo, unknown>>): void {
  const marcas = leerMarcas();
  const preferencias: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(bloques) as [ClaveRespaldo, unknown][]) {
    if (valor === undefined) continue;
    preferencias[CLAVES_RESPALDO[clave]] = { valor, ts: marcas[clave] ?? Date.now() };
  }
  if (Object.keys(preferencias).length === 0) return;
  void pedir<void>('/dashboard/settings', { method: 'PUT', body: JSON.stringify({ preferencias }) }).catch(
    (error: unknown) => console.warn('No se pudo respaldar la vista en el servidor', error),
  );
}

/* Cola de escrituras de una fila. Cada cambio se manda cuando el anterior ya
 * tiene respuesta, con la versión (`updatedAt`) que dejó esa respuesta: así dos
 * clics seguidos no chocan contra su propia escritura. Si el servidor responde
 * 409, la fila se relee y el cambio se reaplica sobre la copia nueva, nunca
 * sobre la copia vieja que lo originó. */
import { ErrorApi } from '../logica/cliente';
import type { RespuestaEscritura } from '../logica/tipos';

/** Lo que la cola necesita de una fila: su id y su versión. */
export interface Versionada {
  id: number;
  updatedAt?: string;
}

/** Cambio sobre la copia; devuelve la copia nueva y no toca la original. */
export type Cambio<T> = (dato: T) => T;

export interface Cola<T> {
  /** Última copia confirmada por el servidor, o la leída al empezar. */
  base?: T;
  /** Cambios sin respuesta todavía, en orden. */
  cambios: Cambio<T>[];
  /** Una cola cancelada (fila borrada) deja de mandar y de pintar. */
  cancelada?: boolean;
  /** Trabajo en curso: mientras exista, los nuevos cambios se suman a él. */
  trabajo?: Promise<void>;
}

export interface Adaptador<T extends Versionada> {
  enviar: (dato: T) => Promise<RespuestaEscritura>;
  /** Copia fresca de la fila en el servidor; `undefined` si ya no existe. */
  releer: (id: number) => Promise<T | undefined>;
  /** Pinta la fila (`undefined` la quita) y dice si queda pendiente de enviar. */
  mostrar: (id: number, dato: T | undefined, pendiente: boolean) => void;
  avisar: (texto: string) => void;
}

/** Rechazos por versión que se toleran antes de descartar el cambio. */
const REINTENTOS_409 = 2;

const esConflicto = (error: unknown): boolean => error instanceof ErrorApi && error.estado === 409;

/** La cola de una fila; si la anterior se canceló, empieza una nueva. */
export function colaDe<T>(mapa: Map<number, Cola<T>>, id: number): Cola<T> {
  const existente = mapa.get(id);
  if (existente && !existente.cancelada) return existente;
  const nueva: Cola<T> = { cambios: [] };
  mapa.set(id, nueva);
  return nueva;
}

/** Corta la cola de una fila borrada: lo que estuviera pendiente ya no se manda. */
export function cancelarCola<T>(mapa: Map<number, Cola<T>>, id: number): void {
  const cola = mapa.get(id);
  if (!cola) return;
  cola.cancelada = true;
  cola.cambios = [];
  mapa.delete(id);
}

/** Añade el cambio a la cola y espera a que la cola de la fila quede vacía. */
export function encolarCambio<T extends Versionada>(
  cola: Cola<T>,
  id: number,
  actual: T,
  cambio: Cambio<T>,
  ad: Adaptador<T>,
): Promise<void> {
  cola.base ??= actual;
  cola.cambios.push(cambio);
  pintar(cola, id, ad);
  cola.trabajo ??= drenar(cola, id, ad).finally(() => {
    cola.trabajo = undefined;
  });
  return cola.trabajo;
}

/** Lo que se ve: la última copia confirmada con los cambios aún sin respuesta. */
function pintar<T extends Versionada>(cola: Cola<T>, id: number, ad: Adaptador<T>): void {
  if (cola.cancelada || !cola.base) return;
  const vista = cola.cambios.reduce((dato, cambio) => cambio(dato), cola.base);
  ad.mostrar(id, vista, cola.cambios.length > 0);
}

async function drenar<T extends Versionada>(cola: Cola<T>, id: number, ad: Adaptador<T>): Promise<void> {
  while (!cola.cancelada && cola.base && cola.cambios.length > 0) {
    const cambio = cola.cambios[0];
    let rechazos = 0;
    for (;;) {
      const enviado = cambio(cola.base);
      try {
        const { updatedAt } = await ad.enviar(enviado);
        cola.base = { ...enviado, updatedAt: updatedAt ?? enviado.updatedAt };
        cola.cambios.shift();
        break;
      } catch (error) {
        // Sin respuesta del servidor el cambio se queda pendiente; el siguiente
        // intento de escribir o la recarga lo reenvía.
        if (!esConflicto(error)) return;
        rechazos++;
        let fresca: T | undefined;
        try {
          fresca = await ad.releer(id);
        } catch {
          return; // Sin red para releer: queda pendiente, como un fallo de envío.
        }
        if (cola.cancelada) return;
        if (!fresca) {
          // Borrada en otro sitio: lo pendiente de esta fila ya no tiene destino.
          cola.cancelada = true;
          cola.cambios = [];
          ad.mostrar(id, undefined, false);
          ad.avisar('Esa fila ya no existe: se quitó el cambio.');
          return;
        }
        cola.base = fresca;
        if (rechazos > REINTENTOS_409) {
          cola.cambios.shift();
          ad.avisar('Un cambio no se guardó: la fila cambió en otro sitio.');
          break;
        }
        pintar(cola, id, ad);
      }
    }
    pintar(cola, id, ad);
  }
}

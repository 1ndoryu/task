/* Fallos no fatales (un respaldo que no sube, por ejemplo). La app sigue y el
 * siguiente cambio vuelve a intentarlo; aquí quedan anotados sin consola de
 * producción. Se acotan para que no crezcan sin fin. */
const LIMITE = 50;

export interface Fallo {
  cuando: string;
  donde: string;
  detalle: string;
}

const fallos: Fallo[] = [];

/** Anota un fallo con dónde pasó; el más viejo se descarta al pasar el límite. */
export function anotarFallo(donde: string, error: unknown): void {
  fallos.push({ cuando: new Date().toISOString(), donde, detalle: String(error) });
  if (fallos.length > LIMITE) fallos.shift();
}

/** Copia de los fallos anotados, del más viejo al más nuevo. */
export const fallosAnotados = (): readonly Fallo[] => [...fallos];

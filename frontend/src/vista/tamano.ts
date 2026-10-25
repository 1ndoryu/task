/* Tamaño de una caja: qué es el tamaño de fábrica, cómo se lleva a píxeles y
 * cómo se escribe en la caja. El de fábrica no se guarda ni se duplica como
 * número: es un token de la hoja (`--ancho`, `--alto-caja`, `--alto-cajas`), y
 * aquí solo se traduce a píxeles para el imán y para el tope del arrastre. */
import type { CSSProperties } from 'react';
import { ALTO_CAJA_MINIMO, ANCHO_CAJA_MINIMO, type TamanoCaja } from '../logica/preferencias';

/** Imán al soltar cerca del tamaño de fábrica: por debajo de esto, la caja
 *  encaja exacta en el tamaño por defecto. Es la «asistencia» para volver. */
export const IMAN_DEFECTO = 24;

/** Un tamaño de la hoja (`32rem`, `80dvh`, `400px`) llevado a píxeles de la
 *  ventana actual. Se recalcula en cada gesto: `dvh` depende del alto visible. */
export function aPixeles(valor: string): number {
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) return 0;
  if (valor.endsWith('rem')) return numero * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  if (valor.endsWith('dvh') || valor.endsWith('vh')) return (numero * window.innerHeight) / 100;
  return numero;
}

/** Los dos lados de fábrica de una caja, en píxeles de ahora. En el carril el
 *  alto de referencia es el suyo (las cajas del carril llevan algo más de aire
 *  arriba y abajo que la caja única). */
export function tamanoDefecto(caja: HTMLElement): { ancho: number; alto: number } {
  const estilo = getComputedStyle(caja);
  const enCarril = Boolean(caja.closest('.carril'));
  return {
    ancho: aPixeles(estilo.getPropertyValue('--ancho')),
    alto: aPixeles(estilo.getPropertyValue(enCarril ? '--alto-cajas' : '--alto-caja')),
  };
}

/** Deja un tamaño dentro de lo que se puede pedir: el alto nunca pasa del de
 *  fábrica y ninguno baja del suelo. `undefined` es «de fábrica». */
export function acotarTamano(tamano: TamanoCaja, defecto: { ancho: number; alto: number }): TamanoCaja {
  const redondo = (valor: number | undefined, minimo: number, maximo: number) =>
    valor === undefined ? undefined : Math.min(maximo, Math.max(minimo, Math.round(valor)));
  const acotado: TamanoCaja = {
    ancho: redondo(tamano.ancho, ANCHO_CAJA_MINIMO, Math.max(ANCHO_CAJA_MINIMO, defecto.ancho)),
    alto: redondo(tamano.alto, ALTO_CAJA_MINIMO, Math.max(ALTO_CAJA_MINIMO, defecto.alto)),
  };
  // Un tamaño igual al de fábrica es no tener tamaño: así «volver al defecto»
  // no deja una entrada guardada que diga lo mismo con otro número.
  if (acotado.ancho === Math.round(defecto.ancho)) delete acotado.ancho;
  if (acotado.alto === Math.round(defecto.alto)) delete acotado.alto;
  return acotado;
}

/* El ancho solo tiene suelo y el de la ventana; el alto tiene además el tope de
 * fábrica. Los dos viajan como variables propias (`--*-usuario`) para no pisar
 * los tokens de la hoja, que siguen siendo el valor de fábrica. */
export function variablesDeTamano(tamano?: TamanoCaja): CSSProperties {
  return {
    '--ancho-usuario': tamano?.ancho !== undefined ? `${tamano.ancho}px` : undefined,
    '--alto-caja-usuario': tamano?.alto !== undefined ? `${tamano.alto}px` : undefined,
  } as CSSProperties;
}

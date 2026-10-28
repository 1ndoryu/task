/* Qué filas del servidor sustituyen a las pintadas al relecturar. Gana la versión
 * más nueva; una fila con escritura en curso o cambio sin confirmar se queda como
 * está, porque lo que esta pestaña envía manda sobre lo que el servidor devuelva
 * en ese momento. */
export interface Versionada {
  id: number;
  updatedAt?: string;
}

/** Verdadero si la versión del servidor es posterior a la local; sin fechas válidas no cuenta. */
export function esMasNueva(servidor: Versionada, local: Versionada): boolean {
  // `Date.parse` devuelve NaN sin fecha, y NaN > x es falso: un alta local no se pisa.
  return Date.parse(servidor.updatedAt ?? '') > Date.parse(local.updatedAt ?? '');
}

/** Las filas locales con las versiones nuevas del servidor. Sin cambios devuelve la misma lista. */
export function sustituirFilas<T extends Versionada>(locales: T[], servidor: T[], enCurso: (id: number) => boolean): T[] {
  const porId = new Map(servidor.map((fila) => [fila.id, fila]));
  const nuevas = locales.map((local) => {
    const remota = porId.get(local.id);
    if (!remota || enCurso(local.id) || !esMasNueva(remota, local)) return local;
    return remota;
  });
  return nuevas.some((fila, i) => fila !== locales[i]) ? nuevas : locales;
}

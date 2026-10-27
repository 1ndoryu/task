/* Orden de la caja «Completados»: uno solo, por el día en que se hizo cada cosa. */

/** Lo último hecho, primero. Un día vacío (tarea vieja sin fecha) cae al final.
 *  Con `sort` estable, lo hecho el mismo día conserva su orden de llegada. */
export const masRecienteHecho = (a: { hecho: string }, b: { hecho: string }): number => b.hecho.localeCompare(a.hecho);

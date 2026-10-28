/* Tipos y ayudas puras de las notas, compartidos por el hook `usarNotas` y las
 * vistas. Viven aparte para que `usarNotas.ts` no pase del límite de líneas de
 * componente (Sentinel `limite-lineas`). */

/** Lo que la caja «Diario» necesita: leer y escribir por día y capítulo. */
export interface AccesoDiario {
  /** Capítulos de un día, en orden. Siempre incluye el 1, aunque esté vacío. */
  capitulos: (fecha: string) => number[];
  /** Días con algún capítulo escrito; el calendario del diario los marca. */
  diasEscritos: () => ReadonlySet<string>;
  /** Texto de un capítulo; vacío si todavía no se ha escrito nada. */
  textoDe: (fecha: string, capitulo: number) => string;
  escribir: (fecha: string, capitulo: number, contenido: string) => void;
  /** Fuerza el guardado pendiente de un capítulo (al cerrar el campo). */
  confirmar: (fecha: string, capitulo: number) => void;
  /** Añade un capítulo al día y devuelve su número. */
  nuevo: (fecha: string) => number;
  /** Borra un capítulo. El 1 no desaparece: queda vacío, como un día sin escribir. */
  borrar: (fecha: string, capitulo: number) => void;
}

/** Clave de un capítulo en los mapas del diario: día y número juntos. */
export const claveCapitulo = (fecha: string, capitulo: number) => `${fecha}#${capitulo}`;

/** Capítulos de un día en orden, con el 1 siempre presente. */
export const ordenados = (lista: number[]) => [...new Set([1, ...lista])].sort((a, b) => a - b);

export interface Notas {
  /** Entradas del diario por día. No son cajas: no entran en `lista`. */
  diario: AccesoDiario;
  /** Resúmenes en orden de carga: id y título, lo que pinta el carril. */
  lista: { id: string; titulo: string }[];
  /** Cuerpo de cada nota, por id; solo las que se han abierto. */
  cuerpos: Record<string, string>;
  cargando: boolean;
  /** La última escritura falló: la caja lo dice sin perder lo escrito. */
  fallo: string | null;
  /** Escribe el cuerpo en memoria y programa el guardado. */
  escribir: (id: string, contenido: string) => void;
  /** Fuerza el guardado pendiente de una nota (al cerrar el campo). */
  confirmar: (id: string) => void;
  renombrar: (id: string, titulo: string) => void;
  /** Crea una nota vacía y devuelve su id para centrar la caja. */
  crear: () => Promise<string | null>;
  borrar: (id: string) => void;
  /** La saca de las cajas sin borrarla: aparece en el panel de archivados. */
  archivar: (id: string) => void;
  /** Archivadas, para su panel: id y título, sin cuerpo. */
  archivadas: { id: string; titulo: string }[];
  /** La devuelve al final de las cajas y la quita de archivadas. */
  recuperar: (id: string) => void;
}

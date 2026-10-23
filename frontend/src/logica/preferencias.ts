/* Preferencias de la vista (orden, pestaña y ajustes de lectura), recordadas en
 * `localStorage`. Se guardan aparte de los datos: aquí no hay contratos del
 * backend, solo cómo mira la usuaria su lista. */

import type { NivelPrioridad } from './importancia';
import { MODOS_ORDEN } from './orden';

const CLAVE = 'tareas-nuevo:v1:vista';
// Los valores válidos salen de su fuente única: si se añade un modo, aquí entra.
const MODOS = MODOS_ORDEN.map((m) => m.id as string);
// Valores de `grupo` de la versión anterior (modos de agrupación, no grupos).
const MODOS_GRUPO_VIEJOS = ['ninguno', 'proyecto', 'prioridad', 'urgencia'];

/** Tamaño del texto de las filas. */
export type Fuente = 'pequena' | 'normal' | 'grande';
/** Aire vertical de cada fila. */
export type Altura = 'compacta' | 'normal' | 'amplia';
/** Con privacidad activa: se aclara solo la fila del ratón o toda la lista. */
export type AlcancePrivacidad = 'una' | 'todas';
/** Luz de la vista: papel claro o tinta sobre negro cálido. */
export type Tema = 'claro' | 'oscuro';

export interface Preferencias {
  orden: string;
  /** Orden propio de cada caja, por id de pestaña. La que no está aquí usa
   *  `orden`: así cambiar el orden general sigue moviendo las cajas nuevas. */
  ordenes: Record<string, string>;
  /** Pestaña de grupo activa: `''` es «Tareas» (sin grupo). */
  grupo: string;
  /** Esconder de la lista los hábitos ya cumplidos que tocaban hoy. */
  ocultarHabitos: boolean;
  /** Modo privacidad: el texto de la lista va difuminado hasta pasar el ratón. */
  privacidad: boolean;
  privacidadAlcance: AlcancePrivacidad;
  fuente: Fuente;
  /** Talla del texto de las notas. Va aparte de la de las filas: una nota se
   *  lee de corrido y pide otro tamaño que una lista de líneas cortas. */
  fuenteNota: Fuente;
  altura: Altura;
  /** Filete entre filas. */
  separador: boolean;
  /** Cada grupo en su propia caja, en fila y con movimiento lateral. */
  separarGrupos: boolean;
  /** La caja «Tareas» se parte en dos: las tareas por un lado y los hábitos
   *  por otro. Solo afecta al panel de sistema; los grupos ya son suyos. */
  separarHabitos: boolean;
  /** Modo oscuro; «claro» es como se pinta la lista por defecto. */
  tema: Tema;
  /** Un color por nivel de importancia, del más frío al rojo. */
  colores: ColoresNivel;
}

export type ColoresNivel = Record<NivelPrioridad, string>;

/* Escala pastel armónica: cinco tonos del mismo aire, del más apagado (muy
 * baja) al rojo (muy alta). Se eligieron con el mismo croma y saturación para
 * que ninguno grite más que el rojo. */
export const COLORES_NIVEL: ColoresNivel = {
  muy_baja: '#dbe6f0',
  baja: '#dcebdc',
  media: '#f6eecb',
  alta: '#f6d9bd',
  muy_alta: '#e8a09b',
};

/** Un `#rgb`/`#rrggbb` válido; cualquier otra cosa cae al color por defecto. */
const COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Colores guardados, nivel a nivel: uno roto no arrastra a los demás. */
function leerColores(valor: unknown): ColoresNivel {
  const guardado = (typeof valor === 'object' && valor !== null ? valor : {}) as Record<string, unknown>;
  const colores = { ...COLORES_NIVEL };
  for (const nivel of Object.keys(COLORES_NIVEL) as NivelPrioridad[]) {
    const color = guardado[nivel];
    if (typeof color === 'string' && COLOR.test(color)) colores[nivel] = color.toLowerCase();
  }
  return colores;
}

/** Órdenes por caja guardados: solo las claves y valores que siguen siendo
 *  modos válidos. Una caja borrada deja su entrada, y no pasa nada: su id no
 *  vuelve a pintarse; se descarta al leer para no arrastrar basura. */
function leerOrdenes(valor: unknown): Record<string, string> {
  const guardado = (typeof valor === 'object' && valor !== null ? valor : {}) as Record<string, unknown>;
  const ordenes: Record<string, string> = {};
  for (const [id, modo] of Object.entries(guardado)) {
    if (id && typeof modo === 'string' && MODOS.includes(modo)) ordenes[id] = modo;
  }
  return ordenes;
}

const POR_DEFECTO: Preferencias = {
  orden: 'inteligente',
  ordenes: {},
  grupo: '',
  ocultarHabitos: true,
  privacidad: false,
  privacidadAlcance: 'una',
  fuente: 'normal',
  fuenteNota: 'normal',
  altura: 'normal',
  separador: true,
  separarGrupos: false,
  separarHabitos: false,
  tema: 'claro',
  colores: { ...COLORES_NIVEL },
};

export function leerPreferencias(): Preferencias {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return { ...POR_DEFECTO };
    const guardado = JSON.parse(crudo) as Record<string, unknown>;
    // Se lee clave a clave: así las versiones viejas (`ordenTareas`,
    // `ordenHabitos`) se migran sin que vuelvan a guardarse, y un valor de tipo
    // equivocado no entra en la vista.
    const texto = (clave: keyof Preferencias, valida: readonly string[]) =>
      typeof guardado[clave] === 'string' && valida.includes(guardado[clave] as string)
        ? (guardado[clave] as string)
        : undefined;
    const ordenViejo = typeof guardado.ordenTareas === 'string' ? guardado.ordenTareas : undefined;
    const orden =
      texto('orden', MODOS) ?? (ordenViejo && MODOS.includes(ordenViejo) ? ordenViejo : POR_DEFECTO.orden);
    const fuente = texto('fuente', ['pequena', 'normal', 'grande']);
    const fuenteNota = texto('fuenteNota', ['pequena', 'normal', 'grande']);
    const altura = texto('altura', ['compacta', 'normal', 'amplia']);
    const tema = texto('tema', ['claro', 'oscuro']);
    return {
      ...POR_DEFECTO,
      orden,
      ordenes: leerOrdenes(guardado.ordenes),
      // Hubo una versión en la que `grupo` era un modo de agrupación
      // (`proyecto`, `prioridad`…); ahora es el nombre de la pestaña, así que
      // esos valores viejos vuelven a «Tareas» en vez de buscar un grupo falso.
      grupo:
        typeof guardado.grupo === 'string' && !MODOS_GRUPO_VIEJOS.includes(guardado.grupo)
          ? guardado.grupo.trim()
          : POR_DEFECTO.grupo,
      // El filtro por proyecto de la barra desapareció: sus valores guardados
      // se quedan sin leer y la lista enseña todo.
      ocultarHabitos:
        typeof guardado.ocultarHabitos === 'boolean' ? guardado.ocultarHabitos : POR_DEFECTO.ocultarHabitos,
      privacidad: typeof guardado.privacidad === 'boolean' ? guardado.privacidad : POR_DEFECTO.privacidad,
      privacidadAlcance: texto('privacidadAlcance', ['una', 'todas']) as AlcancePrivacidad ?? POR_DEFECTO.privacidadAlcance,
      fuente: (fuente as Fuente) ?? POR_DEFECTO.fuente,
      fuenteNota: (fuenteNota as Fuente) ?? POR_DEFECTO.fuenteNota,
      altura: (altura as Altura) ?? POR_DEFECTO.altura,
      separador: typeof guardado.separador === 'boolean' ? guardado.separador : POR_DEFECTO.separador,
      separarGrupos:
        typeof guardado.separarGrupos === 'boolean' ? guardado.separarGrupos : POR_DEFECTO.separarGrupos,
      separarHabitos:
        typeof guardado.separarHabitos === 'boolean' ? guardado.separarHabitos : POR_DEFECTO.separarHabitos,
      tema: (tema as Tema) ?? POR_DEFECTO.tema,
      colores: leerColores(guardado.colores),
    };
  } catch {
    return { ...POR_DEFECTO };
  }
}

export function guardarPreferencias(cambios: Partial<Preferencias>): void {
  const actuales = leerPreferencias();
  localStorage.setItem(CLAVE, JSON.stringify({ ...actuales, ...cambios }));
}

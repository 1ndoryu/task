/* Preferencias de la vista (orden, pestaña y ajustes de lectura), recordadas en
 * `localStorage`. Se guardan aparte de los datos: aquí no hay contratos del
 * backend, solo cómo mira la usuaria su lista. */

import type { NivelPrioridad } from './importancia';
import { CLAVES_VISTA, MODOS_ORDEN } from './orden';
import { respaldar } from './preferenciasRemotas';

const CLAVE = CLAVES_VISTA.preferencias;
// Los valores válidos salen de su fuente única: si se añade un modo, aquí entra.
const MODOS = MODOS_ORDEN.map((m) => m.id as string);
// Valores de `grupo` de la versión anterior (modos de agrupación, no grupos).
const MODOS_GRUPO_VIEJOS = ['ninguno', 'proyecto', 'prioridad', 'urgencia'];

/** Talla del texto, en píxeles. Se elige con un número: la escala cerrada de
 *  antes (pequeña/normal/grande) no dejaba afinar. */
export const FUENTE_MINIMA = 10;
export const FUENTE_MAXIMA = 22;
export const FUENTE_POR_DEFECTO = 13;
/** La talla de una nota va aparte de la de las filas y admite algo más. */
export const FUENTE_NOTA_MINIMA = 10;
export const FUENTE_NOTA_MAXIMA = 24;
export const FUENTE_NOTA_POR_DEFECTO = 14;

/** Tamaño propio de una caja, en píxeles. La dimensión que falte sigue el
 *  tamaño de fábrica, que además es el tope del alto.
 *  `crecido` marca el ancho que se pasó del de fábrica: por debajo de él, la
 *  caja recupera el aire de los extremos del carril, que solo hace falta para
 *  que la primera y la última puedan centrarse. */
export interface TamanoCaja {
  ancho?: number;
  alto?: number;
  crecido?: boolean;
}

/** Suelo de una caja redimensionada: por debajo no cabe ni la cabecera. El
 *  tope del alto no está aquí: es el tamaño de fábrica, y lo impone la hoja. */
export const ANCHO_CAJA_MINIMO = 288;
export const ALTO_CAJA_MINIMO = 224;
/** Tope de lectura para no arrastrar valores absurdos guardados a mano. */
const TAMANO_MAXIMO = 4000;

/** Aire vertical de cada fila. */
export type Altura = 'compacta' | 'normal' | 'amplia';
/** Aire entre líneas de una nota: un multiplicador de su talla, no una medida fija. */
export type Interlineado = 'ajustado' | 'normal' | 'amplio';
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
  /** Con privacidad: la primera fila de cada caja se lee siempre, sin ratón. */
  primeraVisible: boolean;
  /** Filas con sus subtareas o subhábitos plegados, por clave `panel:fila`.
   *  Es estado de la vista, pero también un ajuste: se recuerda entre sesiones. */
  plegadas: string[];
  /** Pintar la caja «Aplazado». Apagada, los aplazados existen igual —lo que
   *  sigue aplazado no vuelve a su grupo—, solo no tienen caja donde verse. */
  mostrarAplazados: boolean;
  /** Pintar la caja «Completados». Apagada, lo hecho sigue guardado: solo no
   *  tiene caja donde verse. */
  mostrarCompletados: boolean;
  /** Pintar el panel «Archivados» al final de la vista. Apagado, nada se borra:
   *  para recuperar algo hay que volver a encenderlo. */
  mostrarArchivados: boolean;
  /** Talla del texto de las filas, en píxeles. */
  fuente: number;
  /** Talla del texto de las notas, en píxeles. Va aparte de la de las filas:
   *  una nota se lee de corrido y pide otro tamaño que una lista de líneas
   *  cortas. */
  fuenteNota: number;
  /** Aire entre líneas de las notas; las filas no lo usan. */
  interlineadoNota: Interlineado;
  /** Tamaño propio de cada caja, por id de panel. La caja que no está aquí
   *  usa el de fábrica; una dimensión ausente también. */
  tamanos: Record<string, TamanoCaja>;
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

/** Claves de filas plegadas guardadas: solo cadenas no vacías. Una fila que ya
 *  no exista deja su clave, y no pasa nada: nunca se busca por ella. */
function leerPlegadas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((clave): clave is string => typeof clave === 'string' && clave.trim() !== '');
}

/** Escala vieja de tallas, en píxeles, para que los ajustes guardados sigan
 *  viéndose igual tras el cambio a número. */
const FUENTES_VIEJAS: Record<string, number> = { pequena: 12, normal: 13, grande: 15 };
const FUENTES_NOTA_VIEJAS: Record<string, number> = { pequena: 12, normal: 14, grande: 16 };

/** Una talla guardada: número dentro de sus límites, o la escala vieja. Cualquier
 *  otra cosa cae al valor por defecto. */
function leerFuente(valor: unknown, viejas: Record<string, number>, porDefecto: number, minima: number, maxima: number): number {
  const numero = typeof valor === 'number' ? valor : typeof valor === 'string' ? viejas[valor] : undefined;
  if (numero === undefined || !Number.isFinite(numero)) return porDefecto;
  return Math.min(maxima, Math.max(minima, numero));
}

/** Tamaños por caja guardados: solo enteros finitos y dentro de sus límites.
 *  Una caja que ya no exista deja su entrada y no pasa nada: nunca se busca. */
function leerTamanos(valor: unknown): Record<string, TamanoCaja> {
  const guardado = (typeof valor === 'object' && valor !== null ? valor : {}) as Record<string, unknown>;
  const tamanos: Record<string, TamanoCaja> = {};
  for (const [id, bruto] of Object.entries(guardado)) {
    // `''` es un id bueno: es la caja «Tareas». Descartarlo aquí hacía que su
    // tamaño no volviera al recargar, aunque se guardaba bien.
    if (typeof bruto !== 'object' || bruto === null) continue;
    const { ancho, alto, crecido } = bruto as Record<string, unknown>;
    const tamano: TamanoCaja = {};
    if (crecido === true) tamano.crecido = true;
    if (typeof ancho === 'number' && Number.isFinite(ancho)) {
      tamano.ancho = Math.min(TAMANO_MAXIMO, Math.max(ANCHO_CAJA_MINIMO, ancho));
    }
    if (typeof alto === 'number' && Number.isFinite(alto)) {
      tamano.alto = Math.min(TAMANO_MAXIMO, Math.max(ALTO_CAJA_MINIMO, alto));
    }
    if (tamano.ancho !== undefined || tamano.alto !== undefined) tamanos[id] = tamano;
  }
  return tamanos;
}

/** Órdenes por caja guardados: solo las claves y valores que siguen siendo
 *  modos válidos. Una caja borrada deja su entrada, y no pasa nada: su id no
 *  vuelve a pintarse; se descarta al leer para no arrastrar basura. */
function leerOrdenes(valor: unknown): Record<string, string> {
  const guardado = (typeof valor === 'object' && valor !== null ? valor : {}) as Record<string, unknown>;
  const ordenes: Record<string, string> = {};
  for (const [id, modo] of Object.entries(guardado)) {
    // `''` es un id bueno: es la caja «Tareas». Excluirlo le impedía recordar
    // su modo de orden propio.
    if (typeof modo === 'string' && MODOS.includes(modo)) ordenes[id] = modo;
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
  primeraVisible: false,
  plegadas: [],
  mostrarAplazados: true,
  mostrarCompletados: true,
  mostrarArchivados: true,
  fuente: FUENTE_POR_DEFECTO,
  fuenteNota: FUENTE_NOTA_POR_DEFECTO,
  interlineadoNota: 'normal',
  tamanos: {},
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
    const interlineadoNota = texto('interlineadoNota', ['ajustado', 'normal', 'amplio']);
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
      primeraVisible:
        typeof guardado.primeraVisible === 'boolean' ? guardado.primeraVisible : POR_DEFECTO.primeraVisible,
      plegadas: leerPlegadas(guardado.plegadas),
      mostrarAplazados:
        typeof guardado.mostrarAplazados === 'boolean' ? guardado.mostrarAplazados : POR_DEFECTO.mostrarAplazados,
      mostrarCompletados:
        typeof guardado.mostrarCompletados === 'boolean'
          ? guardado.mostrarCompletados
          : POR_DEFECTO.mostrarCompletados,
      mostrarArchivados:
        typeof guardado.mostrarArchivados === 'boolean' ? guardado.mostrarArchivados : POR_DEFECTO.mostrarArchivados,
      fuente: leerFuente(guardado.fuente, FUENTES_VIEJAS, POR_DEFECTO.fuente, FUENTE_MINIMA, FUENTE_MAXIMA),
      fuenteNota: leerFuente(
        guardado.fuenteNota,
        FUENTES_NOTA_VIEJAS,
        POR_DEFECTO.fuenteNota,
        FUENTE_NOTA_MINIMA,
        FUENTE_NOTA_MAXIMA,
      ),
      interlineadoNota: (interlineadoNota as Interlineado) ?? POR_DEFECTO.interlineadoNota,
      tamanos: leerTamanos(guardado.tamanos),
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
  // Cada ajuste deja copia en el servidor: el `localStorage` del webview se
  // vacía con una reinstalación, y la vista no debe volver a la de fábrica.
  respaldar('preferencias');
}

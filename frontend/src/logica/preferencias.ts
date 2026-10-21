/* Preferencias de la vista (orden, pestaña y ajustes de lectura), recordadas en
 * `localStorage`. Se guardan aparte de los datos: aquí no hay contratos del
 * backend, solo cómo mira la usuaria su lista. */

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

export interface Preferencias {
  orden: string;
  /** Pestaña de grupo activa: `''` es «Tareas» (sin grupo). */
  grupo: string;
  /** Esconder de la lista los hábitos ya cumplidos que tocaban hoy. */
  ocultarHabitos: boolean;
  /** Modo privacidad: el texto de la lista va difuminado hasta pasar el ratón. */
  privacidad: boolean;
  privacidadAlcance: AlcancePrivacidad;
  fuente: Fuente;
  altura: Altura;
  /** Filete entre filas. */
  separador: boolean;
}

const POR_DEFECTO: Preferencias = {
  orden: 'inteligente',
  grupo: '',
  ocultarHabitos: true,
  privacidad: false,
  privacidadAlcance: 'una',
  fuente: 'normal',
  altura: 'normal',
  separador: true,
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
    const altura = texto('altura', ['compacta', 'normal', 'amplia']);
    return {
      ...POR_DEFECTO,
      orden,
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
      altura: (altura as Altura) ?? POR_DEFECTO.altura,
      separador: typeof guardado.separador === 'boolean' ? guardado.separador : POR_DEFECTO.separador,
    };
  } catch {
    return { ...POR_DEFECTO };
  }
}

export function guardarPreferencias(cambios: Partial<Preferencias>): void {
  const actuales = leerPreferencias();
  localStorage.setItem(CLAVE, JSON.stringify({ ...actuales, ...cambios }));
}

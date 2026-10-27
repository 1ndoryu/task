/* Todos los números del orden inteligente en un solo sitio: lo que pesa cada
 * urgencia, cada importancia y cada fecha, lo que suman los momentos del día y
 * a qué hora empieza cada uno. `PARAMETROS` es la fuente única: de ahí salen los
 * valores de fábrica, la lectura segura de lo guardado y los controles de ajustes.
 * Los valores de fábrica son los de siempre: no cambian el orden de nadie. */

interface Parametro {
  etiqueta: string;
  defecto: number;
  min: number;
  max: number;
  /** Salto de los botones − / +. */
  paso: number;
  /** Unidad que se muestra junto al número (vacía para puntos). */
  unidad?: string;
}

const PUNTOS = { min: -5000, max: 5000, paso: 50 } as const;

/** Parámetro → su valor de fábrica y sus límites. Las claves son las que se guardan. */
const DEFINICION = {
  urgBloqueante: { etiqueta: 'Bloqueante', defecto: 1000, ...PUNTOS },
  urgUrgente: { etiqueta: 'Urgente', defecto: 500, ...PUNTOS },
  urgNormal: { etiqueta: 'Normal', defecto: 0, ...PUNTOS },
  urgChill: { etiqueta: 'Chill', defecto: -200, ...PUNTOS },

  priMuyAlta: { etiqueta: 'Muy alta', defecto: 500, ...PUNTOS },
  priAlta: { etiqueta: 'Alta', defecto: 300, ...PUNTOS },
  priMedia: { etiqueta: 'Media', defecto: 100, ...PUNTOS },
  priBaja: { etiqueta: 'Baja', defecto: 0, ...PUNTOS },
  priMuyBaja: { etiqueta: 'Muy baja', defecto: -100, ...PUNTOS },

  fecVencida: { etiqueta: 'Vencida', defecto: 400, ...PUNTOS },
  fecHoy: { etiqueta: 'Vence hoy', defecto: 300, ...PUNTOS },
  fecManana: { etiqueta: 'Vence mañana', defecto: 200, ...PUNTOS },
  fecSemana: { etiqueta: 'Vence esta semana', defecto: 100, ...PUNTOS },
  retrasoDia: { etiqueta: 'Por cada día de retraso', defecto: 50, ...PUNTOS },

  momMultiplicador: { etiqueta: 'En su momento (veces)', defecto: 2, min: 1, max: 10, paso: 0.5, unidad: '×' },
  momBono: { etiqueta: 'En su momento, si no suma (puntos)', defecto: 100, ...PUNTOS },
  momBonoPasado: { etiqueta: 'Su momento ya pasó (puntos)', defecto: 50, ...PUNTOS },

  horaTemprano: { etiqueta: 'Temprano empieza', defecto: 5, min: 0, max: 23, paso: 1, unidad: 'h' },
  horaTarde: { etiqueta: 'Tarde empieza', defecto: 12, min: 0, max: 23, paso: 1, unidad: 'h' },
  horaNoche: { etiqueta: 'Noche empieza', defecto: 19, min: 0, max: 23, paso: 1, unidad: 'h' },
} satisfies Record<string, Parametro>;

export type ClaveAlgoritmo = keyof typeof DEFINICION;
export type Algoritmo = Record<ClaveAlgoritmo, number>;

const CLAVES = Object.keys(DEFINICION) as ClaveAlgoritmo[];

/** Los valores de fábrica. */
export const ALGORITMO_DEFECTO = Object.fromEntries(CLAVES.map((c) => [c, DEFINICION[c].defecto])) as Algoritmo;

/** Lo que enseña la pantalla de ajustes: bloques con sus parámetros, en orden. */
export const GRUPOS_ALGORITMO: { titulo: string; nota?: string; claves: ClaveAlgoritmo[] }[] = [
  {
    titulo: 'Urgencia',
    nota: 'Puntos que suma cada nivel. Los hábitos suben de nivel según los días sin hacerse.',
    claves: ['urgBloqueante', 'urgUrgente', 'urgNormal', 'urgChill'],
  },
  { titulo: 'Importancia', claves: ['priMuyAlta', 'priAlta', 'priMedia', 'priBaja', 'priMuyBaja'] },
  { titulo: 'Fecha límite', claves: ['fecVencida', 'fecHoy', 'fecManana', 'fecSemana', 'retrasoDia'] },
  {
    titulo: 'Momento del día',
    nota: 'Lo que toca ahora multiplica su peso; si el peso no es positivo, suma el bono fijo.',
    claves: ['momMultiplicador', 'momBono', 'momBonoPasado'],
  },
  {
    titulo: 'Horas de cada momento',
    nota: 'Cada momento dura hasta que empieza el siguiente; la noche llega hasta temprano. Deben ir en orden.',
    claves: ['horaTemprano', 'horaTarde', 'horaNoche'],
  },
];

export const parametroDe = (clave: ClaveAlgoritmo): Parametro => DEFINICION[clave];

/** Un número dentro de los límites de su parámetro; `undefined` si no es un número. */
export function limitar(clave: ClaveAlgoritmo, valor: unknown): number | undefined {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return undefined;
  const { min, max, paso } = DEFINICION[clave];
  const limitado = Math.min(max, Math.max(min, valor));
  // Las horas son enteras; lo demás admite el decimal de su paso.
  return paso >= 1 ? Math.round(limitado) : limitado;
}

/** Las horas van en orden estricto (temprano < tarde < noche); si no, vuelven las de fábrica. */
export function horasValidas(a: Algoritmo): boolean {
  return a.horaTemprano < a.horaTarde && a.horaTarde < a.horaNoche;
}

/** Lo guardado, saneado parámetro a parámetro: uno roto no arrastra a los demás. */
export function leerAlgoritmo(valor: unknown): Algoritmo {
  const guardado = (typeof valor === 'object' && valor !== null ? valor : {}) as Record<string, unknown>;
  const algoritmo = { ...ALGORITMO_DEFECTO };
  for (const clave of CLAVES) algoritmo[clave] = limitar(clave, guardado[clave]) ?? algoritmo[clave];
  if (!horasValidas(algoritmo)) {
    for (const clave of ['horaTemprano', 'horaTarde', 'horaNoche'] as const) algoritmo[clave] = ALGORITMO_DEFECTO[clave];
  }
  return algoritmo;
}

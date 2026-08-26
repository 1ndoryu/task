/*
 * plugins/exp/ArbolVida.tsx
 * Árbol en pixel art que refleja el estado de vida del plugin Game.
 *
 * Cinco estados coherentes (0 / 25 / 50 / 75 / 100 % de vida): el árbol va
 * perdiendo copa y hojas a medida que baja la vida. Usa una cuadrícula base
 * uniforme (16x16) para que todos los estados compartan la misma silueta de
 * tronco y raíz, variando solo la cantidad de hojas de la copa.
 *
 * - Blanco y negro (blanco sobre el fondo del panel, sin rectángulo de fondo).
 * - Sin fondo ni fundido: píxeles celda a celda con `shape-rendering="crispEdges"`.
 *
 * Arquitectura reutilizable (para el editor pixel-art):
 * - `CELDAS_TRONCO` : Set de celdas fijas (tronco + raíces), no editables.
 * - `copaPorDefecto(estado)` : copa por defecto del estado como Set de celdas.
 * - `celdasCompletas(estado, copaExtra?)`: tronco + (copa por defecto ∪ editadas).
 * El render acepta `copaEditada` por estado (persistida en glory-exp) para
 * reflejar lo que el usuario dibujó en el editor.
 */

/* Cuadrícula 16x16 (mismo origen que el editor: (0,0) arriba-izquierda). */
export const DIMENSION_ARBOL = 16;

export type EstadoVida = 0 | 25 | 50 | 75 | 100;
export const ESTADOS_ARBOL: EstadoVida[] = [0, 25, 50, 75, 100];

/* Tronco + raíces: celdas fijas, idénticas en los 5 estados, NO editables.
 * Tronco 2 de ancho (x 7..8) desde y0 hasta y8; raíces a x 4/6/9/11 en y0. */
export const CELDAS_TRONCO: Set<string> = new Set<string>();
(function () {
    for (let y = 0; y <= 8; y++) {
        CELDAS_TRONCO.add(`7,${y}`);
        CELDAS_TRONCO.add(`8,${y}`);
    }
    CELDAS_TRONCO.add('6,0');
    CELDAS_TRONCO.add('4,0');
    CELDAS_TRONCO.add('9,0');
    CELDAS_TRONCO.add('11,0');
})();

interface Pixel {
    x: number;
    y: number;
}

const POR_FILA: Record<number, Array<[number, number]>> = {
    15: [
        [6, 15], [7, 15], [8, 15], [9, 15],
        [5, 15], [10, 15], [4, 15], [11, 15], [3, 15], [12, 15]
    ],
    14: [
        [5, 14], [6, 14], [7, 14], [8, 14], [9, 14], [10, 14], [11, 14],
        [4, 14], [12, 14], [3, 14], [13, 14]
    ],
    13: [
        [4, 13], [5, 13], [6, 13], [7, 13], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13],
        [3, 13], [13, 13], [2, 13], [14, 13]
    ],
    12: [
        [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [10, 12], [11, 12], [12, 12],
        [3, 12], [13, 12], [2, 12], [14, 12]
    ],
    11: [
        [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11],
        [4, 11], [11, 11], [3, 11], [12, 11]
    ],
    10: [
        [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
        [4, 10], [11, 10]
    ],
    9: [
        [6, 9], [7, 9], [8, 9], [9, 9],
        [5, 9], [10, 9]
    ]
};

/* Copa por defecto de cada estado: densidad creciente de filas. */
const COMPOSICION_ESTADOS: Record<EstadoVida, number[]> = {
    0: [],
    25: [11],
    50: [11, 12],
    75: [11, 12, 13, 10],
    100: [11, 12, 13, 14, 15, 10, 9]
};

function filasACeldas(filas: number[]): Set<string> {
    const set = new Set<string>();
    for (const f of filas) {
        for (const [x, y] of POR_FILA[f] || []) {
            if (x < 0 || x >= DIMENSION_ARBOL || y < 0 || y >= DIMENSION_ARBOL) continue;
            set.add(`${x},${y}`);
        }
    }
    return set;
}

export function copaPorDefecto(estado: EstadoVida): Set<string> {
    return filasACeldas(COMPOSICION_ESTADOS[estado]);
}

/* Celdas totales para renderizar un estado.
 * - Si el usuario editó el estado (copaEditada completa en copasArbol), la copa
 *   editada REEMPLAZA a la por defecto (puede quitar hojas y dibujar otras).
 * - El tronco fijo (CELDAS_TRONCO) siempre se conserva. */
export function celdasCompletas(estado: EstadoVida, copaReemplazo?: Set<string>): Set<string> {
    const resultado = new Set<string>(CELDAS_TRONCO);
    const origen: Iterable<string> = copaReemplazo ? copaReemplazo : copaPorDefecto(estado);
    for (const c of origen) {
        if (!CELDAS_TRONCO.has(c)) resultado.add(c);
    }
    return resultado;
}

interface ArbolVidaProps {
    vida: number;
    /* Copa completa del estado (persistida en copasArbol). Si se pasa,
     * reemplaza la copa por defecto. */
    copaEditada?: Set<string>;
}

function mapearAVida(valor: number): EstadoVida {
    if (valor <= 0) return 0;
    if (valor <= 25) return 25;
    if (valor <= 50) return 50;
    if (valor <= 75) return 75;
    return 100;
}

export function ArbolVida({vida, copaEditada}: ArbolVidaProps): JSX.Element {
    const estado = mapearAVida(vida);
    const celdas = Array.from(celdasCompletas(estado, copaEditada));

    const tamaño = 20; /* px por celda en el viewBox. */
    const ancho = DIMENSION_ARBOL * tamaño;
    const alto = DIMENSION_ARBOL * tamaño;

    /* Rendering: misma inversión que el editor para que (x, y) coincidan —
     * y=0 arriba en el SVG (arriba-izquierda origen). */
    return (
        <svg width="64" height="64" viewBox={`0 0 ${ancho} ${alto}`} shapeRendering="crispEdges" role="img" aria-label={`Árbol de vida (estado ${estado}%)`}>
            {celdas.map(clave => {
                const [xStr, yStr] = clave.split(',');
                const x = Number(xStr);
                const y = Number(yStr);
                return (
                    <rect
                        key={clave}
                        x={x * tamaño}
                        y={y * tamaño}
                        width={tamaño}
                        height={tamaño}
                        fill="#ffffff"
                        opacity="1"
                    />
                );
            })}
        </svg>
    );
}
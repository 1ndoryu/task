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
 *
 * COORDENADAS (importante): todo el módulo usa el MISMO sistema que el editor
 * pixel-art — origen (0,0) ARRIBA-izquierda, y crece hacia abajo. Así la copa
 * (y=0..6) queda arriba, el tronco (y=7..15) abajo y las raíces (y=15) en la
 * base. El SVG renderiza con y*tamaño (el eje y del SVG baja), por lo que lo
 * que se dibuja en el editor coincide exactamente con el render.
 */

/* Cuadrícula 16x16 (mismo origen que el editor: (0,0) arriba-izquierda). */
export const DIMENSION_ARBOL = 16;

export type EstadoVida = 0 | 25 | 50 | 75 | 100;
export const ESTADOS_ARBOL: EstadoVida[] = [0, 25, 50, 75, 100];

/* Tronco + raíces: celdas fijas, idénticas en los 5 estados, NO editables.
 * Tronco 2 de ancho (x 7..8) desde y7 hasta y15 (base); raíces a x 4/6/9/11 en
 * la base y15. (Coordenadas de editor: y=0 arriba, y=15 abajo.) */
export const CELDAS_TRONCO: Set<string> = new Set<string>();
(function () {
    for (let y = 7; y <= 15; y++) {
        CELDAS_TRONCO.add(`7,${y}`);
        CELDAS_TRONCO.add(`8,${y}`);
    }
    CELDAS_TRONCO.add('6,15');
    CELDAS_TRONCO.add('4,15');
    CELDAS_TRONCO.add('9,15');
    CELDAS_TRONCO.add('11,15');
})();

interface Pixel {
    x: number;
    y: number;
}

/* Copa por fila: fila 0 = tope del árbol (arriba), fila 6 = base de la copa
 * (justo encima del tronco). Cada entrada es [x, y] con y == fila. */
const POR_FILA: Record<number, Array<[number, number]>> = {
    0: [
        [6, 0], [7, 0], [8, 0], [9, 0],
        [5, 0], [10, 0], [4, 0], [11, 0], [3, 0], [12, 0]
    ],
    1: [
        [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],
        [4, 1], [12, 1], [3, 1], [13, 1]
    ],
    2: [
        [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],
        [3, 2], [13, 2], [2, 2], [14, 2]
    ],
    3: [
        [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],
        [3, 3], [13, 3], [2, 3], [14, 3]
    ],
    4: [
        [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],
        [4, 4], [11, 4], [3, 4], [12, 4]
    ],
    5: [
        [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],
        [4, 5], [11, 5]
    ],
    6: [
        [6, 6], [7, 6], [8, 6], [9, 6],
        [5, 6], [10, 6]
    ]
};

/* Copa por defecto de cada estado: densidad creciente de filas (0 = tope). */
const COMPOSICION_ESTADOS: Record<EstadoVida, number[]> = {
    0: [],
    25: [4],
    50: [4, 3],
    75: [4, 3, 2, 5],
    100: [4, 3, 2, 1, 0, 5, 6]
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

    /* Render: las celdas ya están en coordenadas de editor (y=0 arriba). El eje
     * y del SVG baja (como el grid del editor), así que y*tamaño pinta la copa
     * arriba y las raíces abajo — coincidiendo con lo que el usuario dibuja. */
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
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
 * - Los niveles intermedios añaden/quito franjas de la copa manteniendo el
 *   contorno (nunca quedan "agujeros" hopos incoherentes).
 */

export type EstadoVida = 0 | 25 | 50 | 75 | 100;

interface Pixel {
    x: number;
    y: number;
    tipo: 'tronco' | 'copa';
}

function buildGrid(): Map<string, Pixel> {
    const cells = new Map<string, Pixel>();
    /* Tronco: 2 de ancho (x 7..8), desde la raíz (y0) hasta y10. */
    for (let y = 0; y <= 10; y++) {
        cells.set(`${7},${y}`, {x: 7, y, tipo: 'tronco'});
        cells.set(`${8},${y}`, {x: 8, y, tipo: 'tronco'});
    }
    /* Raíces: dos zarcillos a cada lado a y0 (mismo esquema en los 5 estados). */
    cells.set(`${6},${0}`, {x: 6, y: 0, tipo: 'tronco'});
    cells.set(`${4},${0}`, {x: 4, y: 0, tipo: 'tronco'});
    cells.set(`${9},${0}`, {x: 9, y: 0, tipo: 'tronco'});
    cells.set(`${11},${0}`, {x: 11, y: 0, tipo: 'tronco'});
    return cells;
}

export function ArbolVida({vida}: {vida: number}): JSX.Element {
    /* Mapea la vida (0..vidaMax) a 5 estados discretos. */
    const porc = vida <= 0 ? 0 : vida <= 25 ? 25 : vida <= 50 ? 50 : vida <= 75 ? 75 : 100;

    const base = buildGrid();

    /* Definir copa por estado. Se añade la copa del nivel elegido. */
    const copa: [number, number][] = copaParaNivel(porc);

    for (const [x, y] of copa) {
        if (y <= 15 && y >= 0 && x >= 0 && x <= 15) {
            const k = `${x},${y}`;
            /* La copa nunca pinta sobre el tronco (se ve el tronco). */
            if (!base.has(k) || base.get(k)!.tipo !== 'tronco') {
                base.set(k, {x, y, tipo: 'copa'});
            }
        }
    }

    const celdas = Array.from(base.values());
    /* Pixel art: celdas de 2px con borde duro. */
    const tamaño = 20;
    const ancho = 16 * tamaño;
    const alto = 16 * tamaño;

    return (
        <svg
            width="64"
            height="64"
            viewBox={`0 0 ${ancho} ${alto}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label={`Árbol de vida (estado ${porc}%)`}
        >
            {celdas.map((cel) => (
                <rect
                    key={`${cel.x}:${cel.y}`}
                    x={cel.x * tamaño}
                    y={(16 - 1 - cel.y) * tamaño}
                    width={tamaño}
                    height={tamaño}
                    fill={cel.tipo === 'tronco' ? '#ffffff' : '#ffffff'}
                    opacity="1"
                />
            ))}
        </svg>
    );
}

/* Copas por nivel (rejilla 16x16, copa centrada x 2..13, de y11 hasta alto). */
function copaParaNivel(nivel: number): [number, number][] {
    /* Filas (y de 11 a 15) que tienen copa por nivel, en orden de densidad.
     * Un píxel copa activo = una hoja. Más hojas → más vida. */
    const porFila: Record<number, [number, number][]> = {
        15: [
            [6, 15], [7, 15], [8, 15], [9, 15],
            [5, 15], [10, 15]
        ],
        14: [
            [5, 14], [6, 14], [7, 14], [8, 14], [9, 14], [10, 14], [11, 14]
        ],
        13: [
            [4, 13], [5, 13], [6, 13], [7, 13], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13]
        ],
        12: [
            [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [10, 12], [11, 12], [12, 12]
        ],
        11: [
            [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11]
        ]
    };

    /* Densidad por nivel de vida (fracción de hojas de cada fila) */
    const niveles: Record<number, [number, number][]> = {
        0: [],
        25: [
            ...porFila[11]
        ],
        50: [
            ...porFila[11],
            ...porFila[12]
        ],
        75: [
            ...porFila[11],
            ...porFila[12],
            ...porFila[13]
        ],
        100: [
            ...porFila[11],
            ...porFila[12],
            ...porFila[13],
            ...porFila[14],
            ...porFila[15]
        ]
    };

    return niveles[nivel] ?? [];
}
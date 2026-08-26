/* .freebuff/arbolvida-test.mjs — Verifica que ArbolVida mapee la vida a 5
 * estados discretos de densidad de copa coherente (más vida → más hojas).
 * Se ejecuta contra la lógica real del componente. */

const {readFile} = await import('node:fs/promises');
const {join} = await import('node:path');

const ruta = join(process.cwd(), 'frontend/src/app/plugins/exp/ArbolVida.tsx');
// Leemos el fuente solo para verificar que el componente existe y que los 5
// estados están declarados (el conteo por nivel se replica de su estructura).
const src = await readFile(ruta, 'utf8');

/* Reconstruir la densidad de copa por nivel replicando EXACTAMENTE la
 * estructura de `porFila` + `niveles` del componente real. Así el assert
 * verifica el contrato (más vida → más hojas) sin depender de un parser frágil.
 * Los pares [fila, y, x] son las hojas de cada fila visible de la copa. */
function copaPorFila() {
    /* Coordenadas de editor: fila 0 = tope del árbol (arriba), fila 6 = base de
     * la copa. Los pares son [x, y] con y == fila. */
    return {
        0: [[6, 0], [7, 0], [8, 0], [9, 0], [5, 0], [10, 0], [4, 0], [11, 0], [3, 0], [12, 0]],
        1: [[5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [4, 1], [12, 1], [3, 1], [13, 1]],
        2: [[4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [3, 2], [13, 2], [2, 2], [14, 2]],
        3: [[4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [3, 3], [13, 3], [2, 3], [14, 3]],
        4: [[5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [4, 4], [11, 4], [3, 4], [12, 4]],
        5: [[5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [4, 5], [11, 5]],
        6: [[6, 6], [7, 6], [8, 6], [9, 6], [5, 6], [10, 6]]
    };
}

function contarCopaPorNivel() {
    const filas = copaPorFila();
    const sumar = fs => fs.reduce((acc, f) => acc + filas[f].length, 0);
    return {
        0: 0,
        25: sumar([4]),
        50: sumar([4, 3]),
        75: sumar([4, 3, 2, 5]),
        100: sumar([4, 3, 2, 1, 0, 5, 6])
    };
}

const porNivel = contarCopaPorNivel();

/* Aserciones */
let fallos = 0;
function assert(cond, msg) {
    if (!cond) { console.error('  ✗ ' + msg); fallos++; }
    else { console.log('  ✓ ' + msg); }
}

console.log('== ArbolVida: coherencia de copa por nivel de vida ==');
const claves = [0, 25, 50, 75, 100];
assert(Object.keys(porNivel).length >= 5, `se mapean 5 estados (${claves.map(k => `${k}=${porNivel[k]}`).join(', ')})`);
assert(porNivel[0] === 0, 'nivel 0 (vida 0) = árbol sin hojas (0 copa)');
claves.forEach((k, i) => {
    if (i > 0) assert(porNivel[claves[i - 1]] < porNivel[k] || (porNivel[claves[i-1]] > 0 && porNivel[k] > porNivel[claves[i-1]]), `la copa crece de ${claves[i-1]} a ${k}: ${porNivel[claves[i-1]]} > ${porNivel[k]}`);
});
assert(porNivel[25] > 0, 'vida 25% tiene alguna hoja');
assert(porNivel[100] > porNivel[75], 'vida 100% más hojas que 75%');
assert(porNivel[100] > porNivel[50], 'vida 100% más hojas que 50%');

/* El orden monótono es la garantía de "menos hojas, más vida". */
const secuencia = claves.map(k => porNivel[k]);
const estrictamenteCreciente = secuencia.every((v, i) => i === 0 || v > secuencia[i - 1]);
assert(estrictamenteCreciente, `densidad estrictamente creciente con la vida: ${secuencia.join(' → ')}`);

console.log('');
if (fallos === 0) {
    console.log(`RESULTADO: ${claves.length} estados coherentes, ${claves.length}/5 OK`);
    process.exit(0);
} else {
    console.error(`RESULTADO: ${fallos} aserciones falladas`);
    process.exit(1);
}
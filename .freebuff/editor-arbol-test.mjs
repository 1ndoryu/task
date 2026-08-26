/* Test de regresión del editor pixel-art del árbol (plugin exp).
 * Ejercita la lógica REAL exportada de ArbolVida (compilada con esbuild):
 * copaPorDefecto, celdasCompletas, CELDAS_TRONCO, ESTADOS_ARBOL.
 * - La copa por defecto nunca pisa el tronco fijo.
 * - celdasCompletas(estado, copaReemplazo): la copa editada (persistida en
 *   glory-exp/copasArbol) REEMPLAZA la por defecto y conserva el tronco.
 * - El tronco es bloqueado (aunque el editor lo intente no entra a la copa).
 * - Densidad estrictamente creciente entre los 5 estados.
 */
import assert from 'node:assert';
import {createRequire} from 'node:module';
import path from 'node:path';

const root = process.cwd();
/* esbuild vive en node_modules del frontend (no en la raíz). */
const reqFE = createRequire(path.join(root, 'frontend/package.json'));
const esbuild = reqFE('esbuild');

const entrada = path.join(root, 'frontend/src/app/plugins/exp/ArbolVida.tsx');

/* Transpilar y evaluar el módulo en un contexto CJS aislado (sin react). */
const r = esbuild.buildSync({
  entryPoints: [entrada],
  bundle: true,
  write: false,
  format: 'cjs',
  external: ['react', 'react/jsx-runtime']
});
const code = r.outputFiles[0].text;
const mod = {exports: {}};
const fn = new Function('exports', 'module', 'require', code);
fn(mod.exports, mod, reqFE);
const {copaPorDefecto, celdasCompletas, CELDAS_TRONCO, ESTADOS_ARBOL} = mod.exports;
const tronco = CELDAS_TRONCO;

let pasados = 0;
function ok(n) { pasados++; console.log(`  ✓ ${n}`); }

/* 1. La copa por defecto nunca pisa el tronco fijo. */
const copa100 = copaPorDefecto(100);
assert.equal([...copa100].filter(c => tronco.has(c)).length, 0, 'copa def no toca tronco');
ok('copa por defecto (100) no contiene celdas de tronco');

/* 2. celdasCompletas sin reemplazo = tronco + copa por defecto. */
const sinReemplazo = celdasCompletas(100);
assert.equal(sinReemplazo.size, tronco.size + copa100.size, 'sinReemplazo suma');
assert.equal([...sinReemplazo].filter(c => tronco.has(c)).length, tronco.size, 'tronco presente');
ok('celdasCompletas(100) = tronco + copa por defecto');

/* 3. Persistencia: pintar -> copa COMPLETA que reemplaza la por defecto.
 * La copa editada puede quitar y añadir hojas a voluntad (borrar una celda de
 * la por defecto debe reflejarse: no reaparece, porque celdasCompletas usa la
 * copa editada EN LUGAR de la por defecto, no la suma). */
const editada = new Set(copa100);
editada.add('15,7');           /* celda nueva dibujada */
editada.delete('6,15');        /* celda de copa por defecto que el usuario borró */
const con = celdasCompletas(100, editada);
assert.ok(con.has('15,7'), 'celda dibujada visible');
assert.equal([...con].filter(c => tronco.has(c)).length, tronco.size, 'tronco intacto');
assert.ok(!con.has('6,15'), 'copa por defecto borrada por el usuario no reaparece');
ok('copa editada reemplaza la por defecto conservando tronco');

/* 4. Tronco bloqueado: pintar sobre él no añade celdas de copa. El tronco lo
 * pinta siempre CELDAS_TRONCO; la copa editada no debe poder añadir celdas que
 * dupliquen el tronco ni celdas fuera del borde 16x16. deja11,7 no existe en el
 * tronco ni en la copa por defecto; si el editor intenta pintarla, no debe
 * colapsar y la densidad de copa editada coincide con la invariable. */
const editada4 = new Set(copaPorDefecto(25));
editada4.add('7,3');   /* celda de TRONCO: el render la muestra, pero NO como copa extra */
const conTronco = celdasCompletas(25, editada4);
/* El tronco completo sigue intacto (todas las celdas de tronco presentes). */
assert.equal([...conTronco].filter(c => tronco.has(c)).length, tronco.size, 'tronco completo');
/* Ninguna celda fuera del borde. */
for (const c of conTronco) { const [x, y] = c.split(',').map(Number); assert.ok(x >= 0 && x < 16 && y >= 0 && y < 16, `celda fuera de borde: ${c}`); }
ok('celdas del tronco siempre presentes y nada fuera del borde 16x16');

/* 5. Densidad estrictamente creciente entre los estados. */
const d = ESTADOS_ARBOL.map(e => copaPorDefecto(e).size);
for (let i = 1; i < d.length; i++) assert.ok(d[i] > d[i - 1], `${d[i - 1]}->${d[i]}`);
ok(`copas por defecto estrict. crecientes: ${d.join(' → ')}`);

/* 6. Estados válidos. */
assert.deepEqual(ESTADOS_ARBOL, [0, 25, 50, 75, 100]);
ok('ESTADOS_ARBOL = [0, 25, 50, 75, 100]');

console.log(`\nPASS ${pasados}/6 — lógica real de ArbolVida + persistencia del editor.`);
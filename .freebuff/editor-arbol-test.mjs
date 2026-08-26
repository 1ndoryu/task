/* Test de regresión del editor pixel-art del árbol (plugin exp).
 * Ejercita la lógica REAL exportada de ArbolVida (compilada con esbuild):
 * copaPorDefecto, celdasCompletas, migrarCopaLegacy, CELDAS_TRONCO, ESTADOS_ARBOL.
 *
 * Contrato actual (el tronco YA es editable):
 * - celdasCompletas(estado) sin edición = tronco + copa por defecto.
 * - celdasCompletas(estado, imagenCompleta) devuelve la imagen EXACTA que el
 *   usuario guardó: si borró el tronco, el render NO lo restaura.
 * - migrarCopaLegacy convierte los datos legacy (copa sin tronco) añadiendo el
 *   tronco por defecto; es idempotente (solo la corre el store una vez, con el
 *   flag copasArbolMigrado).
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
const {copaPorDefecto, celdasCompletas, migrarCopaLegacy, CELDAS_TRONCO, ESTADOS_ARBOL} = mod.exports;
const tronco = CELDAS_TRONCO;

let pasados = 0;
function ok(n) { pasados++; console.log(`  ✓ ${n}`); }

/* 1. La copa por defecto nunca pisa el tronco. */
const copa100 = copaPorDefecto(100);
assert.equal([...copa100].filter(c => tronco.has(c)).length, 0, 'copa def no toca tronco');
ok('copa por defecto (100) no contiene celdas de tronco');

/* 2. celdasCompletas sin edición = tronco + copa por defecto. */
const sinEdicion = celdasCompletas(100);
assert.equal(sinEdicion.size, tronco.size + copa100.size, 'sinEdicion suma');
assert.equal([...sinEdicion].filter(c => tronco.has(c)).length, tronco.size, 'tronco presente');
ok('celdasCompletas(100) sin edición = tronco + copa por defecto');

/* 3. Imagen editada reemplaza por completo: si el usuario borra el tronco, el
 * render NO lo restaura (el tronco ya no es bloqueado). */
const imagenSinTronco = new Set(copa100);
imagenSinTronco.add('15,7');       /* celda nueva dibujada */
imagenSinTronco.delete('6,0');     /* hoja por defecto borrada */
const conEdicion = celdasCompletas(100, imagenSinTronco);
assert.ok(conEdicion.has('15,7'), 'celda dibujada visible');
assert.ok(!conEdicion.has('6,0'), 'hoja por defecto borrada no reaparece');
assert.equal([...conEdicion].filter(c => tronco.has(c)).length, 0, 'sin tronco si el usuario lo borró');
ok('celdasCompletas(estado, imagen) usa la imagen EXACTA (tronco borrable)');

/* 3b. Imagen editada vacía = árbol vacío intencional. */
assert.equal(celdasCompletas(50, new Set()).size, 0, 'set vacío → árbol vacío');
ok('imagen editada vacía renderiza árbol vacío (borró todo a propósito)');

/* 4. migrarCopaLegacy: añade el tronco a una copa legacy (v1) y es idempotente. */
const migrada = migrarCopaLegacy([...copaPorDefecto(50)]);
assert.equal([...migrada].filter(c => tronco.has(c)).length, tronco.size, 'legacy migrada conserva tronco');
assert.equal(migrada.length, tronco.size + copaPorDefecto(50).size, 'tamaño = tronco + copa');
assert.deepEqual(migrarCopaLegacy(migrada), migrada, 'idempotente');
assert.deepEqual(migrarCopaLegacy([]), [...tronco], 'copa vacía legacy → solo tronco');
ok('migrarCopaLegacy añade tronco a datos legacy y es idempotente');

/* 5. Densidad estrictamente creciente entre los estados. */
const d = ESTADOS_ARBOL.map(e => copaPorDefecto(e).size);
for (let i = 1; i < d.length; i++) assert.ok(d[i] > d[i - 1], `${d[i - 1]}->${d[i]}`);
ok(`copas por defecto estrict. crecientes: ${d.join(' → ')}`);

/* 6. Estados válidos. */
assert.deepEqual(ESTADOS_ARBOL, [0, 25, 50, 75, 100]);
ok('ESTADOS_ARBOL = [0, 25, 50, 75, 100]');

console.log(`\nPASS ${pasados}/6 — lógica real de ArbolVida + persistencia del editor.`);

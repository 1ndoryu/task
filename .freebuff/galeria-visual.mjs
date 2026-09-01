/* .freebuff/galeria-visual.mjs
 * Test de la Galería visual (Fase 4.5, sección 9.5 del plan): verifica que la
 * fuente única de verdad (frontend/src/app/plugins/agente/fixtures.ts) contiene
 * los 19 ítems del checklist con datos realistas y que cada entrada del
 * catálogo tiene la vista mapeada en la isla (plugins/agente/componentes.tsx y
 * GaleriaVisualIsland.tsx). Node 24 importa TS nativo (type-stripping), por eso
 * el fixtures es un archivo de datos puro sin React.
 *
 * Nota 318A-7: el catálogo ahora tiene 20 ítems (se añadió
 * '20-contexto-detallado' con la barra de desglose + botón Compactar).
 *
 * Uso: node .freebuff/galeria-visual.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = join(__dirname, '..');

/* Importar la fuente única de verdad (TS nativo en Node 24). */
const { CATALOGO, fixtureMensajes, fixtureTareas, fixtureSkills } = await import(
    pathToFileURL(join(raiz, 'frontend/src/app/plugins/agente/fixtures.ts')).href
);

let pasados = 0;
const ok = (msg) => { pasados++; console.log(`  ✔ ${msg}`); };

console.log('Galería visual (Fase 4.5):\n');

/* 1. Catálogo: los 20 ítems (19 de la sección 9.5 + 20-contexto-detallado de 318A-7). */
assert.equal(CATALOGO.length, 20, `catálogo debe tener 20 ítems, tiene ${CATALOGO.length}`);
ok('catálogo con los 20 ítems (ids ' + CATALOGO[0].id + ' … ' + CATALOGO[19].id + ')');

const ids = new Set(CATALOGO.map(e => e.id));
assert.equal(ids.size, 20, 'los ids deben ser únicos');
for (const e of CATALOGO) {
    assert.ok(e.titulo && e.titulo.length > 0, `${e.id}: título no vacío`);
    assert.ok(Array.isArray(e.estados) && e.estados.length > 0, `${e.id}: estados no vacíos`);
}
ok('cada entrada tiene id único, título y estados');

/* 2. Fixtures: datos realistas y coherentes con los shapes del store. */
assert.ok(fixtureMensajes.some(m => m.rol === 'user'), 'hay mensaje de usuario');
assert.ok(fixtureMensajes.some(m => m.rol === 'assistant'), 'hay mensaje de asistente');
assert.ok(fixtureMensajes.some(m => m.herramientas?.some(h => h.diff)), 'hay diff de file_write');
assert.ok(fixtureMensajes.some(m => m.herramientas?.some(h => !h.ok)), 'hay tool en error');
assert.ok(fixtureMensajes.some(m => m.reintentar), 'hay estado retryable');
assert.ok(fixtureMensajes.every(m => m.rol === 'user' || m.rol === 'assistant'), 'roles válidos');
ok('mensajes: user/assistant, tool ok/error, diff y reintentar presentes');

for (const t of fixtureTareas) {
    assert.ok(t.nombre, `tarea ${t.id}: nombre`);
    assert.ok(['pendiente', 'ejecutando', 'completada', 'fallida'].includes(t.estado), `tarea ${t.id}: estado válido`);
}
assert.equal(new Set(fixtureTareas.map(t => t.estado)).size, 4, 'los 4 estados de tarea programada están cubiertos');
ok('tareas: cubren pendiente/ejecutando/completada/fallida');

assert.ok(fixtureSkills.some(s => s.activa) && fixtureSkills.some(s => !s.activa), 'skills activas e inactivas');
ok('skills: activa e inactiva');

/* 3. La isla mapea una vista para cada id del catálogo (los 19 ítems renderizan). */
const isla = readFileSync(join(raiz, 'frontend/src/app/islands/GaleriaVisualIsland.tsx'), 'utf8');
const idsEnIsla = idsPara(isla);
for (const e of CATALOGO) {
    assert.ok(idsEnIsla.has(e.id), `la isla debe tener una vista para ${e.id}`);
}
ok('la isla mapea una vista para los 20 ítems');

/* 4. Los componentes compartidos existen y la isla los importa (sin copias divergentes).
 * Unos viven en componentes.tsx (export function) y otros (burbujas/tarjetas de
 * mensaje) viven en mensajes.tsx y se re-exportan desde componentes.tsx. */
const componentes = readFileSync(join(raiz, 'frontend/src/app/plugins/agente/componentes.tsx'), 'utf8');
const mensajes = readFileSync(join(raiz, 'frontend/src/app/plugins/agente/mensajes.tsx'), 'utf8');
/* Definidos directamente en componentes.tsx. */
const EN_COMPONENTES = ['TabsWorkspace', 'SelectorModo', 'SkillFila', 'BotonCancelar', 'EstadoVacio', 'EstadoCarga'];
/* Re-exportados: definidos en mensajes.tsx y exportados de nuevo en componentes.tsx. */
const RE_EXPORTADOS = ['MensajeUsuario', 'MensajeAsistente', 'TarjetaTool', 'BarraContexto', 'BarraContextoInferior', 'BotonReintentar', 'IndicadorPensando'];
for (const nombre of EN_COMPONENTES) {
    assert.ok(componentes.includes(`export function ${nombre}`), `componentes.tsx debe exportar ${nombre}`);
}
for (const nombre of RE_EXPORTADOS) {
    assert.ok(mensajes.includes(`export function ${nombre}`), `mensajes.tsx debe definir ${nombre}`);
    const reExporta = new RegExp(`export \\{[^}]*\\n\\s*${nombre}\\b[^}]*\\} from './mensajes'`);
    assert.ok(reExporta.test(componentes), `componentes.tsx debe re-exportar ${nombre} desde mensajes.tsx`);
}
/* El botón de reintentar se renderiza vía MensajeAsistente (reintentar=true),
 * no duplicado en la isla: la vista 13 debe usar el componente compartido.
 * Por eso BotonReintentar no se exige "usado" en la isla y sí se prohíbe aparte. */
const USADOS_EN_ISLA = [...EN_COMPONENTES, ...RE_EXPORTADOS].filter(n => n !== 'BotonReintentar');
for (const nombre of USADOS_EN_ISLA) {
    assert.ok(isla.includes(nombre), `la isla debe usar ${nombre}`);
}
assert.ok(!isla.includes('BotonReintentar'), 'la isla no debe renderizar BotonReintentar aparte (MensajeAsistente ya lo hace)');
ok('los componentes compartidos del chat se usan en la galería (sin maquetas propias)');

/* 5. Ruta dev-only: /agente/visuales registrada bajo import.meta.env.DEV. */
const mainTsx = readFileSync(join(raiz, 'frontend/src/main.tsx'), 'utf8');
assert.ok(mainTsx.includes("'/agente/visuales/'"), 'la ruta /agente/visuales debe registrarse');
assert.ok(mainTsx.includes('import.meta.env.DEV'), 'la ruta debe estar condicionada a dev');
ok('ruta /agente/visuales solo en dev (import.meta.env.DEV)');

/* 6. Los ítems 17-19 (automejora/verificación) están marcados como pendientes, no fingidos. */
const pendientes = CATALOGO.filter(e => ['17-propuesta-skill', '18-aviso-meta', '19-verificacion-autonoma'].includes(e.id));
for (const p of pendientes) {
    assert.ok(p.pendiente && p.pendiente.length > 0, `${p.id}: debe declarar su estado pendiente`);
}
ok('ítems de automejora/verificación marcados pendientes (no falso éxito)');

console.log(`\nResultado: ${pasados} checks OK.`);
process.exit(0);

/* Extrae los ids (XX-nombre) que aparecen en el archivo de la isla. */
function idsPara(contenido) {
    const set = new Set();
    for (const m of contenido.matchAll(/'(\d{2}-[a-z-]+)'/g)) set.add(m[1]);
    return set;
}

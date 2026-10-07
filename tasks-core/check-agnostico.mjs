/*
 * tasks-core/check-agnostico.mjs
 * Puerta del núcleo (07AA-1 F1b): 1) veto de imports de framework/DOM/editor,
 * 2) type-check estricto, 3) tests. Falla con código != 0 ante lo primero que rompa.
 * Usa el TypeScript del frontend: este paquete no trae devDeps propias.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const raiz = dirname(fileURLToPath(import.meta.url));
const src = join(raiz, 'src');

const VETADOS = [
    /from\s+['"](react|react-dom|zustand|axios|lucide-react|@tanstack\/[^'"]+|vite[^'"]*)['"]/,
    /\bwindow\b/,
    /\bdocument\b/,
    /\blocalStorage\b/,
    /\.css['"]/,
    /\.\.\//,
];

let vetos = 0;
for (const fichero of readdirSync(src).filter((f) => f.endsWith('.ts'))) {
    const texto = readFileSync(join(src, fichero), 'utf8');
    for (const patron of VETADOS) {
        const hallado = texto.match(patron);
        if (hallado !== null) {
            console.error(`VETO ${fichero}: ${hallado[0]}`);
            vetos++;
        }
    }
}
if (vetos > 0) {
    process.exit(1);
}

const tsc = join(raiz, '..', 'frontend', 'node_modules', 'typescript', 'bin', 'tsc');
let paso = spawnSync(process.execPath, [tsc, '-p', join(raiz, 'tsconfig.json'), '--noEmit'], {stdio: 'inherit'});
if (paso.status !== 0) {
    console.error('tasks-core: type-check FALLA');
    process.exit(1);
}

const ficherosTest = readdirSync(src).filter((f) => f.endsWith('.test.ts')).map((f) => join('src', f));
paso = spawnSync(process.execPath, ['--test', ...ficherosTest], {cwd: raiz, stdio: 'inherit'});
if (paso.status !== 0) {
    console.error('tasks-core: tests FALLAN');
    process.exit(1);
}

console.log('tasks-core OK: agnóstico + tipos + tests');

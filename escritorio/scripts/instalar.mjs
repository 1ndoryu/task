// Compila PROYECTO TASKS de escritorio en la 89 y lo instala en el laptop.
// [por que] El laptop no compila (AGENTS §1). La 89 solo compila: el dato vive en
// el PostgreSQL del propio equipo y la app no depende de la red para abrir. El
// lanzador, el backend y el front van juntos en una carpeta fija fuera de OneDrive
// y de C:\tmp; el front lleva el auto-login local.
// Uso: node escritorio/scripts/instalar.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HOST_REMOTO = 'dev89';
const RAIZ_LOCAL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAIZ_REMOTA = '~/taller/"PROYECTO TASKS"';
const NODE_REMOTO = '/home/dev/.local/share/fnm/node-versions/v24.21.0/installation/bin/node';
const LLVM = '/usr/lib/llvm-18/bin';
const RUSTFLAGS = '-C target-feature=+crt-static';
// [por que] Los artefactos no viven en /var/tmp ni en ~/.cache: cm-sweep los barre (en suelo duro,
// sin umbral) y se llevó el zip de swagger y el front a mitad de una instalación (2026-10-19).
// ~/.local está en su lista NUNCA, así que aquí sobreviven; el target de compilación se queda en
// /var/tmp a propósito (es caché podable: si un barrido se lo lleva, toca recompilar).
// Ruta absoluta y no `$HOME`: los `scp` no expanden variables.
const ARTE = '/home/dev/.local/share/proyecto-tasks';
const SWAGGER_ZIP = `${ARTE}/swagger-ui-v5.17.12.zip`;
const SWAGGER_URL = 'https://github.com/swagger-api/swagger-ui/archive/refs/tags/v5.17.12.zip';
const FRONT = `${ARTE}/front`;
const PUERTO_BACKEND = 4190;
const DESTINO = 'C:/Users/Owner/Apps/PROYECTO-TASKS';

/* El target y la rama salen del mismo módulo que usa `run-cargo` (rcargo.mjs): escribirlos a mano
 * aquí ya costó una copia de la verdad (2026-10-19, `/var/tmp/tareas-target` fuera del taller). */
const taller = await import(pathToFileURL(join(RAIZ_LOCAL, '..', 'workspace-manager', 'scripts', 'remoto', 'rcargo.mjs')).href);
const rutas = taller.rutasRemotas(taller.cargarConfig(), 'PROYECTO TASKS', taller.detectarRama(RAIZ_LOCAL));
const TARGET = rutas.target;

function ssh(comando) {
    const r = spawnSync('ssh', ['-o', 'BatchMode=yes', HOST_REMOTO, comando], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`fallo en 89: ${comando.slice(0, 80)}`);
}

/* Rust, por el wrapper del taller y no por `ssh cargo` (AGENTS §2 y D2): así pasa por `cm-heavy`,
 * usa el target del taller y hereda el sync. Lo que el wrapper no traía para un build cruzado se le
 * pide con `--prepath`/`--env`, que rcargo añade al entorno remoto. */
function runCargo(args) {
    const r = spawnSync(process.execPath, [join(RAIZ_LOCAL, 'scripts', 'run-cargo.mjs'), ...args], { cwd: RAIZ_LOCAL, stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`run-cargo falló: ${args.join(' ')}`);
}

// El path remoto lo interpreta el shell del otro lado: los espacios de «PROYECTO TASKS» hay que escaparlos.
function escaparRemoto(ruta) {
    return ruta.replace(/([ \\])/g, '\\$1');
}

// [por que] Con la app abierta, los exe están bloqueados y la copia fallaría a medias.
if (await puertoAbierto(PUERTO_BACKEND)) throw new Error(`cierra PROYECTO TASKS (puerto ${PUERTO_BACKEND} en uso)`);

ssh(`mkdir -p ${ARTE}`);

// 1. Front con auto-login local (solo este build; producción no lo incluye).
ssh(`cd ${RAIZ_REMOTA}/frontend && VITE_AUTO_LOGIN_LOCAL=1 ${NODE_REMOTO} node_modules/vite/bin/vite.js build --outDir ${FRONT} --emptyOutDir`);

// 2. Backend para Windows. [por que] utoipa-swagger-ui necesita el zip local: su build.rs lo descarga
// y la 89 no tiene salida a GitHub; llvm-18 hace falta para lld-link (no está en el PATH de un ssh
// no interactivo) y crt-static para que el .exe no pida el redistribuible de VC++.
ssh(`[ -f ${SWAGGER_ZIP} ] || curl -fsSL -o ${SWAGGER_ZIP} ${SWAGGER_URL}`);
runCargo([
    'xwin', 'build', '--release', '--target', 'x86_64-pc-windows-msvc',
    `--prepath=${LLVM}`,
    `--env=SWAGGER_UI_DOWNLOAD_URL=file://${SWAGGER_ZIP}`,
    `--env=RUSTFLAGS=${RUSTFLAGS}`,
]);

// 3. Lanzador de Tauri. Crate propio: se comparte el target del taller (cargo separa por paquete y
// RUSTFLAGS, así que no se pisan). [por que] Sin crt-static: con él, lld-link deja sin resolver
// símbolos de la CRT (wcslen, round…) por static_vcruntime de Tauri; el lanzador usa el VC runtime
// dinámico del equipo.
runCargo([
    'xwin', 'build', '--release', '--target', 'x86_64-pc-windows-msvc',
    '--manifest-path', 'escritorio/src-tauri/Cargo.toml',
    `--prepath=${LLVM}`,
]);

// 4. Copia al laptop: se sustituye entera para que no queden restos de una versión anterior.
mkdirSync(DESTINO, { recursive: true });
rmSync(`${DESTINO}/tareas-front`, { recursive: true, force: true });
const copias = [
    // El destino se nombra: el lanzador sirve el front desde `<dir>/tareas-front` (main.rs:118).
    ['-q', '-r', `${HOST_REMOTO}:${FRONT}`, `${DESTINO}/tareas-front`],
    ['-q', `${HOST_REMOTO}:${escaparRemoto(`${TARGET}/x86_64-pc-windows-msvc/release/proyecto-tasks.exe`)}`, `${DESTINO}/`],
    ['-q', `${HOST_REMOTO}:${escaparRemoto(`${TARGET}/x86_64-pc-windows-msvc/release/glory-backend.exe`)}`, `${DESTINO}/`],
];
for (const args of copias) {
    if (spawnSync('scp', args, { stdio: 'inherit' }).status !== 0) throw new Error(`scp falló: ${args.at(-2)}`);
}

/* 5. Config del equipo: `config.env` junto a los exe. El lanzador lee de aquí la
 * conexión a la BD local y la ruta de pg_dump.
 * [por que] Va en el destino y no en el repo porque lleva la contraseña de la BD:
 * este script está versionado, el fichero generado no. Y no puede ir compilada en
 * el .exe por lo mismo. La `DATABASE_URL` sale del `.env` del proyecto (ignorado
 * por git) para no tener la conexión en dos sitios. */
const env = readFileSync(join(RAIZ_LOCAL, '.env'), 'utf8');
const databaseUrl = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim();
if (!databaseUrl) throw new Error('.env no trae DATABASE_URL');
const pgDump = rutaPgDump();
if (!pgDump) throw new Error('no se encontró pg_dump.exe; instala PostgreSQL o ajusta PG_DUMP en config.env');
writeFileSync(join(DESTINO, 'config.env'), `DATABASE_URL=${databaseUrl}\nPG_DUMP=${pgDump}\n`, 'utf8');
console.log(`BD local: ${databaseUrl.replace(/:\/\/[^:]*:[^@]*@/, '://***:***@')}`);

// 6. Acceso directo en el escritorio: un clic para abrir.
const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\\PROYECTO TASKS.lnk');` +
    `$s.TargetPath='${DESTINO.replaceAll('/', '\\')}\\proyecto-tasks.exe';$s.WorkingDirectory='${DESTINO.replaceAll('/', '\\')}';$s.Save()`;
spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });

// pg_dump del PostgreSQL instalado en el equipo; se elige la versión más alta.
function rutaPgDump() {
    const raiz = 'C:/Program Files/PostgreSQL';
    let versiones = [];
    try {
        versiones = readdirSync(raiz).sort((a, b) => Number(b) - Number(a));
    } catch {
        return null;
    }
    for (const v of versiones) {
        const exe = `${raiz}/${v}/bin/pg_dump.exe`;
        if (existsSync(exe)) return exe;
    }
    return null;
}

console.log(`\nInstalado en ${DESTINO}. Ábrelo con el acceso directo «PROYECTO TASKS».`);

// Comprueba si algo escucha en 127.0.0.1:puerto (sin enviar nada).
function puertoAbierto(puerto) {
    return new Promise((resolver) => {
        const s = connect(puerto, '127.0.0.1');
        s.once('connect', () => { s.destroy(); resolver(true); });
        s.once('error', () => resolver(false));
    });
}

// Compila PROYECTO TASKS de escritorio en la 89 y lo instala en el laptop.
// [por que] El laptop no compila (AGENTS §1). El lanzador, el backend y el front van
// juntos en una carpeta fija fuera de OneDrive y de C:\tmp; el front lleva el auto-login local.
// Uso: node escritorio/scripts/instalar.mjs
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { connect } from 'node:net';

const HOST_REMOTO = 'dev89';
const RAIZ_REMOTA = '~/taller/"PROYECTO TASKS"';
const NODE_REMOTO = '/home/dev/.local/share/fnm/node-versions/v24.21.0/installation/bin/node';
const CARGO_REMOTO = '$HOME/.cargo/bin/cargo';
const LLVM = '/usr/lib/llvm-18/bin';
const RUSTFLAGS = '-C target-feature=+crt-static';
const SWAGGER_ZIP = '/var/tmp/swagger-ui-v5.17.12.zip';
const SWAGGER_URL = 'https://github.com/swagger-api/swagger-ui/archive/refs/tags/v5.17.12.zip';
const PUERTO_BACKEND = 4190;
const DESTINO = 'C:/Users/Owner/Apps/PROYECTO-TASKS';

function ssh(comando) {
    const r = spawnSync('ssh', ['-o', 'BatchMode=yes', HOST_REMOTO, comando], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`fallo en 89: ${comando.slice(0, 80)}`);
}

// [por que] Con la app abierta, los exe están bloqueados y la copia fallaría a medias.
if (await puertoAbierto(PUERTO_BACKEND)) throw new Error(`cierra PROYECTO TASKS (puerto ${PUERTO_BACKEND} en uso)`);

// 1. Front con auto-login local (solo este build; producción no lo incluye).
ssh(`cd ${RAIZ_REMOTA}/frontend && VITE_AUTO_LOGIN_LOCAL=1 ${NODE_REMOTO} node_modules/vite/bin/vite.js build --outDir /var/tmp/tareas-front --emptyOutDir`);

// 2. Backend para Windows. [por que] utoipa-swagger-ui necesita el zip local: su build.rs descarga en build.
ssh(`[ -f ${SWAGGER_ZIP} ] || curl -fsSL -o ${SWAGGER_ZIP} ${SWAGGER_URL}`);
ssh(`cd ${RAIZ_REMOTA} && PATH=${LLVM}:$PATH SWAGGER_UI_DOWNLOAD_URL=file://${SWAGGER_ZIP} RUSTFLAGS="${RUSTFLAGS}" CARGO_TARGET_DIR=/var/tmp/tareas-target ${CARGO_REMOTO} xwin build --release --target x86_64-pc-windows-msvc`);

// 3. Lanzador de Tauri. Crate propio: su target va aparte para no recompilar el backend.
// [por que] Sin crt-static: con él, lld-link deja sin resolver símbolos de la CRT (wcslen, round…)
// por static_vcruntime de Tauri. El lanzador usa el VC runtime dinámico del equipo.
ssh(`cd ${RAIZ_REMOTA}/escritorio/src-tauri && PATH=${LLVM}:$PATH CARGO_TARGET_DIR=/var/tmp/escritorio-target ${CARGO_REMOTO} xwin build --release --target x86_64-pc-windows-msvc`);

// 4. Copia al laptop: se sustituye entera para que no queden restos de una versión anterior.
mkdirSync(DESTINO, { recursive: true });
rmSync(`${DESTINO}/tareas-front`, { recursive: true, force: true });
const copias = [
    ['-q', '-r', `${HOST_REMOTO}:/var/tmp/tareas-front`, `${DESTINO}/`],
    ['-q', `${HOST_REMOTO}:/var/tmp/escritorio-target/x86_64-pc-windows-msvc/release/proyecto-tasks.exe`, `${DESTINO}/`],
    ['-q', `${HOST_REMOTO}:/var/tmp/tareas-target/x86_64-pc-windows-msvc/release/glory-backend.exe`, `${DESTINO}/`],
];
for (const args of copias) {
    if (spawnSync('scp', args, { stdio: 'inherit' }).status !== 0) throw new Error(`scp falló: ${args.at(-2)}`);
}

// 5. Acceso directo en el escritorio: un clic para abrir.
const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\\PROYECTO TASKS.lnk');` +
    `$s.TargetPath='${DESTINO.replaceAll('/', '\\')}\\proyecto-tasks.exe';$s.WorkingDirectory='${DESTINO.replaceAll('/', '\\')}';$s.Save()`;
spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });

console.log(`\nInstalado en ${DESTINO}. Ábrelo con el acceso directo «PROYECTO TASKS».`);

// Comprueba si algo escucha en 127.0.0.1:puerto (sin enviar nada).
function puertoAbierto(puerto) {
    return new Promise((resolver) => {
        const s = connect(puerto, '127.0.0.1');
        s.once('connect', () => { s.destroy(); resolver(true); });
        s.once('error', () => resolver(false));
    });
}

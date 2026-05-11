import {existsSync, readFileSync, watchFile} from 'node:fs';
import {resolve} from 'node:path';

const modoWatch = process.argv.includes('--watch');
const archivos = ['roadmap.md', 'App/roadmap.md'].map(archivo => resolve(process.cwd(), archivo));

function esLineaIgnorable(texto) {
    const limpio = texto.trim().toLowerCase();
    return !limpio || limpio === '(sin tareas pendientes)' || /^\([^)]*\)$/.test(limpio);
}

function analizarArchivo(archivo) {
    if (!existsSync(archivo)) return [];
    const lineas = readFileSync(archivo, 'utf8').split(/\r?\n/);
    const tareas = [];
    let enPendientes = false;

    lineas.forEach((linea, indice) => {
        const trim = linea.trim();
        if (/^#+\s+.*pendiente/i.test(trim)) {
            enPendientes = true;
            return;
        }
        if (enPendientes && /^#{1,2}\s+/.test(trim) && !/pendiente/i.test(trim)) {
            enPendientes = false;
        }
        if (!enPendientes || esLineaIgnorable(trim)) return;
        if (/^(?:-|--|###)\s+/.test(trim)) {
            tareas.push({archivo, linea: indice + 1, columna: Math.max(1, linea.indexOf(trim) + 1), texto: trim.replace(/^(?:-|--|###)\s+/, '')});
        }
    });

    return tareas;
}

function ejecutar() {
    const tareas = archivos.flatMap(analizarArchivo);
    tareas.forEach(tarea => {
        console.log(`${tarea.archivo}:${tarea.linea}:${tarea.columna}: warning: TAREA PENDIENTE: ${tarea.texto}`);
    });
    console.log(tareas.length ? `[roadmap-watcher] ${tareas.length} tarea(s) pendiente(s)` : '[roadmap-watcher] Sin tareas');
    return tareas.length;
}

if (modoWatch) {
    console.log('[roadmap-watcher] Vigilando roadmap.md y App/roadmap.md');
    ejecutar();
    archivos.forEach(archivo => watchFile(archivo, {interval: 2000}, () => {
        console.log('[roadmap-watcher] Cambio detectado');
        ejecutar();
    }));
} else {
    process.exitCode = ejecutar() > 0 ? 1 : 0;
}
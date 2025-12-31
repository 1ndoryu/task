#!/usr/bin/env node

/*
 * Script de diagnóstico para probar el servidor MCP
 * Este script simula una llamada MCP y muestra qué está pasando
 */

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.error('[TEST MCP] Iniciando test del servidor MCP...');

const serverPath = resolve(__dirname, 'dist', 'index.js');
console.error(`[TEST MCP] Ruta del servidor: ${serverPath}`);

const env = {
    ...process.env,
    GLORY_API_URL: 'http://glorybuilder.local/wp-json/glory/v1',
    GLORY_WP_USERNAME: 'admin',
    GLORY_WP_PASSWORD: 'jRZ29zhBWOdOBqcdge0FPIJE'
};

console.error('[TEST MCP] Variables de entorno configuradas');

const server = spawn('node', [serverPath], {
    env,
    stdio: ['pipe', 'pipe', 'pipe']
});

let responseReceived = false;

server.stdout.on('data', data => {
    console.error('[TEST MCP] STDOUT recibido:', data.toString());
    responseReceived = true;
});

server.stderr.on('data', data => {
    console.error('[TEST MCP] STDERR:', data.toString());
});

server.on('error', error => {
    console.error('[TEST MCP] ERROR al iniciar servidor:', error.message);
    process.exit(1);
});

// Esperar 1 segundo para que el servidor arranque
setTimeout(() => {
    console.error('[TEST MCP] Enviando petición tools/list...');

    const request =
        JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {}
        }) + '\n';

    console.error('[TEST MCP] Request:', request);
    server.stdin.write(request);

    // Esperar respuesta
    setTimeout(() => {
        if (!responseReceived) {
            console.error('[TEST MCP] ❌ No se recibió respuesta del servidor después de 3 segundos');
            console.error('[TEST MCP] Esto indica que el servidor no está procesando peticiones MCP');
        } else {
            console.error('[TEST MCP] ✅ Servidor respondió correctamente');
        }
        server.kill();
        process.exit(responseReceived ? 0 : 1);
    }, 3000);
}, 1000);

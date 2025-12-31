#!/usr/bin/env node

/*
 * Script de diagnóstico para probar tools/call en el servidor MCP
 */

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.error('[TEST PING] Iniciando test de tools/call...');

const serverPath = resolve(__dirname, 'dist', 'index.js');

const env = {
    ...process.env,
    GLORY_API_URL: process.env.GLORY_API_URL || 'https://task.nakomi.studio/wp-json/glory/v1',
    GLORY_AUTH_TOKEN: process.env.GLORY_AUTH_TOKEN
};

const server = spawn('node', [serverPath], {
    env,
    stdio: ['pipe', 'pipe', 'pipe']
});

let responseCount = 0;

server.stdout.on('data', data => {
    console.error(`[TEST PING] STDOUT #${++responseCount}:`, data.toString());
});

server.stderr.on('data', data => {
    console.error('[TEST PING] STDERR:', data.toString());
});

server.on('error', error => {
    console.error('[TEST PING] ERROR:', error.message);
    process.exit(1);
});

/* El protocolo MCP requiere inicialización primero */
setTimeout(() => {
    console.error('[TEST PING] Enviando initialize...');

    const initRequest =
        JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: {
                    name: 'test-client',
                    version: '1.0.0'
                }
            }
        }) + '\n';

    server.stdin.write(initRequest);

    /* Esperar respuesta de initialize y enviar initialized */
    setTimeout(() => {
        console.error('[TEST PING] Enviando initialized notification...');

        const initializedNotification =
            JSON.stringify({
                jsonrpc: '2.0',
                method: 'notifications/initialized',
                params: {}
            }) + '\n';

        server.stdin.write(initializedNotification);

        /* Ahora llamar a la herramienta ping */
        setTimeout(() => {
            console.error('[TEST PING] Enviando tools/call ping...');

            const callRequest =
                JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: {
                        name: 'ping',
                        arguments: {}
                    }
                }) + '\n';

            server.stdin.write(callRequest);

            /* Dar tiempo para la respuesta */
            setTimeout(() => {
                console.error('[TEST PING] Finalizando...');
                server.kill();
                process.exit(0);
            }, 3000);
        }, 500);
    }, 1000);
}, 500);

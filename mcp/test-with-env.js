#!/usr/bin/env node

/**
 * Prueba del servidor MCP con variables de entorno como lo haría Antigravity
 */

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mcpPath = resolve(__dirname, 'dist', 'index.js');

console.log('🧪 Probando MCP Server con variables de entorno (simulando Antigravity)...\n');

// Iniciar el servidor MCP con las MISMAS variables que Antigravity
const mcp = spawn('node', [mcpPath], {
    env: {
        ...process.env,
        GLORY_API_URL: 'http://glorybuilder.local/wp-json/glory/v1',
        GLORY_WP_USERNAME: 'admin',
        GLORY_WP_PASSWORD: 'jRZ29zhBWOdOBqcdge0FPIJE'
    },
    stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';
let requestId = 1;
let hasError = false;

function sendRequest(method, params = {}) {
    const request = {
        jsonrpc: '2.0',
        id: requestId++,
        method: method,
        params: params
    };

    console.log(`📤 [${new Date().toISOString()}] Enviando: ${method}`);
    if (Object.keys(params).length > 0) {
        console.log(`   Parámetros:`, JSON.stringify(params, null, 2));
    }
    mcp.stdin.write(JSON.stringify(request) + '\n');
}

mcp.stdout.on('data', data => {
    responseBuffer += data.toString();

    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || '';

    lines.forEach(line => {
        if (line.trim()) {
            try {
                const response = JSON.parse(line);
                console.log(`📥 [${new Date().toISOString()}] Respuesta:`, JSON.stringify(response, null, 2));

                // Detectar errores
                if (response.error) {
                    console.error(`❌ ERROR DETECTADO:`, response.error);
                    hasError = true;
                }
            } catch (e) {
                console.log(`⚠️  Output no JSON:`, line);
            }
        }
    });
});

mcp.stderr.on('data', data => {
    const errorMsg = data.toString();
    console.error(`❌ [STDERR]:`, errorMsg);
    hasError = true;
});

mcp.on('close', code => {
    console.log(`\n🏁 Servidor terminado con código ${code}`);
    if (hasError) {
        console.error('\n❌ Se detectaron errores durante la ejecución');
        process.exit(1);
    } else {
        console.log('\n✅ Todas las pruebas completadas sin errores');
        process.exit(0);
    }
});

mcp.on('error', error => {
    console.error(`❌ Error al iniciar el servidor:`, error);
    hasError = true;
});

// Secuencia de pruebas
setTimeout(() => {
    console.log('\n=== TEST 1: Inicializar ===\n');
    sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
            name: 'antigravity-simulator',
            version: '1.0.0'
        }
    });
}, 500);

setTimeout(() => {
    console.log('\n=== TEST 2: Listar herramientas ===\n');
    sendRequest('tools/list');
}, 1500);

setTimeout(() => {
    console.log('\n=== TEST 3: Obtener tareas (LA QUE FALLA) ===\n');
    sendRequest('tools/call', {
        name: 'obtener_tareas',
        arguments: {filtro: 'todas'}
    });
}, 2500);

setTimeout(() => {
    console.log('\n=== TEST 4: Resumen dashboard ===\n');
    sendRequest('tools/call', {
        name: 'resumen_dashboard',
        arguments: {}
    });
}, 4000);

setTimeout(() => {
    console.log('\n=== TEST 5: Crear tarea ===\n');
    sendRequest('tools/call', {
        name: 'crear_tarea',
        arguments: {
            texto: 'Tarea de prueba MCP'
        }
    });
}, 5500);

// Terminar después de las pruebas
setTimeout(() => {
    console.log('\n⏱️  Tiempo agotado, cerrando servidor...\n');
    mcp.kill();
}, 8000);

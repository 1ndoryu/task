#!/usr/bin/env node

/**
 * Prueba directa de la API sin pasar por MCP
 * Para diagnosticar problemas de conexión
 */

import {readFileSync} from 'fs';
import {resolve} from 'path';

// Cargar variables de entorno manualmente
try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').trim();
            if (key && value && !process.env[key.trim()]) {
                process.env[key.trim()] = value;
            }
        }
    });
} catch (error) {
    console.error('Error cargando .env:', error.message);
}

const apiUrl = process.env.GLORY_API_URL || 'http://glorybuilder.local/wp-json/glory/v1';
const username = process.env.GLORY_WP_USERNAME || 'admin';
const password = process.env.GLORY_WP_PASSWORD || '';

console.log('🔧 Configuración detectada:');
console.log(`   API URL: ${apiUrl}`);
console.log(`   Username: ${username}`);
console.log(`   Password: ${password ? '***configurado***' : '⚠️  NO CONFIGURADO'}`);
console.log('');

// Crear token de autorización
const authToken = Buffer.from(`${username}:${password}`).toString('base64');

console.log('🧪 Probando conexión directa con la API...\n');

// Test 1: Obtener dashboard
console.log('=== TEST 1: GET /dashboard ===');
fetch(`${apiUrl}/dashboard`, {
    method: 'GET',
    headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json'
    }
})
    .then(response => {
        console.log(`Status: ${response.status} ${response.statusText}`);
        return response.json();
    })
    .then(data => {
        console.log('✅ Respuesta recibida:');
        console.log(JSON.stringify(data, null, 2));
        console.log('');

        if (data.success && data.data) {
            console.log('📊 Resumen:');
            console.log(`   Tareas: ${data.data.tareas?.length || 0}`);
            console.log(`   Proyectos: ${data.data.proyectos?.length || 0}`);
            console.log(`   Hábitos: ${data.data.habitos?.length || 0}`);
        }
    })
    .catch(error => {
        console.error('❌ Error en la petición:');
        console.error(error);
    })
    .finally(() => {
        console.log('\n✅ Prueba completada');
    });

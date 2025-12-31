#!/usr/bin/env node

/**
 * Script de diagnóstico de variables de entorno
 * Muestra qué variables está recibiendo el servidor MCP
 */

console.log('🔍 DIAGNÓSTICO DE VARIABLES DE ENTORNO');
console.log('=====================================\n');

console.log('Variables relacionadas con Glory:');
console.log('----------------------------------');
console.log(`GLORY_API_URL: ${process.env.GLORY_API_URL || '❌ NO CONFIGURADA'}`);
console.log(`GLORY_WP_USERNAME: ${process.env.GLORY_WP_USERNAME || '❌ NO CONFIGURADA'}`);
console.log(`GLORY_WP_PASSWORD: ${process.env.GLORY_WP_PASSWORD ? '✅ ***configurada***' : '❌ NO CONFIGURADA'}`);
console.log(`GLORY_AUTH_TOKEN: ${process.env.GLORY_AUTH_TOKEN ? '✅ ***configurado***' : '❌ NO CONFIGURADO'}`);
console.log('');

console.log('Todas las variables de entorno del proceso:');
console.log('-------------------------------------------');
const gloryVars = Object.keys(process.env).filter(key => key.startsWith('GLORY_'));
if (gloryVars.length > 0) {
    gloryVars.forEach(key => {
        const value = process.env[key];
        const display = key.includes('PASSWORD') || key.includes('TOKEN') ? '***oculto***' : value;
        console.log(`${key} = ${display}`);
    });
} else {
    console.log('❌ No se encontraron variables GLORY_* en el entorno del proceso');
}

console.log('\n✅ Diagnóstico completado');

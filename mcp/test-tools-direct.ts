/**
 * Prueba directa de las herramientas del MCP
 * Ejecuta las funciones sin pasar por el protocolo STDIO
 */

import {handleObtenerTareas} from './src/tools/tareas.js';
import {handleResumenDashboard} from './src/tools/dashboard.js';

console.log('🧪 Probando herramientas del MCP directamente...\n');

// Test 1: obtener_tareas
console.log('=== TEST 1: obtener_tareas ===');
try {
    const resultado = await handleObtenerTareas({filtro: 'todas'});
    console.log('✅ Resultado:');
    console.log(resultado);
    console.log('');
} catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
    }
    console.log('');
}

// Test 2: resumen_dashboard
console.log('=== TEST 2: resumen_dashboard ===');
try {
    const resultado = await handleResumenDashboard();
    console.log('✅ Resultado:');
    console.log(resultado);
    console.log('');
} catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
    }
    console.log('');
}

console.log('✅ Pruebas completadas');
process.exit(0);

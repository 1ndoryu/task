/**
 * Carga de variables de entorno
 * Este módulo debe ser importado PRIMERO en todos los scripts
 */

import {readFileSync} from 'fs';
import {resolve} from 'path';

/**
 * Carga el archivo .env de forma silenciosa
 * Las variables del proceso tienen prioridad sobre las del .env
 */
function cargarEnv() {
    try {
        const envPath = resolve(process.cwd(), '.env');
        const envContent = readFileSync(envPath, 'utf8');
        
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                const value = valueParts.join('=').trim();
                
                /* Solo establecer si NO existe en process.env (prioridad al proceso/cliente) */
                if (key && value && !process.env[key.trim()]) {
                    process.env[key.trim()] = value;
                }
            }
        });
    } catch (error) {
        /* Si no existe .env o hay error, continuar sin problema */
    }
}

/* Ejecutar inmediatamente al importar este módulo */
cargarEnv();

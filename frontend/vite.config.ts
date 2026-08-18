import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/* [correccion de rumbo 18-08-2026] El frontend es el ORIGINAL de WordPress
 * (Glory/assets/react -> src/glory-core + App/React -> src/app), servido como
 * SPA por el backend Rust. Los alias replican los del proyecto original. */

/* Stubs para modulos externos (Tauri/Capacitor legacy) que solo existen en
 * plataformas nativas; en web se resuelven como objetos vacios. */
const MODULOS_EXTERNOS = [
    '@capacitor/local-notifications',
    '@tauri-apps/plugin-notification',
    '@tauri-apps/plugin-fs',
    '@tauri-apps/plugin-shell',
    '@tauri-apps/api/app',
];

function pluginModulosExternos(): Plugin {
    return {
        name: 'glory-external-stubs',
        enforce: 'pre',
        resolveId(id) {
            if (MODULOS_EXTERNOS.some(m => id === m || id.startsWith(m + '/'))) {
                return '\0external:' + id;
            }
            return null;
        },
        load(id) {
            if (id.startsWith('\0external:')) {
                return 'export default {};';
            }
            return null;
        },
    };
}

/* [18-08-2026] Proxy configurable por env: el repo convive con otros proyectos
 * en la misma maquina (WANDORIUS usa :3000/:5173). Con VITE_API_PROXY_TARGET
 * y --port se levanta un stack aislado sin pisar a otros agentes. */
const PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000';

/* [18-08-2026] Host por defecto 127.0.0.1: aisla las cookies de sesion de
 * otras apps que corren en el MISMO host 'localhost' (WANDORIUS usa :5173).
 * Las cookies host-only se comparten entre puertos del mismo host, asi que
 * una app hermana puede pisar session_id/csrf_token. Con 127.0.0.1 el alcance
 * es distinto y no hay colision. */
const VITE_HOST = process.env.VITE_HOST || '127.0.0.1';

export default defineConfig({
    plugins: [pluginModulosExternos(), react()],
    base: './',
    server: {
        host: VITE_HOST,
        port: Number(process.env.VITE_PORT) || 5173,
        strictPort: true,
        /* Proxy API requests al backend Rust en desarrollo */
        proxy: {
            '/api': {
                target: PROXY_TARGET,
                changeOrigin: true,
            },
            '/swagger-ui': {
                target: PROXY_TARGET,
                changeOrigin: true,
            },
            '/api-docs': {
                target: PROXY_TARGET,
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/glory-core'),
            '@app': resolve(__dirname, 'src/app'),
            '@codetrix-studio/capacitor-google-auth': resolve(__dirname, 'src/native-stubs/capacitor-google-auth.ts'),
        },
        /* Asegurar que los modulos se resuelvan desde node_modules de frontend */
        dedupe: ['react', 'react-dom', 'lucide-react', 'framer-motion', 'zustand', '@editorjs/editorjs', '@editorjs/header', '@editorjs/paragraph', '@editorjs/list', '@editorjs/quote', '@editorjs/delimiter', '@editorjs/image', '@editorjs/embed', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
    },
});

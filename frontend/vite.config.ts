import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Front nuevo de TASKS: solo tareas + hábitos.
 * El backend Rust sirve `frontend/dist` (FRONTEND_DIST) en build; en dev Vite
 * proxya `/api` al backend para compartir la cookie de sesión del mismo origen
 * (127.0.0.1:4190, el puerto del .env del proyecto). */
const OBJETIVO_API = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4190';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.VITE_PORT) || 4191,
    strictPort: true,
    proxy: {
      '/api': { target: OBJETIVO_API, changeOrigin: true },
    },
  },
});

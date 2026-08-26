/*
 * plugins/exp/index.ts
 * Registro del plugin EXP + re-exportaciones. Importar UNA vez al inicio
 * (después de inicializarPaneles) como side-effect: registrarPlugin y
 * registrarPanel. El panel `exp` es FIJO (no entra en columnas del grid); se
 * renderiza desde DashboardIsland cuando el plugin está activo.
 */

import {createElement} from 'react';
import {Heart} from 'lucide-react';
import {registrarPlugin} from '../../config/registroPlugins';

export {useExpStore} from './store';
export {useExpPlugin} from './useExpPlugin';
export {PanelExp} from './PanelExp';
export {ConfigExp} from './ConfigExp';
export * from './types';
export * from './logica';
import './PanelExp.css';
import './ConfigExp.css';

registrarPlugin({
    id: 'exp',
    nombre: 'EXP y Vida',
    descripcion: 'Gamificación: barra de vida, EXP por dificultad×importancia y dificultad automática por IA',
    icono: createElement(Heart, {size: 18}),
    version: '1.0.0',
    /* El panel EXP es fijo superior: no tiene id en el grid, por eso panelesIds
     * vacío (el toggle no intenta mostrar/ocultar columnas). */
    panelesIds: [],
    requiereConfiguracion: true
});

export {};

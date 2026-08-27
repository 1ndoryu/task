/*
 * plugins/exp/index.ts
 * Registro del plugin EXP + re-exportaciones. Importar UNA vez al inicio
 * (después de inicializarPaneles) como side-effect: registrarPlugin y
 * registrarPanel. El panel `exp` es un panel REAL registrado en el grid
 * (como ayuno/deficit-calorico): aparece en el SidebarMenu, en la grilla
 * sidebar y en el grid cuando el plugin está activo (panelesIds lo enlaza
 * con el toggle del plugin).
 */

import {createElement} from 'react';
import type {ComponentType} from 'react';
import {Heart} from 'lucide-react';
import {registrarPlugin} from '../../config/registroPlugins';
import {registrarPanel} from '../../config/registroPaneles';
import type {PanelBaseProps} from '../../types/paneles';
import {PanelExp} from './PanelExp';

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
    /* El toggle del plugin muestra/oculta el panel `exp` del grid (mismo
     * patrón que ayuno/deficit-calorico). */
    panelesIds: ['exp'],
    requiereConfiguracion: true
});

/* Registrar el panel del plugin EXP como panel real. `exp` arranca en la
 * columna 1 arriba (posición 0). Es un default; con `visiblePorDefecto: false`
 * solo aparece al activar el plugin y queda ordenado por inserción tras
 * normalizarPosiciones (hoy: justo debajo de ejecución). */
registrarPanel({
    id: 'exp',
    titulo: 'Game',
    tituloMovil: 'Game',
    icono: createElement(Heart, {size: 14}),
    visiblePorDefecto: false,
    alturaDefecto: 'auto',
    posicionDefecto: {1: {columna: 1, posicion: 0}, 2: {columna: 1, posicion: 0}, 3: {columna: 1, posicion: 0}},
    componente: PanelExp as ComponentType<PanelBaseProps>,
    enNavegacionMovil: false,
    idPaginaMovil: 'exp',
    manejaAlturaPropia: false
});

export {};

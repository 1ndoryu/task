/*
 * plugins/agente/index.ts
 * UNICO plugin de IA del dashboard. Reemplaza al legacy `ia-asistente`/`PanelIA`:
 * conserva los ids estables `ia-asistente` (plugin) y `ia` (panel) para no romper
 * el estado de grid/localStorage de los usuarios que ya lo tenían activado, pero
 * renderiza el panel moderno (tabs de conversaciones persistidas + streaming SSE).
 *
 * Importar UNA vez como side-effect. El legacy PanelIA/iaStore ya no se registra
 * como panel del grid (solo sobrevive como helper de acciones JSON del modal de
 * configuración global, ver SeccionConfigIAPanelChat).
 */

import {createElement} from 'react';
import type {ComponentType} from 'react';
import {Bot} from 'lucide-react';
import {registrarPlugin} from '../../config/registroPlugins';
import {registrarPanel} from '../../config/registroPaneles';
import type {PanelBaseProps} from '../../types/paneles';
import {PanelAgente} from './PanelAgente';

export {useAgenteStore, useTabActivaAgente} from './store';
export {PanelAgente} from './PanelAgente';
export * from './service';
import './panelAgente.css';

registrarPlugin({
    id: 'ia-asistente',
    nombre: 'Asistente IA',
    descripcion: 'Asistente con herramientas: crea tareas, hábitos, notas y recordatorios; busca en la web y administra archivos locales',
    icono: createElement(Bot, {size: 18}),
    version: '1.0.0',
    panelesIds: ['ia'],
    habitos: [],
    requiereConfiguracion: false,
});

registrarPanel({
    id: 'ia',
    titulo: 'IA',
    tituloMovil: 'IA',
    icono: createElement(Bot, {size: 14}),
    visiblePorDefecto: false,
    alturaDefecto: '320px',
    posicionDefecto: {1: {columna: 1, posicion: 5}, 2: {columna: 2, posicion: 3}, 3: {columna: 3, posicion: 3}},
    componente: PanelAgente as ComponentType<PanelBaseProps>,
    enNavegacionMovil: false,
    idPaginaMovil: 'ia',
    manejaAlturaPropia: false,
});

export {};

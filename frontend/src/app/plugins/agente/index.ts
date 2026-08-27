/*
 * plugins/agente/index.ts
 * Registro del plugin de agente de IA + re-exportaciones. Importar UNA vez
 * al inicio (después de inicializarPaneles) como side-effect: registrarPlugin
 * y registrarPanel. El panel `agente` es un panel REAL registrado en el grid.
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
    id: 'agente',
    nombre: 'Agente IA',
    descripcion: 'Asistente con herramientas: crea tareas, hábitos, notas y recordatorios; busca en la web y administra archivos locales',
    icono: createElement(Bot, {size: 18}),
    version: '1.0.0',
    panelesIds: ['agente'],
    requiereConfiguracion: false,
});

registrarPanel({
    id: 'agente',
    titulo: 'Agente',
    tituloMovil: 'Agente',
    icono: createElement(Bot, {size: 14}),
    visiblePorDefecto: false,
    alturaDefecto: '320px',
    posicionDefecto: {1: {columna: 1, posicion: 0}, 2: {columna: 1, posicion: 0}, 3: {columna: 1, posicion: 0}},
    componente: PanelAgente as ComponentType<PanelBaseProps>,
    enNavegacionMovil: false,
    idPaginaMovil: 'agente',
    manejaAlturaPropia: false,
});

export {};

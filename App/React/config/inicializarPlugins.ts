/*
 * config/inicializarPlugins.ts
 * Registra todos los plugins disponibles en el sistema
 *
 * IMPORTANTE: Este archivo debe importarse una sola vez al inicio de la aplicación,
 * después de inicializarPaneles.ts
 *
 * Los plugins registran sus paneles y hábitos asociados.
 * La activación real se hace desde el ModalPlugins cuando el usuario lo activa.
 */

import {Timer, Utensils, Users, Bot} from 'lucide-react';
import {createElement} from 'react';
import type {ComponentType} from 'react';
import {registrarPlugin} from './registroPlugins';
import {registrarPanel} from './registroPaneles';
import type {ModoColumnas, PanelBaseProps, PosicionDefectoPanel} from '../types/paneles';

/* Lazy imports de componentes de panel */
import {PanelAyuno} from '../components/paneles/PanelAyuno';
import {PanelDeficitCalorico} from '../components/paneles/PanelDeficitCalorico';
import {PanelGruposFb} from '../components/paneles/PanelGruposFb';
import {PanelIA} from '../components/paneles/PanelIA';

/* Helper para posiciones (reutilizado de inicializarPaneles) */
function crearPosicionDefecto(
    pos1col: [1 | 2 | 3, number],
    pos2col: [1 | 2 | 3, number],
    pos3col: [1 | 2 | 3, number]
): Record<ModoColumnas, PosicionDefectoPanel> {
    return {
        1: {columna: pos1col[0], posicion: pos1col[1]},
        2: {columna: pos2col[0], posicion: pos2col[1]},
        3: {columna: pos3col[0], posicion: pos3col[1]}
    };
}

/*
 * Plugin de Ayuno Intermitente
 * Registra panel visual con temporizador circular
 */
registrarPlugin({
    id: 'ayuno',
    nombre: 'Ayuno Intermitente',
    descripcion: 'Temporizador de ayuno con historial y seguimiento como hábito',
    icono: createElement(Timer, {size: 18}),
    version: '1.0.0',
    panelesIds: ['ayuno'],
    habitos: [
        {
            nombre: 'Ayuno intermitente',
            importancia: 'Media',
            frecuencia: {tipo: 'diario'},
            descripcion: 'Cumplir ventana de ayuno configurada',
            completadoAutomatico: true
        }
    ],
    requiereConfiguracion: false
});

/* Registrar panel del plugin de ayuno */
registrarPanel({
    id: 'ayuno',
    titulo: 'Ayuno',
    tituloMovil: 'Ayuno',
    icono: createElement(Timer, {size: 14}),
    visiblePorDefecto: false,
    alturaDefecto: 'auto',
    posicionDefecto: crearPosicionDefecto([1, 5], [2, 3], [3, 3]),
    componente: PanelAyuno as ComponentType<PanelBaseProps>,
    enNavegacionMovil: false,
    idPaginaMovil: 'ayuno',
    manejaAlturaPropia: false
});

/*
 * Plugin de Déficit Calórico
 * Panel de registro calórico con IA Gemini
 */
registrarPlugin({
    id: 'deficit-calorico',
    nombre: 'Déficit Calórico',
    descripcion: 'Registro de calorías con IA (Gemini) y cálculo de TMB',
    icono: createElement(Utensils, {size: 18}),
    version: '1.0.0',
    panelesIds: ['deficit-calorico'],
    habitos: [
        {
            nombre: 'Registrar alimentación',
            importancia: 'Media',
            frecuencia: {tipo: 'diario'},
            descripcion: 'Registrar comidas del día para calcular balance calórico',
            completadoAutomatico: false
        }
    ],
    requiereConfiguracion: true
});

/* Registrar panel del plugin de déficit calórico */
registrarPanel({
    id: 'deficit-calorico',
    titulo: 'Calorías',
    tituloMovil: 'Calorías',
    icono: createElement(Utensils, {size: 14}),
    visiblePorDefecto: false,
    alturaDefecto: 'auto',
    posicionDefecto: crearPosicionDefecto([1, 6], [2, 4], [3, 4]),
    componente: PanelDeficitCalorico as ComponentType<PanelBaseProps>,
    enNavegacionMovil: false,
    idPaginaMovil: 'deficit-calorico',
    manejaAlturaPropia: false
});

/*
 * [263A-11] Plugin Grupos de Facebook
 * Gestor de grupos detectados por la extensión del navegador
 * Desactivado por defecto — se activa desde la sección Plugins
 */
registrarPlugin({
    id: 'gruposFb',
    nombre: 'Grupos de Facebook',
    descripcion: 'Gestión de grupos de Facebook detectados por la extensión del navegador',
    icono: createElement(Users, {size: 18}),
    version: '1.0.0',
    panelesIds: ['gruposFb'],
    requiereConfiguracion: true
});

/* Registrar panel del plugin de Grupos FB */
registrarPanel({
    id: 'gruposFb',
    titulo: 'Grupos FB',
    tituloMovil: 'Grupos FB',
    icono: createElement(Users, {size: 14}),
    visiblePorDefecto: false,
    alturaDefecto: 'auto',
    posicionDefecto: crearPosicionDefecto([1, 7], [2, 5], [3, 5]),
    componente: PanelGruposFb as ComponentType<PanelBaseProps>,
    enNavegacionMovil: false,
    idPaginaMovil: 'gruposFb',
    manejaAlturaPropia: false
});

/*
 * [014A-6] Plugin Asistente IA
 * Asistente de IA para planificación de tareas/hábitos por lenguaje natural.
 * Desactivado por defecto — se activa desde la sección Plugins.
 * Requiere configuración (API key de Groq).
 */
registrarPlugin({
    id: 'ia-asistente',
    nombre: 'Asistente IA',
    descripcion: 'Planificación de tareas y hábitos por lenguaje natural con IA',
    icono: createElement(Bot, {size: 18}),
    version: '1.0.0',
    panelesIds: ['ia'],
    habitos: [],
    requiereConfiguracion: true
});

/* Registrar panel del plugin de IA */
registrarPanel({
    id: 'ia',
    titulo: 'IA',
    tituloMovil: 'IA',
    icono: createElement(Bot, {size: 14}),
    visiblePorDefecto: false,
    alturaDefecto: '300px',
    posicionDefecto: crearPosicionDefecto([1, 5], [2, 3], [3, 3]),
    componente: PanelIA as ComponentType<PanelBaseProps>,
    enNavegacionMovil: false,
    idPaginaMovil: 'ia',
    manejaAlturaPropia: true
});

/* Export vacío para side-effect */
export {};

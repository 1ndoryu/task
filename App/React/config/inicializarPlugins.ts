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

import {Timer, Utensils} from 'lucide-react';
import {createElement} from 'react';
import {registrarPlugin} from './registroPlugins';
import {registrarPanel} from './registroPaneles';
import type {ModoColumnas, PosicionDefectoPanel} from '../types/paneles';

/* Lazy imports de componentes de panel */
import {PanelAyuno} from '../components/paneles/PanelAyuno';
import {PanelDeficitCalorico} from '../components/paneles/PanelDeficitCalorico';

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
            importancia: 'Media' as any,
            frecuencia: 'diaria' as any,
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
    componente: PanelAyuno as any,
    enNavegacionMovil: false,
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
            importancia: 'Media' as any,
            frecuencia: 'diaria' as any,
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
    componente: PanelDeficitCalorico as any,
    enNavegacionMovil: false,
    manejaAlturaPropia: false
});

/* Export vacío para side-effect */
export {};

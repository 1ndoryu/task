/*
 * config/inicializarPaneles.ts
 * Archivo de inicialización que registra todos los paneles existentes
 *
 * IMPORTANTE: Este archivo debe importarse una sola vez al inicio de la aplicación
 * antes de usar cualquier función del registro de paneles.
 *
 * Cada panel define su propia configuración aquí en lugar de en su archivo
 * para evitar dependencias circulares (componente -> registro -> componente).
 */

import type {ComponentType} from 'react';
import {registrarPanel, marcarRegistroInicializado} from './registroPaneles';
import type {ModoColumnas, PanelBaseProps, PosicionDefectoPanel} from '../types/paneles';

/* Lazy imports para evitar dependencias circulares */
import {PanelFocoPrioritario} from '../components/paneles/PanelFocoPrioritario';
import {PanelProyectos} from '../components/paneles/PanelProyectos';
import {PanelEjecucion} from '../components/paneles/PanelEjecucion';
import {PanelScratchpad} from '../components/paneles/PanelScratchpad';
import {PanelActividad} from '../components/paneles/PanelActividad';

/* Helper para definir posiciones por defecto de forma compacta */
function crearPosicionDefecto(pos1col: [1 | 2 | 3, number], pos2col: [1 | 2 | 3, number], pos3col: [1 | 2 | 3, number]): Record<ModoColumnas, PosicionDefectoPanel> {
    return {
        1: {columna: pos1col[0], posicion: pos1col[1]},
        2: {columna: pos2col[0], posicion: pos2col[1]},
        3: {columna: pos3col[0], posicion: pos3col[1]}
    };
}

/*
 * Panel Ejecucion (Tareas)
 * Siempre primero en todas las configuraciones
 */
registrarPanel({
    id: 'ejecucion',
    titulo: 'Tareas',
    tituloMovil: 'Tareas',
    visiblePorDefecto: true,
    alturaDefecto: 'auto',
    posicionDefecto: crearPosicionDefecto([1, 0], [1, 0], [1, 0]),
    componente: PanelEjecucion as ComponentType<PanelBaseProps>,
    enNavegacionMovil: true,
    idPaginaMovil: 'ejecucion',
    manejaAlturaPropia: false
});

/*
 * Panel Foco Prioritario (Hábitos)
 * Segunda prioridad después de tareas
 */
registrarPanel({
    id: 'focoPrioritario',
    titulo: 'Hábitos',
    tituloMovil: 'Hábitos',
    visiblePorDefecto: true,
    alturaDefecto: 'auto',
    posicionDefecto: crearPosicionDefecto([1, 1], [1, 1], [2, 0]),
    componente: PanelFocoPrioritario as ComponentType<PanelBaseProps>,
    enNavegacionMovil: true,
    idPaginaMovil: 'habitos',
    manejaAlturaPropia: false
});

/*
 * Panel Proyectos
 */
registrarPanel({
    id: 'proyectos',
    titulo: 'Proyectos',
    tituloMovil: 'Proyectos',
    visiblePorDefecto: true,
    alturaDefecto: 'auto',
    posicionDefecto: crearPosicionDefecto([1, 2], [2, 0], [3, 0]),
    componente: PanelProyectos as ComponentType<PanelBaseProps>,
    enNavegacionMovil: true,
    idPaginaMovil: 'proyectos',
    manejaAlturaPropia: false
});

/*
 * Panel Scratchpad
 * Maneja su propia altura internamente
 * Habilitado en navegación móvil como "Notas"
 */
registrarPanel({
    id: 'scratchpad',
    titulo: 'Notas Rápidas',
    tituloMovil: 'Notas',
    visiblePorDefecto: true,
    alturaDefecto: '200px',
    posicionDefecto: crearPosicionDefecto([1, 3], [2, 1], [3, 1]),
    componente: PanelScratchpad as ComponentType<PanelBaseProps>,
    enNavegacionMovil: true,
    idPaginaMovil: 'notas',
    manejaAlturaPropia: true
});

/*
 * Panel Actividad
 * Maneja su propia altura internamente
 * Visible por defecto en Beta para mostrar valor de la herramienta
 */
registrarPanel({
    id: 'actividad',
    titulo: 'Actividad',
    tituloMovil: 'Actividad',
    visiblePorDefecto: true,
    alturaDefecto: '150px',
    posicionDefecto: crearPosicionDefecto([1, 4], [2, 2], [3, 2]),
    componente: PanelActividad as ComponentType<PanelBaseProps>,
    enNavegacionMovil: true,
    idPaginaMovil: 'actividad',
    manejaAlturaPropia: true
});

/* Marcar como inicializado */
marcarRegistroInicializado();

/* Export vacío para forzar que el archivo se ejecute como side-effect */
export {};

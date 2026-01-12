/*
 * useOpcionesPanelMovil
 * Hook que construye las opciones del menú móvil basadas en el panel activo
 * Fase 10.8.3: Menú de Opciones Unificado
 *
 * Retorna las opciones de ordenamiento, filtrado y configuración
 * para mostrar en el botón de 3 puntos del header móvil
 */

import {useMemo} from 'react';
import {ArrowUpDown, Filter, Settings} from 'lucide-react';
import type {GrupoOpciones, OpcionMenu} from '../components/shared/MenuOpcionesPanel';
import type {PaginaMovil} from './usePaginaMovil';

interface OpcionOrden {
    id: string;
    etiqueta: string;
    descripcion?: string;
    icono?: React.ReactNode;
}

interface OpcionFiltro {
    id: string;
    etiqueta: string;
    descripcion?: string;
    icono?: React.ReactNode;
}

interface UseOpcionesPanelMovilParams {
    paginaActiva: PaginaMovil;
    /* Tareas */
    opcionesFiltroTareas?: OpcionFiltro[];
    valorFiltroTareas?: string;
    onCambiarFiltroTareas?: (valor: string) => void;
    opcionesOrdenTareas?: OpcionOrden[];
    modoOrdenTareas?: string;
    onCambiarOrdenTareas?: (modo: string) => void;
    onAbrirConfigTareas?: () => void;
    /* Hábitos */
    opcionesOrdenHabitos?: OpcionOrden[];
    modoOrdenHabitos?: string;
    onCambiarOrdenHabitos?: (modo: string) => void;
    onAbrirConfigHabitos?: () => void;
    /* Proyectos */
    opcionesOrdenProyectos?: OpcionOrden[];
    modoOrdenProyectos?: string;
    onCambiarOrdenProyectos?: (modo: string) => void;
    onAbrirConfigProyectos?: () => void;
    /* Actividad */
    onAbrirConfigActividad?: () => void;
}

interface UseOpcionesPanelMovilResult {
    titulo: string;
    grupos: GrupoOpciones[];
    opciones: OpcionMenu[];
    tieneFiltrosActivos: boolean;
}

const TITULOS_PAGINA: Record<PaginaMovil, string> = {
    ejecucion: 'Opciones de Tareas',
    proyectos: 'Opciones de Proyectos',
    habitos: 'Opciones de Hábitos',
    actividad: 'Opciones de Actividad'
};

export function useOpcionesPanelMovil(params: UseOpcionesPanelMovilParams): UseOpcionesPanelMovilResult {
    const {paginaActiva, opcionesFiltroTareas = [], valorFiltroTareas = 'todas', onCambiarFiltroTareas, opcionesOrdenTareas = [], modoOrdenTareas = '', onCambiarOrdenTareas, onAbrirConfigTareas, opcionesOrdenHabitos = [], modoOrdenHabitos = '', onCambiarOrdenHabitos, onAbrirConfigHabitos, opcionesOrdenProyectos = [], modoOrdenProyectos = '', onCambiarOrdenProyectos, onAbrirConfigProyectos, onAbrirConfigActividad} = params;

    const resultado = useMemo((): UseOpcionesPanelMovilResult => {
        const grupos: GrupoOpciones[] = [];
        const opciones: OpcionMenu[] = [];
        let tieneFiltrosActivos = false;

        switch (paginaActiva) {
            case 'ejecucion': {
                /* Filtros de tareas */
                if (opcionesFiltroTareas.length > 0 && onCambiarFiltroTareas) {
                    grupos.push({
                        titulo: 'Filtrar por',
                        opciones: opcionesFiltroTareas.map(op => ({
                            id: op.id,
                            etiqueta: op.etiqueta,
                            descripcion: op.descripcion,
                            icono: op.icono || <Filter size={14} />,
                            onClick: () => onCambiarFiltroTareas(op.id),
                            activo: valorFiltroTareas === op.id
                        }))
                    });
                    tieneFiltrosActivos = valorFiltroTareas !== 'todas';
                }

                /* Ordenamiento de tareas */
                if (opcionesOrdenTareas.length > 0 && onCambiarOrdenTareas) {
                    grupos.push({
                        titulo: 'Ordenar por',
                        opciones: opcionesOrdenTareas.map(op => ({
                            id: op.id,
                            etiqueta: op.etiqueta,
                            descripcion: op.descripcion,
                            icono: op.icono || <ArrowUpDown size={14} />,
                            onClick: () => onCambiarOrdenTareas(op.id),
                            activo: modoOrdenTareas === op.id
                        }))
                    });
                }

                /* Configuración */
                if (onAbrirConfigTareas) {
                    opciones.push({
                        id: 'config',
                        etiqueta: 'Configuración',
                        icono: <Settings size={14} />,
                        onClick: onAbrirConfigTareas
                    });
                }
                break;
            }

            case 'habitos': {
                /* Ordenamiento de hábitos */
                if (opcionesOrdenHabitos.length > 0 && onCambiarOrdenHabitos) {
                    grupos.push({
                        titulo: 'Ordenar por',
                        opciones: opcionesOrdenHabitos.map(op => ({
                            id: op.id,
                            etiqueta: op.etiqueta,
                            descripcion: op.descripcion,
                            icono: op.icono || <ArrowUpDown size={14} />,
                            onClick: () => onCambiarOrdenHabitos(op.id),
                            activo: modoOrdenHabitos === op.id
                        }))
                    });
                }

                /* Configuración */
                if (onAbrirConfigHabitos) {
                    opciones.push({
                        id: 'config',
                        etiqueta: 'Configuración',
                        icono: <Settings size={14} />,
                        onClick: onAbrirConfigHabitos
                    });
                }
                break;
            }

            case 'proyectos': {
                /* Ordenamiento de proyectos */
                if (opcionesOrdenProyectos.length > 0 && onCambiarOrdenProyectos) {
                    grupos.push({
                        titulo: 'Ordenar por',
                        opciones: opcionesOrdenProyectos.map(op => ({
                            id: op.id,
                            etiqueta: op.etiqueta,
                            descripcion: op.descripcion,
                            icono: op.icono || <ArrowUpDown size={14} />,
                            onClick: () => onCambiarOrdenProyectos(op.id),
                            activo: modoOrdenProyectos === op.id
                        }))
                    });
                }

                /* Configuración */
                if (onAbrirConfigProyectos) {
                    opciones.push({
                        id: 'config',
                        etiqueta: 'Configuración',
                        icono: <Settings size={14} />,
                        onClick: onAbrirConfigProyectos
                    });
                }
                break;
            }

            case 'actividad': {
                /* Solo configuración */
                if (onAbrirConfigActividad) {
                    opciones.push({
                        id: 'config',
                        etiqueta: 'Configuración',
                        icono: <Settings size={14} />,
                        onClick: onAbrirConfigActividad
                    });
                }
                break;
            }
        }

        return {
            titulo: TITULOS_PAGINA[paginaActiva],
            grupos,
            opciones,
            tieneFiltrosActivos
        };
    }, [paginaActiva, opcionesFiltroTareas, valorFiltroTareas, onCambiarFiltroTareas, opcionesOrdenTareas, modoOrdenTareas, onCambiarOrdenTareas, onAbrirConfigTareas, opcionesOrdenHabitos, modoOrdenHabitos, onCambiarOrdenHabitos, onAbrirConfigHabitos, opcionesOrdenProyectos, modoOrdenProyectos, onCambiarOrdenProyectos, onAbrirConfigProyectos, onAbrirConfigActividad]);

    return resultado;
}

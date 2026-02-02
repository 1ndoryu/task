/*
 * useOpcionesPanelMovil
 * Hook que construye las opciones del menú móvil basadas en el panel activo
 * Fase 10.8.3: Menú de Opciones Unificado
 *
 * Refactor OCP - Fase 4: Usa registro de paneles para títulos dinámicos
 * El switch de opciones se mantiene porque cada panel tiene configuración específica
 *
 * TO-DO futuro: Cada panel podría registrar sus propias opciones en el registro
 */

import {useMemo} from 'react';
import {ArrowUpDown, Filter, Settings, FolderOpen, Plus} from 'lucide-react';
import {obtenerTituloPanelMovil, paginaMovilAPanelId} from '../config/registroPaneles';
import type {GrupoOpciones, OpcionMenu} from '../components/shared/MenuOpcionesPanel';
import type {PaginaMovil} from './usePaginaMovil';
import type {ModoOrdenTareas} from './useOrdenarTareas';
import type {ModoOrdenHabitos} from './useOrdenarHabitos';
import type {OrdenamientoProyectos} from './useConfiguracionProyectos';

interface OpcionOrdenTareas {
    id: ModoOrdenTareas;
    etiqueta: string;
    descripcion?: string;
    icono?: React.ReactNode;
}

interface OpcionOrdenHabitos {
    id: ModoOrdenHabitos;
    etiqueta: string;
    descripcion?: string;
    icono?: React.ReactNode;
}

interface OpcionOrdenProyectos {
    id: OrdenamientoProyectos;
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
    opcionesOrdenTareas?: OpcionOrdenTareas[];
    modoOrdenTareas?: ModoOrdenTareas;
    onCambiarOrdenTareas?: (modo: ModoOrdenTareas) => void;
    onAbrirConfigTareas?: () => void;
    /* Hábitos */
    opcionesOrdenHabitos?: OpcionOrdenHabitos[];
    modoOrdenHabitos?: ModoOrdenHabitos;
    onCambiarOrdenHabitos?: (modo: ModoOrdenHabitos) => void;
    onAbrirConfigHabitos?: () => void;
    /* Proyectos */
    opcionesOrdenProyectos?: OpcionOrdenProyectos[];
    modoOrdenProyectos?: OrdenamientoProyectos;
    onCambiarOrdenProyectos?: (modo: OrdenamientoProyectos) => void;
    onAbrirConfigProyectos?: () => void;
    /* Actividad */
    onAbrirConfigActividad?: () => void;
    /* Notas (Scratchpad) */
    onNuevaNota?: () => void;
    onAbrirNotasGuardadas?: () => void;
    onAbrirConfigNotas?: () => void;
}

interface UseOpcionesPanelMovilResult {
    titulo: string;
    grupos: GrupoOpciones[];
    opciones: OpcionMenu[];
    tieneFiltrosActivos: boolean;
}

/*
 * Genera título dinámico desde el registro
 * Formato: "Opciones de [Título del Panel]"
 */
function generarTituloPagina(pagina: PaginaMovil): string {
    const panelId = paginaMovilAPanelId(pagina);
    if (!panelId) return `Opciones de ${pagina}`;
    const tituloPanel = obtenerTituloPanelMovil(panelId);
    return `Opciones de ${tituloPanel}`;
}

export function useOpcionesPanelMovil(params: UseOpcionesPanelMovilParams): UseOpcionesPanelMovilResult {
    const {paginaActiva, opcionesFiltroTareas = [], valorFiltroTareas = 'todas', onCambiarFiltroTareas, opcionesOrdenTareas = [], modoOrdenTareas, onCambiarOrdenTareas, onAbrirConfigTareas, opcionesOrdenHabitos = [], modoOrdenHabitos, onCambiarOrdenHabitos, onAbrirConfigHabitos, opcionesOrdenProyectos = [], modoOrdenProyectos, onCambiarOrdenProyectos, onAbrirConfigProyectos, onAbrirConfigActividad, onNuevaNota, onAbrirNotasGuardadas, onAbrirConfigNotas} = params;

    const resultado = useMemo((): UseOpcionesPanelMovilResult => {
        const grupos: GrupoOpciones[] = [];
        const opciones: OpcionMenu[] = [];
        let tieneFiltrosActivos = false;

        /* Obtener el panelId correspondiente a la página */
        const panelId = paginaMovilAPanelId(paginaActiva) || paginaActiva;

        /*
         * Generar opciones según el panel activo
         * TO-DO: En el futuro cada panel podría registrar sus propias opciones
         */
        switch (panelId) {
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

            case 'focoPrioritario': {
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

            case 'scratchpad': {
                /* Opciones para el panel de notas en móvil */
                if (onNuevaNota) {
                    opciones.push({
                        id: 'nueva-nota',
                        etiqueta: 'Nueva nota',
                        icono: <Plus size={14} />,
                        onClick: onNuevaNota
                    });
                }

                if (onAbrirNotasGuardadas) {
                    opciones.push({
                        id: 'notas-guardadas',
                        etiqueta: 'Ver notas guardadas',
                        icono: <FolderOpen size={14} />,
                        onClick: onAbrirNotasGuardadas
                    });
                }

                if (onAbrirConfigNotas) {
                    opciones.push({
                        id: 'config',
                        etiqueta: 'Configuración',
                        icono: <Settings size={14} />,
                        onClick: onAbrirConfigNotas
                    });
                }
                break;
            }
        }

        return {
            titulo: generarTituloPagina(paginaActiva),
            grupos,
            opciones,
            tieneFiltrosActivos
        };
    }, [paginaActiva, opcionesFiltroTareas, valorFiltroTareas, onCambiarFiltroTareas, opcionesOrdenTareas, modoOrdenTareas, onCambiarOrdenTareas, onAbrirConfigTareas, opcionesOrdenHabitos, modoOrdenHabitos, onCambiarOrdenHabitos, onAbrirConfigHabitos, opcionesOrdenProyectos, modoOrdenProyectos, onCambiarOrdenProyectos, onAbrirConfigProyectos, onAbrirConfigActividad, onNuevaNota, onAbrirNotasGuardadas, onAbrirConfigNotas]);

    return resultado;
}

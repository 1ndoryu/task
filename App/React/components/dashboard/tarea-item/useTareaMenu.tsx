import React, {useCallback, useMemo} from 'react';
import {Settings, Plus, Folder, Flag, X, Zap, Trash2, Share2, Play, Square} from 'lucide-react';
import type {Tarea, TareaHabito, NivelPrioridad, NivelUrgencia, DatosEdicionTarea} from '../../../types/dashboard';
import {MENU_HABITO_IDS, generarOpcionesMenuHabito, extraerImportanciaDeOpcion} from '../../../config/opcionesMenuHabito';
import type {OpcionMenu} from '../../shared/MenuContextual';
import {useMenuContextualConId} from '../../../hooks/useMenuContextualGlobal';
import {useTimeTrackerStore} from '../../../stores/timeTrackerStore';
import {useShallow} from 'zustand/react/shallow';

interface UseTareaMenuProps {
    tarea: Tarea;
    esHabito: boolean;
    onEditar?: (datos: DatosEdicionTarea) => void;
    onEliminar?: () => void;
    onConfigurar?: () => void;
    onCrearNueva?: (parentId: number | undefined, tareaActualId: number) => void;
    onMoverProyecto?: () => void;
    onCompartir?: () => void;

    /* Props para hábitos */
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onToggleHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    onPausarHabito?: (habitoId: number) => void;
    onActualizarHabito?: (habitoId: number, datos: any) => void;
    habitoCompletadoHoy?: boolean;
    habitoPausado?: boolean;
    habitoPospuestoHoy?: boolean;

    /* Props para selección múltiple */
    estaSeleccionada?: boolean;
    cantidadSeleccionadas?: number;
}

export function useTareaMenu({tarea, esHabito, onEditar, onEliminar, onConfigurar, onCrearNueva, onMoverProyecto, onCompartir, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPausarHabito, onActualizarHabito, habitoCompletadoHoy, habitoPausado, habitoPospuestoHoy, estaSeleccionada = false, cantidadSeleccionadas = 0}: UseTareaMenuProps) {
    /* Menú contextual coordinado globalmente */
    const menuContextual = useMenuContextualConId(`tarea-${tarea.id}`);
    const tracker = useTimeTrackerStore(useShallow(s => ({sesionActiva: s.sesionActiva, estado: s.estado, iniciarTracking: s.iniciarTracking, completarTracking: s.completarTracking})));

    const manejarClickDerecho = useCallback(
        (evento: React.MouseEvent) => {
            /* Si esta tarea es parte de una selección múltiple (>1), dejar que el padre maneje el evento (Menú Masivo) */
            if (estaSeleccionada && cantidadSeleccionadas > 1) {
                return;
            }

            evento.preventDefault();
            evento.stopPropagation();
            menuContextual.toggle(evento.clientX, evento.clientY);
        },
        [menuContextual, estaSeleccionada, cantidadSeleccionadas]
    );

    const manejarOpcionMenu = useCallback(
        (opcionId: string) => {
            /* Acciones específicas para hábitos */
            if (esHabito) {
                const tareaHabito = tarea as TareaHabito;

                /* Tracking de tiempo para hábitos */
                if (opcionId === 'iniciar-tracking') {
                    tracker.iniciarTracking(tareaHabito.habitoId, 'habito', tareaHabito.texto);
                    return;
                }
                if (opcionId === 'detener-tracking') {
                    tracker.completarTracking();
                    return;
                }

                switch (opcionId) {
                    case MENU_HABITO_IDS.CONFIGURAR:
                    case MENU_HABITO_IDS.EDITAR:
                        onEditarHabito?.(tareaHabito.habitoId);
                        break;
                    case MENU_HABITO_IDS.TOGGLE:
                        onToggleHabito?.(tareaHabito.habitoId);
                        break;
                    case MENU_HABITO_IDS.POSPONER:
                        onPosponerHabito?.(tareaHabito.habitoId);
                        break;
                    case MENU_HABITO_IDS.PAUSAR:
                        onPausarHabito?.(tareaHabito.habitoId);
                        break;
                    case MENU_HABITO_IDS.ELIMINAR:
                        onEliminarHabito?.(tareaHabito.habitoId);
                        break;
                }
                /* Manejar cambio de importancia */
                const nuevaImportancia = extraerImportanciaDeOpcion(opcionId);
                if (nuevaImportancia) {
                    onActualizarHabito?.(tareaHabito.habitoId, {importancia: nuevaImportancia});
                }
                return;
            }

            /* Acciones para tareas normales */
            if (opcionId === 'iniciar-tracking') {
                tracker.iniciarTracking(tarea.id, 'tarea', tarea.texto);
                return;
            }
            if (opcionId === 'detener-tracking') {
                tracker.completarTracking();
                return;
            }

            if (opcionId === 'eliminar') {
                onEliminar?.();
            } else if (opcionId === 'configurar') {
                onConfigurar?.();
            } else if (opcionId === 'agregar-subtarea') {
                onCrearNueva?.(tarea.id, tarea.id);
            } else if (opcionId === 'sin-prioridad') {
                onEditar?.({prioridad: null});
            } else if (opcionId === 'mover-proyecto') {
                onMoverProyecto?.();
            } else if (opcionId === 'compartir') {
                onCompartir?.();
            } else if (['muy_alta', 'alta', 'media', 'baja'].includes(opcionId)) {
                onEditar?.({
                    prioridad: opcionId as NivelPrioridad
                });
            } else if (['bloqueante', 'urgente', 'normal', 'chill'].includes(opcionId)) {
                onEditar?.({
                    urgencia: opcionId as NivelUrgencia
                });
            }
        },
        [onEliminar, onEditar, onConfigurar, onMoverProyecto, onCompartir, esHabito, tarea, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPausarHabito, onActualizarHabito, tracker]
    );

    /* Detectar si esta tarea/hábito está siendo trackeada */
    const entidadTrackingId = esHabito ? (tarea as TareaHabito).habitoId : tarea.id;
    const estaEnTracking = tracker.sesionActiva?.entidadId === entidadTrackingId && tracker.estado !== 'inactivo';

    /* Opciones del menu contextual */
    const opcionesMenu: OpcionMenu[] = useMemo(() => {
        if (esHabito) return []; // Se generan por separado para hábitos

        /* Opción de tracking dinámica */
        const opcionTracking: OpcionMenu = estaEnTracking
            ? {id: 'detener-tracking', etiqueta: 'Detener tracking', icono: <Square size={12} />, separadorDespues: true}
            : {id: 'iniciar-tracking', etiqueta: 'Iniciar tracking', icono: <Play size={12} />, separadorDespues: true};

        const opciones: OpcionMenu[] = [
            {
                id: 'configurar',
                etiqueta: 'Configurar tarea',
                icono: <Settings size={12} />,
                separadorDespues: false
            },
            {
                id: 'agregar-subtarea',
                etiqueta: 'Agregar subtarea',
                icono: <Plus size={12} />
            },
            opcionTracking,
            /* TO-DO: Habilitar cuando sistema de compartir esté listo
            {
                id: 'compartir',
                etiqueta: 'Compartir tarea',
                icono: <Share2 size={12} />
            },
            */
            {
                id: 'mover-proyecto',
                etiqueta: 'Mover a proyecto',
                icono: <Folder size={12} />,
                separadorDespues: true
            },
            {
                id: 'prioridad-menu',
                etiqueta: 'Prioridad',
                icono: <Flag size={12} />,
                subOpciones: [
                    {
                        id: 'muy_alta',
                        etiqueta: 'Muy Alta',
                        icono: <Flag size={12} color="#dc2626" />
                    },
                    {
                        id: 'alta',
                        etiqueta: 'Alta',
                        icono: <Flag size={12} color="#ef4444" />
                    },
                    {
                        id: 'media',
                        etiqueta: 'Media',
                        icono: <Flag size={12} color="#f59e0b" />
                    },
                    {
                        id: 'baja',
                        etiqueta: 'Baja',
                        icono: <Flag size={12} color="#94a3b8" />
                    },
                    ...(tarea.prioridad
                        ? [
                              {
                                  id: 'sin-prioridad',
                                  etiqueta: 'Sin prioridad',
                                  icono: <X size={12} />,
                                  separadorDespues: false
                              }
                          ]
                        : [])
                ]
            },
            {
                id: 'urgencia-menu',
                etiqueta: 'Urgencia',
                icono: <Zap size={12} />,
                separadorDespues: true,
                subOpciones: [
                    {
                        id: 'bloqueante',
                        etiqueta: 'Bloqueante',
                        icono: <Zap size={12} color="#ef4444" />
                    },
                    {
                        id: 'urgente',
                        etiqueta: 'Urgente',
                        icono: <Zap size={12} color="#f59e0b" />
                    },
                    {
                        id: 'normal',
                        etiqueta: 'Normal',
                        icono: <Zap size={12} color="#94a3b8" />
                    },
                    {
                        id: 'chill',
                        etiqueta: 'Chill',
                        icono: <Zap size={12} color="#3b82f6" />
                    }
                ]
            },
            {
                id: 'eliminar',
                etiqueta: 'Eliminar tarea',
                icono: <Trash2 size={12} />,
                peligroso: true
            }
        ];
        return opciones;
    }, [tarea.prioridad, esHabito, estaEnTracking]);

    /* Opciones para hábitos */
    const opcionesMenuHabito: OpcionMenu[] = useMemo(() => {
        if (!esHabito) {
            return [];
        }

        const opcionesBase = generarOpcionesMenuHabito({
            completadoHoy: habitoCompletadoHoy ?? false,
            estaPausado: habitoPausado ?? false,
            tieneActualizar: !!onActualizarHabito,
            pospuestoHoy: habitoPospuestoHoy ?? false
        });

        const opcionTracking: OpcionMenu = estaEnTracking
            ? {id: 'detener-tracking', etiqueta: 'Detener tracking', icono: <Square size={12} />, separadorDespues: true}
            : {id: 'iniciar-tracking', etiqueta: 'Iniciar tracking', icono: <Play size={12} />, separadorDespues: true};

        const indiceInsercion = Math.max(
            0,
            opcionesBase.findIndex(opcion => opcion.id === MENU_HABITO_IDS.ELIMINAR)
        );

        return [...opcionesBase.slice(0, indiceInsercion), opcionTracking, ...opcionesBase.slice(indiceInsercion)];
    }, [habitoCompletadoHoy, habitoPausado, onActualizarHabito, esHabito, habitoPospuestoHoy, estaEnTracking]);

    return {
        menuContextual,
        manejarClickDerecho,
        manejarOpcionMenu,
        opcionesMenu,
        opcionesMenuHabito
    };
}

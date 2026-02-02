/*
 * TareaItem
 * Componente individual de tarea
 */

import {useState, useCallback, useMemo, useRef, useEffect, type KeyboardEvent, type ChangeEvent} from 'react';
import {useEsMovil} from '../../hooks/useEsMovil';
import {useMenuContextualConId} from '../../hooks/useMenuContextualGlobal';
import {Check, X, Flag, Trash2, Settings, Calendar, Paperclip, FileText, Repeat, Folder, Share2, Users, Zap, Repeat2, MessageCircle, Plus} from 'lucide-react';
import type {Tarea, NivelPrioridad, NivelUrgencia, DatosEdicionTarea, TareaHabito} from '../../types/dashboard';
import {esTareaHabito} from '../../types/dashboard';
import {MenuContextualAdaptivo} from '../shared/MenuContextualAdaptivo';
import type {OpcionMenu} from '../shared/MenuContextual';
import {BadgeInfo, BadgeGroup} from '../shared/BadgeInfo';
import {useCantidadSeleccionadas} from '../../stores/seleccionMultipleStore';
import {AccionesItem} from '../shared/AccionesItem';
import type {VarianteBadge} from '../shared/BadgeInfo';
import {obtenerTextoFechaLimite as obtenerTextoFechaLim, obtenerVarianteFechaLimite as obtenerVarianteFecha, formatearFechaCorta as formatearFecha} from '../../utils/fecha';
import {generarOpcionesMenuHabito, MENU_HABITO_IDS, extraerImportanciaDeOpcion} from '../../config/opcionesMenuHabito';

export interface TareaItemProps {
    tarea: Tarea;
    onToggle?: () => void;
    onEditar?: (datos: DatosEdicionTarea) => void;
    onEliminar?: () => void;
    esSubtarea?: boolean;
    onIndent?: () => void;
    onOutdent?: () => void;
    /* Crear nueva tarea debajo (hereda parentId si es subtarea, tareaActualId para posicion) */
    onCrearNueva?: (parentId: number | undefined, tareaActualId: number) => void;
    /* Abrir panel de configuracion */
    onConfigurar?: () => void;
    /* Nombre del proyecto al que pertenece (opcional) */
    nombreProyecto?: string;
    /* Mostrar solo el icono del proyecto sin texto */
    soloIconoProyecto?: boolean;
    /* Mover tarea a otro proyecto */
    onMoverProyecto?: () => void;
    /* Compartir tarea con companeros */
    onCompartir?: () => void;
    /* Indica si la tarea esta siendo compartida */
    estaCompartida?: boolean;
    /* Contador de mensajes no leídos (para badge) */
    mensajesNoLeidos?: number;
    /* Callbacks específicos para tareas-hábito (Fase 7.6.1) - Sincronizado con TablaHabitos */
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onToggleHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    onPausarHabito?: (habitoId: number) => void;
    onActualizarHabito?: (habitoId: number, datos: any) => void;
    /* Indica si la tarea hábito fue completada hoy (para menú contextual) */
    habitoCompletadoHoy?: boolean;
    /* Indica si el hábito está pausado (para menú contextual) */
    habitoPausado?: boolean;
    /* Indica si la tarea tiene subtareas (para ajustar padding y evitar colisión con el contador) */
    tieneSubtareas?: boolean;
    modoCompacto?: boolean;
    /* Props para selección múltiple (Ctrl+Click) */
    estaSeleccionada?: boolean;
    onSeleccionMultiple?: (tarea: Tarea, evento: React.MouseEvent) => void;
}

/* TO-DO: Eliminar esta interfaz cuando todos los componentes migren al hook global */
export interface MenuContextualEstado {
    visible: boolean;
    x: number;
    y: number;
}

export function TareaItem({tarea, onToggle, onEditar, onEliminar, esSubtarea = false, onIndent, onOutdent, onCrearNueva, onConfigurar, nombreProyecto, soloIconoProyecto = false, onMoverProyecto, onCompartir, estaCompartida = false, mensajesNoLeidos = 0, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPausarHabito, onActualizarHabito, habitoCompletadoHoy = false, habitoPausado = false, tieneSubtareas = false, modoCompacto = false, estaSeleccionada = false, onSeleccionMultiple}: TareaItemProps): JSX.Element {
    const [editando, setEditando] = useState(tarea.texto === '');
    const [textoEditado, setTextoEditado] = useState(tarea.texto);
    const inputRef = useRef<HTMLInputElement>(null);

    /* Detectar viewport móvil para cambiar comportamiento de edición */
    const {esTablet: esMovilOTablet} = useEsMovil();

    /* Detectar si es una tarea-hábito virtual */
    const esHabito = esTareaHabito(tarea);

    /* Menú contextual coordinado globalmente - Solo un menú abierto a la vez */
    const menuContextual = useMenuContextualConId(`tarea-${tarea.id}`);

    useEffect(() => {
        if (editando && inputRef.current) {
            inputRef.current.focus();
            /* Bug fix: No seleccionar todo el texto automaticamente */
            /* Ponemos el cursor al final */
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
        }
    }, [editando]);

    const iniciarEdicion = useCallback(() => {
        /* No permitir edición inline en tareas-hábito */
        if (esHabito) return;
        /* En móvil/tablet: abrir modal de configuración en vez de edición inline */
        if (esMovilOTablet) {
            onConfigurar?.();
            return;
        }
        setTextoEditado(tarea.texto);
        setEditando(true);
    }, [tarea.texto, esHabito, esMovilOTablet, onConfigurar]);

    /* Handler para clicks en el contenido de la tarea */
    const manejarClickContenido = useCallback(
        (evento: React.MouseEvent) => {
            /* Ctrl+Click (Windows/Linux) o Cmd+Click (Mac) = selección múltiple */
            if ((evento.ctrlKey || evento.metaKey) && onSeleccionMultiple) {
                evento.preventDefault();
                evento.stopPropagation();
                onSeleccionMultiple(tarea, evento);
                return;
            }
            /* Click normal = editar */
            iniciarEdicion();
        },
        [iniciarEdicion, onSeleccionMultiple, tarea]
    );

    /* Soporte para long press en móvil (selección múltiple) */
    const longPressTimerRef = useRef<number | null>(null);
    const LONG_PRESS_DURACION = 500; /* ms */

    const manejarPointerDown = useCallback(
        (evento: React.PointerEvent) => {
            /* Solo activar long press en touch (móvil) */
            if (evento.pointerType !== 'touch' || !onSeleccionMultiple) return;

            longPressTimerRef.current = window.setTimeout(() => {
                /* Vibración táctil si está disponible */
                if (navigator.vibrate) navigator.vibrate(50);
                onSeleccionMultiple(tarea, evento as unknown as React.MouseEvent);
            }, LONG_PRESS_DURACION);
        },
        [onSeleccionMultiple, tarea]
    );

    const manejarPointerUp = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const manejarPointerCancel = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const guardarEdicion = useCallback(() => {
        const textoLimpio = textoEditado.trim();
        if (textoLimpio.length === 0) {
            cancelarEdicion();
            return;
        }

        if (textoLimpio !== tarea.texto) {
            onEditar?.({texto: textoLimpio});
        }
        setEditando(false);
    }, [textoEditado, tarea.texto, onEditar]);

    const cancelarEdicion = useCallback(() => {
        setTextoEditado(tarea.texto);
        setEditando(false);
    }, [tarea.texto]);

    const manejarTecla = useCallback(
        (evento: KeyboardEvent<HTMLInputElement>) => {
            if (evento.key === 'Enter') {
                evento.preventDefault();
                const textoLimpio = textoEditado.trim();
                /* Solo crear nueva tarea si la actual tiene texto válido */
                if (textoLimpio.length > 0) {
                    guardarEdicion();
                    /* Crear nueva tarea debajo, heredando parentId si es subtarea */
                    onCrearNueva?.(tarea.parentId, tarea.id);
                }
            } else if (evento.key === 'Backspace' && textoEditado === '') {
                evento.preventDefault();
                onEliminar?.();
            } else if (evento.key === 'Escape') {
                cancelarEdicion();
            } else if (evento.key === 'Tab') {
                /*
                 * Soporte para identacion/desidentacion (subtareas)
                 */
                evento.preventDefault();

                if (evento.shiftKey) {
                    /* Shift+Tab: Convertir en tarea principal (outdent) */
                    onOutdent?.();
                } else {
                    /* Tab: Convertir en subtarea (indent) */
                    onIndent?.();
                }
            }
        },
        [guardarEdicion, cancelarEdicion, onIndent, onOutdent, onCrearNueva, tarea.parentId, tarea.id]
    );

    /* Manejo del menu contextual - Usa sistema global para coordinar cierres */
    const cantidadSeleccionadas = useCantidadSeleccionadas();

    const manejarClickDerecho = useCallback(
        (evento: React.MouseEvent) => {
            /* Si esta tarea es parte de una selección múltiple (>1), dejar que el padre maneje el evento (Menú Masivo) */
            if (estaSeleccionada && cantidadSeleccionadas > 1) {
                return;
            }

            evento.preventDefault();
            evento.stopPropagation();
            /* toggle: si el menú de esta tarea ya está abierto, lo cierra; si no, lo abre (cerrando cualquier otro) */
            menuContextual.toggle(evento.clientX, evento.clientY);
        },
        [menuContextual, estaSeleccionada, cantidadSeleccionadas]
    );

    const manejarOpcionMenu = useCallback(
        (opcionId: string) => {
            /* Acciones específicas para hábitos - Sincronizado con TablaHabitos */
            if (esHabito) {
                const tareaHabito = tarea as TareaHabito;
                switch (opcionId) {
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
        [onEliminar, onEditar, onConfigurar, onMoverProyecto, onCompartir, esHabito, tarea, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPausarHabito, onActualizarHabito]
    );

    /* Opciones del menu contextual */
    const opcionesMenu: OpcionMenu[] = [
        {
            id: 'configurar',
            etiqueta: 'Configurar tarea',
            icono: <Settings size={12} />,
            separadorDespues: false
        },
        {
            id: 'agregar-subtarea',
            etiqueta: 'Agregar subtarea',
            icono: <Plus size={12} />,
            separadorDespues: true
        },
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
        }
    ];

    /* Agregar opcion de eliminar al final */
    opcionesMenu.push({
        id: 'eliminar',
        etiqueta: 'Eliminar tarea',
        icono: <Trash2 size={12} />,
        peligroso: true
    });

    /* Opciones de menú contextual para hábitos - Usando configuración centralizada */
    const opcionesMenuHabito = useMemo(
        () =>
            generarOpcionesMenuHabito({
                completadoHoy: habitoCompletadoHoy,
                estaPausado: habitoPausado,
                tieneActualizar: !!onActualizarHabito
            }),
        [habitoCompletadoHoy, habitoPausado, onActualizarHabito]
    );

    /* Renderizado del indicador de prioridad como badge (unificado con habitos) */
    const renderIndicadorPrioridad = () => {
        /* Para hábitos, usar la importancia original si es Muy Alta */
        if (esHabito) {
            const importaciaHabito = (tarea as TareaHabito).habitoImportancia;
            if (importaciaHabito === 'Muy Alta') {
                return <BadgeInfo tipo="prioridad" texto="MUY ALTA" variante="prioridadMuyAlta" />;
            }
        }

        if (!tarea.prioridad) return null;

        const obtenerVariantePrioridad = (prioridad: NivelPrioridad): VarianteBadge => {
            switch (prioridad) {
                case 'muy_alta':
                    return 'prioridadMuyAlta';
                case 'alta':
                    return 'prioridadAlta';
                case 'media':
                    return 'prioridadMedia';
                case 'baja':
                    return 'prioridadBaja';
            }
        };

        return <BadgeInfo tipo="prioridad" texto={tarea.prioridad.toUpperCase().replace('_', ' ')} variante={obtenerVariantePrioridad(tarea.prioridad)} />;
    };

    /* Renderizado del indicador de urgencia (solo si no es 'normal') */
    const renderIndicadorUrgencia = () => {
        /* No mostrar badge si es 'normal' (valor por defecto) o no tiene urgencia */
        if (!tarea.urgencia || tarea.urgencia === 'normal') return null;

        const obtenerVarianteUrgencia = (urgencia: NivelUrgencia): VarianteBadge => {
            switch (urgencia) {
                case 'bloqueante':
                    return 'urgenciaBloqueante';
                case 'urgente':
                    return 'urgenciaUrgente';
                case 'chill':
                    return 'urgenciaChill';
                default:
                    return 'normal';
            }
        };

        return <BadgeInfo tipo="personalizado" icono={<Zap size={10} />} texto={tarea.urgencia.toUpperCase()} variante={obtenerVarianteUrgencia(tarea.urgencia)} titulo={`Urgencia: ${tarea.urgencia}`} />;
    };

    /* Renderizado del indicador de fecha limite (usando funciones centralizadas) */
    const renderIndicadorFecha = () => {
        const fechaMaxima = tarea.configuracion?.fechaMaxima;
        if (!fechaMaxima) return null;

        const textoFecha = obtenerTextoFechaLim(fechaMaxima);
        const variante = obtenerVarianteFecha(fechaMaxima);

        return <BadgeInfo tipo="fecha" icono={<Calendar size={10} />} texto={textoFecha} titulo={`Fecha limite: ${formatearFecha(fechaMaxima)}`} variante={variante} onClick={onConfigurar} />;
    };

    /* Renderizado del badge de adjuntos */
    const renderBadgeAdjuntos = () => {
        const adjuntos = tarea.configuracion?.adjuntos;
        if (!adjuntos || adjuntos.length === 0) return null;

        return <BadgeInfo tipo="adjunto" icono={<Paperclip size={10} />} texto={adjuntos.length.toString()} titulo={`${adjuntos.length} archivo${adjuntos.length > 1 ? 's' : ''} adjunto${adjuntos.length > 1 ? 's' : ''}`} onClick={onConfigurar} />;
    };

    /* Renderizado del badge de descripcion */
    const renderBadgeDescripcion = () => {
        const descripcion = tarea.configuracion?.descripcion;
        if (!descripcion || descripcion.trim().length === 0) return null;

        return <BadgeInfo tipo="descripcion" icono={<FileText size={10} />} titulo="Tiene descripcion" onClick={onConfigurar} />;
    };

    /* Renderizado del badge de repeticion */
    const renderBadgeRepeticion = () => {
        const repeticion = tarea.configuracion?.repeticion;
        if (!repeticion) return null;

        const textoIntervalo = repeticion.intervalo === 1 ? 'diaria' : `cada ${repeticion.intervalo} dias`;

        return <BadgeInfo tipo="repeticion" icono={<Repeat size={10} />} titulo={`Repeticion ${textoIntervalo}`} onClick={onConfigurar} />;
    };

    /* Renderizado del badge de asignacion */
    const renderBadgeAsignado = () => {
        if (!tarea.asignadoA || !tarea.asignadoANombre) return null;

        return (
            <span className="badgeAsignado" title={`Asignado a: ${tarea.asignadoANombre}`}>
                {tarea.asignadoAAvatar && <img src={tarea.asignadoAAvatar} alt={tarea.asignadoANombre} />}
                <span className="badgeAsignadoNombre">{tarea.asignadoANombre}</span>
            </span>
        );
    };

    /* Renderizado del badge de propietario (cuando es tarea compartida de otro usuario) */
    const renderBadgePropietario = () => {
        if (!tarea.esCompartido || !tarea.propietarioNombre) return null;

        return (
            <span className="badgePropietario" title={`De: ${tarea.propietarioNombre}`}>
                {tarea.propietarioAvatar && <img src={tarea.propietarioAvatar} alt={tarea.propietarioNombre} className="badgePropietarioAvatar" />}
                <span className="badgePropietarioNombre">{tarea.propietarioNombre}</span>
            </span>
        );
    };

    /* Renderizado del badge de hábito (para tareas-hábito virtuales) */
    const renderBadgeHabito = () => {
        if (!esTareaHabito(tarea)) return null;

        const textoRacha = tarea.habitoRacha > 0 ? `${tarea.habitoRacha}` : undefined;

        return <BadgeInfo tipo="personalizado" icono={<Repeat2 size={10} />} texto={textoRacha} titulo={`Hábito: ${tarea.habitoNombre}${tarea.habitoRacha > 0 ? ` (racha: ${tarea.habitoRacha})` : ''}`} variante="habito" />;
    };

    /* Renderizado del badge de mensajes no leídos */
    const renderBadgeMensajesNoLeidos = () => {
        if (mensajesNoLeidos <= 0) return null;

        const texto = mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos.toString();
        const titulo = mensajesNoLeidos === 1 ? '1 mensaje sin leer' : `${mensajesNoLeidos} mensajes sin leer`;

        return <BadgeInfo tipo="personalizado" icono={<MessageCircle size={10} />} texto={texto} titulo={titulo} variante="mensajeNoLeido" onClick={onConfigurar} />;
    };

    if (editando) {
        return (
            <div className={`tareaItem tareaItemEditando ${esSubtarea ? 'tareaItemSubtarea' : ''} ${modoCompacto ? 'tareaItem--compacto' : ''}`}>
                <div className={`tareaCheckbox ${tarea.completado ? 'tareaCheckboxCompletado' : ''}`}>{tarea.completado && <Check size={8} color="white" />}</div>
                <div className="tareaContenido">
                    <input ref={inputRef} type="text" className="tareaEdicionInput" value={textoEditado} onChange={(e: ChangeEvent<HTMLInputElement>) => setTextoEditado(e.target.value)} onKeyDown={manejarTecla} onBlur={guardarEdicion} />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`tareaItem ${esSubtarea ? 'tareaItemSubtarea' : ''} ${tieneSubtareas ? 'tareaItem--conSubtareas' : ''} ${modoCompacto ? 'tareaItem--compacto' : ''} ${estaSeleccionada ? 'tareaItem--seleccionada' : ''}`} onContextMenu={manejarClickDerecho}>
                <div className={`tareaCheckbox ${tarea.completado ? 'tareaCheckboxCompletado' : ''}`} onClick={onToggle} onPointerDown={e => e.stopPropagation()}>
                    {tarea.completado && <Check size={8} color="white" />}
                </div>
                <div className="tareaContenido" onClick={manejarClickContenido} onPointerDown={manejarPointerDown} onPointerUp={manejarPointerUp} onPointerCancel={manejarPointerCancel} onPointerLeave={manejarPointerCancel}>
                    <div className="tareaTextoWrapper">
                        <p className={`tareaTexto ${tarea.completado ? 'tareaTextoCompletado' : ''} ${modoCompacto ? 'tareaTexto--compacto' : ''}`}>{tarea.texto}</p>
                        <BadgeGroup>
                            {renderBadgePropietario()}
                            {renderIndicadorFecha()}
                            {renderBadgeAdjuntos()}
                            {renderBadgeDescripcion()}
                            {renderBadgeRepeticion()}
                            {renderBadgeAsignado()}
                            {estaCompartida && !tarea.esCompartido && <BadgeInfo tipo="personalizado" icono={<Users size={10} />} titulo="Tarea compartida" variante="normal" />}
                            {nombreProyecto && <BadgeInfo tipo="personalizado" icono={<Folder size={10} />} texto={soloIconoProyecto ? undefined : nombreProyecto} titulo={`Proyecto: ${nombreProyecto}`} variante="normal" />}
                            {renderIndicadorPrioridad()}
                            {renderIndicadorUrgencia()}
                            {renderBadgeHabito()}
                            {renderBadgeMensajesNoLeidos()}
                        </BadgeGroup>
                    </div>
                </div>

                <div className="tareaAccionesContenedor" onPointerDown={e => e.stopPropagation()}>
                    {!esHabito && <AccionesItem mostrarConfigurar={true} mostrarEliminar={true} onConfigurar={onConfigurar} onEliminar={onEliminar} />}
                    {esHabito && onEditarHabito && <AccionesItem mostrarConfigurar={true} mostrarEliminar={!!onEliminarHabito} onConfigurar={() => onEditarHabito((tarea as TareaHabito).habitoId)} onEliminar={onEliminarHabito ? () => onEliminarHabito((tarea as TareaHabito).habitoId) : undefined} />}
                </div>
            </div>

            {menuContextual.visible && !esHabito && <MenuContextualAdaptivo opciones={opcionesMenu} posicionX={menuContextual.posicion.x} posicionY={menuContextual.posicion.y} onSeleccionar={manejarOpcionMenu} onCerrar={menuContextual.cerrar} titulo={tarea.texto} />}
            {menuContextual.visible && esHabito && <MenuContextualAdaptivo opciones={opcionesMenuHabito} posicionX={menuContextual.posicion.x} posicionY={menuContextual.posicion.y} onSeleccionar={manejarOpcionMenu} onCerrar={menuContextual.cerrar} titulo={tarea.texto} />}
        </>
    );
}

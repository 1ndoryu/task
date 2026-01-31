/*
 * BottomSheetTarea
 * Bottom Sheet para crear/editar tareas en móvil
 * Diseño compacto y minimalista específico para móvil
 *
 * Características:
 * - Input principal con autofocus
 * - Opciones compactas con iconos (solo mostrar cuando tienen valor)
 * - Botón de crear/guardar destacado
 * - Cierra automáticamente al guardar
 * - Soporta modo edición con tareaExistente
 */

import {useState, useRef, useEffect} from 'react';
import {Send, Calendar, Flag, Hash, Layers, X, Settings} from 'lucide-react';
import {BottomSheet} from '../shared';
import type {Proyecto, Tarea} from '../../types/dashboard';

interface BottomSheetTareaProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosTarea) => Promise<void>;
    proyectos?: Proyecto[];
    valoresIniciales?: {
        proyectoId?: number;
        prioridad?: string;
        urgencia?: string;
    };
    /* Modo edición: si se pasa una tarea, se edita en lugar de crear */
    tareaExistente?: Tarea;
    onAbrirConfiguracion?: () => void;
}

export interface DatosTarea {
    texto: string;
    proyectoId?: number;
    prioridad?: string;
    urgencia?: string;
    fecha?: string;
    /* ID de tarea existente para edición */
    id?: number;
}

export function BottomSheetTarea({estaAbierto, onCerrar, onGuardar, proyectos = [], valoresIniciales = {}, tareaExistente, onAbrirConfiguracion}: BottomSheetTareaProps): JSX.Element | null {
    const esEdicion = !!tareaExistente;
    const [texto, setTexto] = useState(tareaExistente?.texto || '');
    const [proyectoId, setProyectoId] = useState<number | undefined>(tareaExistente?.proyectoId || valoresIniciales.proyectoId);
    const [prioridad, setPrioridad] = useState<string | undefined>(tareaExistente?.prioridad || valoresIniciales.prioridad);
    const [urgencia, setUrgencia] = useState<string | undefined>(tareaExistente?.urgencia || valoresIniciales.urgencia);
    const [fecha, setFecha] = useState<string | undefined>(tareaExistente?.configuracion?.fechaMaxima);
    const [cargando, setCargando] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    /* Autofocus al abrir */
    useEffect(() => {
        if (estaAbierto && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [estaAbierto]);

    /* Reset al cerrar o actualizar cuando cambia la tarea */
    useEffect(() => {
        if (!estaAbierto) {
            setTexto('');
            setProyectoId(valoresIniciales.proyectoId);
            setPrioridad(valoresIniciales.prioridad);
            setUrgencia(valoresIniciales.urgencia);
            setFecha(undefined);
        } else if (tareaExistente) {
            /* Si hay tarea existente, cargar sus valores */
            setTexto(tareaExistente.texto);
            setProyectoId(tareaExistente.proyectoId);
            setPrioridad(tareaExistente.prioridad);
            setUrgencia(tareaExistente.urgencia);
            setFecha(tareaExistente.configuracion?.fechaMaxima);
        }
    }, [estaAbierto, tareaExistente, valoresIniciales]);

    const manejarGuardar = async () => {
        if (!texto.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                texto,
                proyectoId,
                prioridad,
                urgencia,
                fecha,
                id: tareaExistente?.id
            });
            onCerrar();
        } catch (error) {
            console.error('Error al guardar tarea:', error);
        } finally {
            setCargando(false);
        }
    };

    const obtenerNombreProyecto = () => {
        if (!proyectoId) return null;
        const proyecto = proyectos.find(p => p.id === proyectoId);
        return proyecto?.nombre || null;
    };

    const obtenerTextoPrioridad = () => {
        const map: Record<string, string> = {
            baja: 'Baja',
            media: 'Media',
            alta: 'Alta',
            muy_alta: 'Muy Alta'
        };
        return prioridad ? map[prioridad] : null;
    };

    const obtenerTextoUrgencia = () => {
        const map: Record<string, string> = {
            bloqueante: 'Bloqueante',
            urgente: 'Urgente',
            normal: 'Normal',
            chill: 'Chill'
        };
        return urgencia ? map[urgencia] : null;
    };

    if (!estaAbierto) return null;

    return (
        <BottomSheet estaAbierto={estaAbierto} onCerrar={onCerrar}>
            <div className="bottomSheetTarea">
                {/* Input principal */}
                <div className="bottomSheetTarea__inputWrapper">
                    <input ref={inputRef} type="text" value={texto} onChange={e => setTexto(e.target.value)} placeholder="¿Qué necesitas hacer?" className="bottomSheetTarea__input" disabled={cargando} />
                </div>

                {/* Barra de acciones (Opciones + Guardar) */}
                <div className="bottomSheetTarea__acciones">
                    {/* Grupo de opciones (Izquierda) */}
                    <div className="bottomSheetTarea__opcionesGrupo">
                        {/* Proyecto */}
                        {proyectos.length > 0 && (
                            <button
                                type="button"
                                className={`bottomSheetTarea__accion ${proyectoId ? 'bottomSheetTarea__accion--activa' : ''}`}
                                onClick={() => {
                                    /* TO-DO: Abrir modal central con opciones de Proyecto.
                                     * Al seleccionar, mostrar badge debajo del título.
                                     */
                                }}
                                aria-label={obtenerNombreProyecto() || 'Proyecto'}
                                title={obtenerNombreProyecto() || 'Proyecto'}>
                                <Layers size={14} />
                            </button>
                        )}

                        {/* Prioridad */}
                        <button
                            type="button"
                            className={`bottomSheetTarea__accion ${prioridad ? 'bottomSheetTarea__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con opciones de Prioridad.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label={obtenerTextoPrioridad() || 'Prioridad'}
                            title={obtenerTextoPrioridad() || 'Prioridad'}>
                            <Flag size={14} />
                        </button>

                        {/* Urgencia */}
                        <button
                            type="button"
                            className={`bottomSheetTarea__accion ${urgencia ? 'bottomSheetTarea__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con opciones de Urgencia.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label={obtenerTextoUrgencia() || 'Urgencia'}
                            title={obtenerTextoUrgencia() || 'Urgencia'}>
                            <Hash size={14} />
                        </button>

                        {/* Fecha límite */}
                        <button
                            type="button"
                            className={`bottomSheetTarea__accion ${fecha ? 'bottomSheetTarea__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con opciones de Fecha.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label={fecha || 'Fecha'}
                            title={fecha || 'Fecha'}>
                            <Calendar size={14} />
                        </button>

                        {/* Configuración avanzada (solo edición) */}
                        {esEdicion && onAbrirConfiguracion && (
                            <button
                                type="button"
                                className="bottomSheetTarea__accion"
                                onClick={() => {
                                    onAbrirConfiguracion();
                                    onCerrar();
                                }}
                                aria-label="Configuración avanzada"
                                title="Configuración avanzada">
                                <Settings size={14} />
                            </button>
                        )}
                    </div>

                    {/* Botón Guardar (Derecha) */}
                    <button type="button" className="bottomSheetTarea__botonGuardar" onClick={manejarGuardar} disabled={!texto.trim() || cargando} aria-label={esEdicion ? 'Guardar Cambios' : 'Crear Tarea'}>
                        {esEdicion ? <Send size={14} /> : <Send size={14} />}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
}

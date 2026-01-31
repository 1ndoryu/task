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
import {CheckSquare, Calendar, Flag, Hash, Layers, X, Settings} from 'lucide-react';
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
                {/* Cabecera con título y botón cerrar */}
                <div className="bottomSheetTarea__cabecera">
                    <div className="bottomSheetTarea__icono">
                        <CheckSquare size={18} />
                    </div>
                    <h3 className="bottomSheetTarea__titulo">{esEdicion ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
                    {/* En modo edición, mostrar botón para abrir configuración completa */}
                    {esEdicion && onAbrirConfiguracion && (
                        <button
                            type="button"
                            className="bottomSheetTarea__botonConfig"
                            onClick={() => {
                                onAbrirConfiguracion();
                                onCerrar();
                            }}
                            aria-label="Configuración avanzada"
                            title="Configuración avanzada">
                            <Settings size={18} />
                        </button>
                    )}
                    <button type="button" className="bottomSheetTarea__botonCerrar" onClick={onCerrar} aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                {/* Input principal */}
                <div className="bottomSheetTarea__inputWrapper">
                    <input ref={inputRef} type="text" value={texto} onChange={e => setTexto(e.target.value)} placeholder="¿Qué necesitas hacer?" className="bottomSheetTarea__input" disabled={cargando} />
                </div>

                {/* Opciones compactas - Solo mostrar cuando hay valor */}
                <div className="bottomSheetTarea__opciones">
                    {/* Proyecto */}
                    {proyectos.length > 0 && (
                        <button
                            type="button"
                            className={`bottomSheetTarea__opcion ${proyectoId ? 'bottomSheetTarea__opcion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir selector de proyecto
                                 * Implementar BottomSheet secundario con lista de proyectos
                                 * O menu contextual adaptativo para móvil
                                 */
                            }}>
                            <Layers size={16} />
                            <span>{obtenerNombreProyecto() || 'Proyecto'}</span>
                        </button>
                    )}

                    {/* Prioridad */}
                    <button
                        type="button"
                        className={`bottomSheetTarea__opcion ${prioridad ? 'bottomSheetTarea__opcion--activa' : ''}`}
                        onClick={() => {
                            /* TO-DO: Abrir selector de prioridad
                             * Opciones: Baja, Media, Alta, Muy Alta
                             * Implementar como bottom sheet de selección simple
                             */
                        }}>
                        <Flag size={16} />
                        <span>{obtenerTextoPrioridad() || 'Prioridad'}</span>
                    </button>

                    {/* Urgencia */}
                    <button
                        type="button"
                        className={`bottomSheetTarea__opcion ${urgencia ? 'bottomSheetTarea__opcion--activa' : ''}`}
                        onClick={() => {
                            /* TO-DO: Abrir selector de urgencia
                             * Opciones: Baja, Media, Alta
                             * Implementar como bottom sheet de selección simple
                             */
                        }}>
                        <Hash size={16} />
                        <span>{obtenerTextoUrgencia() || 'Urgencia'}</span>
                    </button>

                    {/* Fecha límite */}
                    <button
                        type="button"
                        className={`bottomSheetTarea__opcion ${fecha ? 'bottomSheetTarea__opcion--activa' : ''}`}
                        onClick={() => {
                            /* TO-DO: Abrir selector de fecha
                             * Opciones rápidas: Hoy, Mañana, Esta semana, Selector manual
                             * Considerar usar input type="date" nativo en móvil
                             */
                        }}>
                        <Calendar size={16} />
                        <span>{fecha || 'Fecha'}</span>
                    </button>
                </div>

                {/* Botón de acción */}
                <button type="button" className="bottomSheetTarea__botonCrear" onClick={manejarGuardar} disabled={!texto.trim() || cargando}>
                    {cargando ? (esEdicion ? 'Guardando...' : 'Creando...') : esEdicion ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
            </div>
        </BottomSheet>
    );
}

/*
 * BottomSheetTarea
 * Bottom Sheet para crear/editar tareas en móvil
 * Diseño compacto y minimalista específico para móvil
 * 
 * Características:
 * - Input principal con autofocus
 * - Opciones compactas con iconos (solo mostrar cuando tienen valor)
 * - Botón de crear destacado
 * - Cierra automáticamente al crear
 */

import {useState, useRef, useEffect} from 'react';
import {CheckSquare, Calendar, Flag, Hash, Layers, X} from 'lucide-react';
import {BottomSheet} from '../shared';
import type {Proyecto} from '../../types/dashboard';

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
}

export interface DatosTarea {
    texto: string;
    proyectoId?: number;
    prioridad?: string;
    urgencia?: string;
    fecha?: string;
}

export function BottomSheetTarea({estaAbierto, onCerrar, onGuardar, proyectos = [], valoresIniciales = {}}: BottomSheetTareaProps): JSX.Element | null {
    const [texto, setTexto] = useState('');
    const [proyectoId, setProyectoId] = useState<number | undefined>(valoresIniciales.proyectoId);
    const [prioridad, setPrioridad] = useState<string | undefined>(valoresIniciales.prioridad);
    const [urgencia, setUrgencia] = useState<string | undefined>(valoresIniciales.urgencia);
    const [fecha, setFecha] = useState<string | undefined>();
    const [cargando, setCargando] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    /* Autofocus al abrir */
    useEffect(() => {
        if (estaAbierto && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [estaAbierto]);

    /* Reset al cerrar */
    useEffect(() => {
        if (!estaAbierto) {
            setTexto('');
            setProyectoId(valoresIniciales.proyectoId);
            setPrioridad(valoresIniciales.prioridad);
            setUrgencia(valoresIniciales.urgencia);
            setFecha(undefined);
        }
    }, [estaAbierto, valoresIniciales]);

    const manejarGuardar = async () => {
        if (!texto.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                texto,
                proyectoId,
                prioridad,
                urgencia,
                fecha
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
        return proyecto?.titulo || null;
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
            baja: 'Baja',
            media: 'Media',
            alta: 'Alta'
        };
        return urgencia ? map[urgencia] : null;
    };

    return (
        <BottomSheet estaAbierto={estaAbierto} onCerrar={onCerrar}>
            <div className="bottomSheetTarea">
                {/* Cabecera con título y botón cerrar */}
                <div className="bottomSheetTarea__cabecera">
                    <div className="bottomSheetTarea__icono">
                        <CheckSquare size={18} />
                    </div>
                    <h3 className="bottomSheetTarea__titulo">Nueva Tarea</h3>
                    <button
                        type="button"
                        className="bottomSheetTarea__botonCerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Input principal */}
                <div className="bottomSheetTarea__inputWrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        placeholder="¿Qué necesitas hacer?"
                        className="bottomSheetTarea__input"
                        disabled={cargando}
                    />
                </div>

                {/* Opciones compactas - Solo mostrar cuando hay valor */}
                <div className="bottomSheetTarea__opciones">
                    {/* Proyecto */}
                    {proyectos.length > 0 && (
                        <button
                            type="button"
                            className={`bottomSheetTarea__opcion ${proyectoId ? 'bottomSheetTarea__opcion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir selector de proyecto */
                            }}
                        >
                            <Layers size={16} />
                            <span>{obtenerNombreProyecto() || 'Proyecto'}</span>
                        </button>
                    )}

                    {/* Prioridad */}
                    <button
                        type="button"
                        className={`bottomSheetTarea__opcion ${prioridad ? 'bottomSheetTarea__opcion--activa' : ''}`}
                        onClick={() => {
                            /* TO-DO: Abrir selector de prioridad */
                        }}
                    >
                        <Flag size={16} />
                        <span>{obtenerTextoPrioridad() || 'Prioridad'}</span>
                    </button>

                    {/* Urgencia */}
                    <button
                        type="button"
                        className={`bottomSheetTarea__opcion ${urgencia ? 'bottomSheetTarea__opcion--activa' : ''}`}
                        onClick={() => {
                            /* TO-DO: Abrir selector de urgencia */
                        }}
                    >
                        <Hash size={16} />
                        <span>{obtenerTextoUrgencia() || 'Urgencia'}</span>
                    </button>

                    {/* Fecha límite */}
                    <button
                        type="button"
                        className={`bottomSheetTarea__opcion ${fecha ? 'bottomSheetTarea__opcion--activa' : ''}`}
                        onClick={() => {
                            /* TO-DO: Abrir selector de fecha */
                        }}
                    >
                        <Calendar size={16} />
                        <span>{fecha || 'Fecha'}</span>
                    </button>
                </div>

                {/* Botón de acción */}
                <button
                    type="button"
                    className="bottomSheetTarea__botonCrear"
                    onClick={manejarGuardar}
                    disabled={!texto.trim() || cargando}
                >
                    {cargando ? 'Creando...' : 'Crear Tarea'}
                </button>
            </div>
        </BottomSheet>
    );
}

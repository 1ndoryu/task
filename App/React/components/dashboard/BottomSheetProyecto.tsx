/*
 * BottomSheetProyecto
 * Bottom Sheet para crear proyectos en móvil
 * Diseño idéntico a BottomSheetTarea para consistencia visual
 *
 * Características:
 * - Input principal con autofocus
 * - Barra de acciones con iconos (15px): Icono, Prioridad, Urgencia, Fecha
 * - Botón enviar a la derecha
 * - Cierra automáticamente al crear
 *
 * TO-DO: Los iconos de propiedades deben abrir un modal de selección
 * y mostrar la selección como badge debajo del input
 */

import {useState, useRef, useEffect} from 'react';
import {Send, Layers, Flag, Hash, Calendar} from 'lucide-react';
import {BottomSheet} from '../shared';
import type {NivelPrioridad, NivelUrgencia} from '../../types/dashboard';

interface BottomSheetProyectoProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosProyecto) => Promise<void>;
    valoresIniciales?: {
        prioridad?: NivelPrioridad;
        urgencia?: NivelUrgencia;
    };
}

export interface DatosProyecto {
    nombre: string;
    icono?: string;
    colorIcono?: string;
    prioridad?: NivelPrioridad;
    urgencia?: NivelUrgencia;
    fechaLimite?: string;
}

export function BottomSheetProyecto({estaAbierto, onCerrar, onGuardar, valoresIniciales = {}}: BottomSheetProyectoProps): JSX.Element | null {
    const [nombre, setNombre] = useState('');
    const [icono, setIcono] = useState<string | undefined>(undefined);
    const [colorIcono, setColorIcono] = useState<string | undefined>(undefined);
    const [prioridad, setPrioridad] = useState<NivelPrioridad | undefined>(valoresIniciales.prioridad);
    const [urgencia, setUrgencia] = useState<NivelUrgencia | undefined>(valoresIniciales.urgencia);
    const [fechaLimite, setFechaLimite] = useState<string | undefined>(undefined);
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
            setNombre('');
            setIcono(undefined);
            setColorIcono(undefined);
            setPrioridad(valoresIniciales.prioridad);
            setUrgencia(valoresIniciales.urgencia);
            setFechaLimite(undefined);
        }
    }, [estaAbierto, valoresIniciales]);

    const manejarGuardar = async () => {
        if (!nombre.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                nombre,
                icono,
                colorIcono,
                prioridad,
                urgencia,
                fechaLimite
            });
            onCerrar();
        } catch (error) {
            console.error('Error al crear proyecto:', error);
        } finally {
            setCargando(false);
        }
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
            <div className="bottomSheetProyecto">
                {/* Input principal */}
                <div className="bottomSheetProyecto__inputWrapper">
                    <input ref={inputRef} type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del proyecto..." className="bottomSheetProyecto__input" disabled={cargando} />
                </div>

                {/* Barra de acciones (Opciones + Guardar) */}
                <div className="bottomSheetProyecto__acciones">
                    {/* Grupo de opciones (Izquierda) */}
                    <div className="bottomSheetProyecto__opcionesGrupo">
                        {/* Icono del proyecto */}
                        <button
                            type="button"
                            className={`bottomSheetProyecto__accion ${icono ? 'bottomSheetProyecto__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con selector de iconos.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label="Icono"
                            title="Icono">
                            <Layers size={15} />
                        </button>

                        {/* Prioridad */}
                        <button
                            type="button"
                            className={`bottomSheetProyecto__accion ${prioridad ? 'bottomSheetProyecto__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con opciones de Prioridad.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label={obtenerTextoPrioridad() || 'Prioridad'}
                            title={obtenerTextoPrioridad() || 'Prioridad'}>
                            <Flag size={15} />
                        </button>

                        {/* Urgencia */}
                        <button
                            type="button"
                            className={`bottomSheetProyecto__accion ${urgencia ? 'bottomSheetProyecto__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con opciones de Urgencia.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label={obtenerTextoUrgencia() || 'Urgencia'}
                            title={obtenerTextoUrgencia() || 'Urgencia'}>
                            <Hash size={15} />
                        </button>

                        {/* Fecha límite */}
                        <button
                            type="button"
                            className={`bottomSheetProyecto__accion ${fechaLimite ? 'bottomSheetProyecto__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con selector de fecha.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label={fechaLimite || 'Fecha límite'}
                            title={fechaLimite || 'Fecha límite'}>
                            <Calendar size={15} />
                        </button>
                    </div>

                    {/* Botón Guardar (Derecha) */}
                    <button type="button" className="bottomSheetProyecto__botonGuardar" onClick={manejarGuardar} disabled={!nombre.trim() || cargando} aria-label="Crear Proyecto">
                        <Send size={15} />
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
}

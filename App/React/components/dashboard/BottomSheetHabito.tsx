/*
 * BottomSheetHabito
 * Bottom Sheet para crear hábitos en móvil
 * Diseño idéntico a BottomSheetTarea para consistencia visual
 *
 * Características:
 * - Input principal con autofocus
 * - Barra de acciones con iconos (15px): Frecuencia, Importancia
 * - Botón enviar a la derecha
 * - Cierra automáticamente al crear
 *
 * TO-DO: Los iconos de propiedades deben abrir un modal de selección
 * y mostrar la selección como badge debajo del input
 */

import {useState, useRef, useEffect} from 'react';
import {Send, Repeat, Flag} from 'lucide-react';
import {BottomSheet} from '../shared';

interface BottomSheetHabitoProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosHabito) => Promise<void>;
    valoresIniciales?: {
        frecuencia?: string;
        importancia?: string;
    };
}

export interface DatosHabito {
    texto: string;
    frecuencia?: string;
    importancia?: string;
}

export function BottomSheetHabito({estaAbierto, onCerrar, onGuardar, valoresIniciales = {}}: BottomSheetHabitoProps): JSX.Element | null {
    const [texto, setTexto] = useState('');
    const [frecuencia, setFrecuencia] = useState<string | undefined>(valoresIniciales.frecuencia || 'diaria');
    const [importancia, setImportancia] = useState<string | undefined>(valoresIniciales.importancia);
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
            setFrecuencia(valoresIniciales.frecuencia || 'diaria');
            setImportancia(valoresIniciales.importancia);
        }
    }, [estaAbierto, valoresIniciales]);

    const manejarGuardar = async () => {
        if (!texto.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                texto,
                frecuencia,
                importancia
            });
            onCerrar();
        } catch (error) {
            console.error('Error al guardar hábito:', error);
        } finally {
            setCargando(false);
        }
    };

    const obtenerTextoFrecuencia = () => {
        const map: Record<string, string> = {
            diaria: 'Diaria',
            semanal: 'Semanal',
            personalizada: 'Personalizada'
        };
        return frecuencia ? map[frecuencia] : null;
    };

    const obtenerTextoImportancia = () => {
        const map: Record<string, string> = {
            baja: 'Baja',
            media: 'Media',
            alta: 'Alta',
            'Muy Alta': 'Muy Alta'
        };
        return importancia ? map[importancia] : null;
    };

    if (!estaAbierto) return null;

    return (
        <BottomSheet estaAbierto={estaAbierto} onCerrar={onCerrar}>
            <div className="bottomSheetHabito">
                {/* Input principal */}
                <div className="bottomSheetHabito__inputWrapper">
                    <input ref={inputRef} type="text" value={texto} onChange={e => setTexto(e.target.value)} placeholder="¿Qué hábito quieres crear?" className="bottomSheetHabito__input" disabled={cargando} />
                </div>

                {/* Barra de acciones (Opciones + Guardar) */}
                <div className="bottomSheetHabito__acciones">
                    {/* Grupo de opciones (Izquierda) */}
                    <div className="bottomSheetHabito__opcionesGrupo">
                        {/* Frecuencia */}
                        <button
                            type="button"
                            className={`bottomSheetHabito__accion ${frecuencia ? 'bottomSheetHabito__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con opciones de Frecuencia.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label={obtenerTextoFrecuencia() || 'Frecuencia'}
                            title={obtenerTextoFrecuencia() || 'Frecuencia'}>
                            <Repeat size={15} />
                        </button>

                        {/* Importancia */}
                        <button
                            type="button"
                            className={`bottomSheetHabito__accion ${importancia ? 'bottomSheetHabito__accion--activa' : ''}`}
                            onClick={() => {
                                /* TO-DO: Abrir modal central con opciones de Importancia.
                                 * Al seleccionar, mostrar badge debajo del título.
                                 */
                            }}
                            aria-label={obtenerTextoImportancia() || 'Importancia'}
                            title={obtenerTextoImportancia() || 'Importancia'}>
                            <Flag size={15} />
                        </button>
                    </div>

                    {/* Botón Guardar (Derecha) */}
                    <button type="button" className="bottomSheetHabito__botonGuardar" onClick={manejarGuardar} disabled={!texto.trim() || cargando} aria-label="Crear Hábito">
                        <Send size={15} />
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
}

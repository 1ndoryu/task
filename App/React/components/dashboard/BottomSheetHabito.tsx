/*
 * BottomSheetHabito
 * Bottom Sheet para crear/editar hábitos en móvil
 * Diseño compacto y minimalista específico para móvil
 * 
 * Características:
 * - Input principal con autofocus
 * - Opciones compactas con iconos (frecuencia, importancia)
 * - Botón de crear destacado
 * - Cierra automáticamente al crear
 */

import {useState, useRef, useEffect} from 'react';
import {Activity, Repeat, Flag, X} from 'lucide-react';
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
        return frecuencia ? map[frecuencia] : 'Diaria';
    };

    const obtenerTextoImportancia = () => {
        const map: Record<string, string> = {
            baja: 'Baja',
            media: 'Media',
            alta: 'Alta'
        };
        return importancia ? map[importancia] : 'Importancia';
    };

    return (
        <BottomSheet estaAbierto={estaAbierto} onCerrar={onCerrar}>
            <div className="bottomSheetHabito">
                {/* Cabecera con título y botón cerrar */}
                <div className="bottomSheetHabito__cabecera">
                    <div className="bottomSheetHabito__icono">
                        <Activity size={18} />
                    </div>
                    <h3 className="bottomSheetHabito__titulo">Nuevo Hábito</h3>
                    <button
                        type="button"
                        className="bottomSheetHabito__botonCerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Input principal */}
                <div className="bottomSheetHabito__inputWrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        placeholder="¿Qué hábito quieres crear?"
                        className="bottomSheetHabito__input"
                        disabled={cargando}
                    />
                </div>

                {/* Opciones compactas */}
                <div className="bottomSheetHabito__opciones">
                    {/* Frecuencia */}
                    <button
                        type="button"
                        className={`bottomSheetHabito__opcion ${frecuencia ? 'bottomSheetHabito__opcion--activa' : ''}`}
                        onClick={() => {
                            /* TO-DO: Abrir selector de frecuencia */
                        }}
                    >
                        <Repeat size={16} />
                        <span>{obtenerTextoFrecuencia()}</span>
                    </button>

                    {/* Importancia */}
                    <button
                        type="button"
                        className={`bottomSheetHabito__opcion ${importancia ? 'bottomSheetHabito__opcion--activa' : ''}`}
                        onClick={() => {
                            /* TO-DO: Abrir selector de importancia */
                        }}
                    >
                        <Flag size={16} />
                        <span>{obtenerTextoImportancia()}</span>
                    </button>
                </div>

                {/* Botón de acción */}
                <button
                    type="button"
                    className="bottomSheetHabito__botonCrear"
                    onClick={manejarGuardar}
                    disabled={!texto.trim() || cargando}
                >
                    {cargando ? 'Creando...' : 'Crear Hábito'}
                </button>
            </div>
        </BottomSheet>
    );
}

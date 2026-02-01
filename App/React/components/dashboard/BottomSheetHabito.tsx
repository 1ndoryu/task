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
 * - Modales de selección para propiedades
 * - Badges de propiedades seleccionadas
 */

import {useState, useRef, useEffect, useMemo} from 'react';
import {Send, Repeat, Flag} from 'lucide-react';
import {BottomSheet, ModalSeleccionPropiedad, BadgesPropiedad} from '../shared';
import {OPCIONES_FRECUENCIA, OPCIONES_IMPORTANCIA, obtenerTextoFrecuencia, obtenerTextoImportancia} from '../../utils/constantes';

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

/* Tipos de modales de selección */
type ModalActivo = 'frecuencia' | 'importancia' | null;

export function BottomSheetHabito({estaAbierto, onCerrar, onGuardar, valoresIniciales = {}}: BottomSheetHabitoProps): JSX.Element | null {
    const [texto, setTexto] = useState('');
    const [frecuencia, setFrecuencia] = useState<string | undefined>(valoresIniciales.frecuencia || 'diaria');
    const [importancia, setImportancia] = useState<string | undefined>(valoresIniciales.importancia);
    const [cargando, setCargando] = useState(false);
    const [modalActivo, setModalActivo] = useState<ModalActivo>(null);

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
            setModalActivo(null);
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

    /* Construir lista de badges activos */
    const badgesActivos = useMemo(() => {
        const badges = [];
        if (frecuencia) {
            badges.push({
                id: 'frecuencia',
                etiqueta: obtenerTextoFrecuencia(frecuencia) || frecuencia,
                icono: <Repeat size={10} />,
                variante: 'frecuencia' as const
            });
        }
        if (importancia) {
            badges.push({
                id: 'importancia',
                etiqueta: obtenerTextoImportancia(importancia) || importancia,
                icono: <Flag size={10} />,
                variante: 'importancia' as const
            });
        }
        return badges;
    }, [frecuencia, importancia]);

    /* Manejar eliminación de badge */
    const manejarEliminarBadge = (id: string) => {
        switch (id) {
            case 'frecuencia':
                setFrecuencia(undefined);
                break;
            case 'importancia':
                setImportancia(undefined);
                break;
        }
    };

    if (!estaAbierto) return null;

    return (
        <BottomSheet estaAbierto={estaAbierto} onCerrar={onCerrar}>
            <div className="bottomSheetHabito">
                {/* Input principal */}
                <div className="bottomSheetHabito__inputWrapper">
                    <input ref={inputRef} type="text" value={texto} onChange={e => setTexto(e.target.value)} placeholder="¿Qué hábito quieres crear?" className="bottomSheetHabito__input" disabled={cargando} />
                </div>

                {/* Badges de propiedades seleccionadas */}
                <BadgesPropiedad badges={badgesActivos} onEliminar={manejarEliminarBadge} />

                {/* Barra de acciones (Opciones + Guardar) */}
                <div className="bottomSheetHabito__acciones">
                    {/* Grupo de opciones (Izquierda) */}
                    <div className="bottomSheetHabito__opcionesGrupo">
                        {/* Frecuencia */}
                        <button type="button" className={`bottomSheetHabito__accion ${frecuencia ? 'bottomSheetHabito__accion--activa' : ''}`} onClick={() => setModalActivo('frecuencia')} aria-label={obtenerTextoFrecuencia(frecuencia) || 'Frecuencia'} title={obtenerTextoFrecuencia(frecuencia) || 'Frecuencia'}>
                            <Repeat size={16} />
                        </button>

                        {/* Importancia */}
                        <button type="button" className={`bottomSheetHabito__accion ${importancia ? 'bottomSheetHabito__accion--activa' : ''}`} onClick={() => setModalActivo('importancia')} aria-label={obtenerTextoImportancia(importancia) || 'Importancia'} title={obtenerTextoImportancia(importancia) || 'Importancia'}>
                            <Flag size={16} />
                        </button>
                    </div>

                    {/* Botón Guardar (Derecha) */}
                    <button type="button" className="bottomSheetHabito__botonGuardar" onClick={manejarGuardar} disabled={!texto.trim() || cargando} aria-label="Crear Hábito">
                        <Send size={16} />
                    </button>
                </div>
            </div>

            {/* Modal de selección de Frecuencia */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'frecuencia'} titulo="Seleccionar Frecuencia" opciones={OPCIONES_FRECUENCIA} valorActual={frecuencia} onSeleccionar={valor => setFrecuencia(valor || 'diaria')} onCerrar={() => setModalActivo(null)} permitirLimpiar={false} />

            {/* Modal de selección de Importancia */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'importancia'} titulo="Seleccionar Importancia" opciones={OPCIONES_IMPORTANCIA} valorActual={importancia} onSeleccionar={valor => setImportancia(valor)} onCerrar={() => setModalActivo(null)} textoLimpiar="Sin importancia" />
        </BottomSheet>
    );
}

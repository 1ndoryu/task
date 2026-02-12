/*
 * BottomSheetHabito
 * Bottom Sheet para crear/editar hábitos en móvil
 * Diseño idéntico a BottomSheetTarea para consistencia visual
 *
 * Características:
 * - Input principal con autofocus
 * - Barra de acciones con iconos (15px): Frecuencia, Importancia
 * - Botón enviar a la derecha
 * - Cierra automáticamente al crear/guardar
 * - Soporta modo edición con habitoExistente
 * - Modales de selección para propiedades
 * - Badges de propiedades seleccionadas
 * - Botón configuración (tuerca) en modo edición para abrir panel completo
 */

import {useState, useRef, useEffect, useMemo} from 'react';
import {Send, Repeat, Flag, Settings} from 'lucide-react';
import {BottomSheet, ModalSeleccionPropiedad, BadgesPropiedad} from '../shared';
import {Input, Boton} from '../ui';
import {OPCIONES_FRECUENCIA, OPCIONES_IMPORTANCIA, obtenerTextoFrecuencia, obtenerTextoImportancia} from '../../utils/constantes';
import type {Habito} from '../../types/dashboard';

interface BottomSheetHabitoProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosHabito) => Promise<void>;
    valoresIniciales?: {
        frecuencia?: string;
        importancia?: string;
    };
    /* Modo edición: si se pasa un hábito, se edita en lugar de crear */
    habitoExistente?: Habito;
    onAbrirConfiguracion?: () => void;
}

export interface DatosHabito {
    texto: string;
    frecuencia?: string;
    importancia?: string;
    /* ID de hábito existente para edición */
    id?: number;
}

/* Tipos de modales de selección */
type ModalActivo = 'frecuencia' | 'importancia' | null;

export function BottomSheetHabito({estaAbierto, onCerrar, onGuardar, valoresIniciales = {}, habitoExistente, onAbrirConfiguracion}: BottomSheetHabitoProps): JSX.Element | null {
    const esEdicion = !!habitoExistente;
    const [texto, setTexto] = useState(habitoExistente?.nombre || '');
    const [frecuencia, setFrecuencia] = useState<string | undefined>(habitoExistente?.frecuencia?.tipo || valoresIniciales.frecuencia || 'diaria');
    const [importancia, setImportancia] = useState<string | undefined>(habitoExistente?.importancia || valoresIniciales.importancia || 'Media');
    const [cargando, setCargando] = useState(false);
    const [modalActivo, setModalActivo] = useState<ModalActivo>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    /* Ref para rastrear qué hábito se ha cargado (evita recargas innecesarias) */
    const habitoIdCargadoRef = useRef<number | undefined>(undefined);

    /* Autofocus al abrir */
    useEffect(() => {
        if (estaAbierto && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [estaAbierto]);

    /*
     * Reset al cerrar o cargar nuevo hábito
     * Bug fix: Solo resetear cuando estaAbierto pasa a false,
     * o cuando el ID de habitoExistente cambia (nuevo hábito a editar)
     */
    useEffect(() => {
        if (!estaAbierto) {
            /* Reset completo al cerrar */
            setTexto('');
            setFrecuencia(valoresIniciales.frecuencia || 'diaria');
            setImportancia(valoresIniciales.importancia || 'Media');
            setModalActivo(null);
            habitoIdCargadoRef.current = undefined;
        } else if (habitoExistente && habitoExistente.id !== habitoIdCargadoRef.current) {
            /* Cargar datos solo si es un hábito diferente al ya cargado */
            setTexto(habitoExistente.nombre);
            setFrecuencia(habitoExistente.frecuencia?.tipo || 'diaria');
            setImportancia(habitoExistente.importancia || 'Media');
            habitoIdCargadoRef.current = habitoExistente.id;
        } else if (!habitoExistente && estaAbierto && habitoIdCargadoRef.current === undefined) {
            /* Modo creación: aplicar valores iniciales solo la primera vez */
            setFrecuencia(valoresIniciales.frecuencia || 'diaria');
            setImportancia(valoresIniciales.importancia || 'Media');
            habitoIdCargadoRef.current = -1; /* Marcador para modo creación */
        }
    }, [estaAbierto, habitoExistente?.id]);

    const manejarGuardar = async () => {
        if (!texto.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                texto,
                frecuencia,
                importancia,
                id: habitoExistente?.id
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
                    <Input ref={inputRef} tipo="text" value={texto} onChange={e => setTexto(e.target.value)} placeholder={esEdicion ? 'Nombre del hábito' : '¿Qué hábito quieres crear?'} claseAdicional="bottomSheetHabito__input" disabled={cargando} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck="false" data-form-type="other" inputMode="text" enterKeyHint="done" name="bottomsheet-habito-input" data-lpignore="true" data-1p-ignore="true" aria-autocomplete="none" />
                </div>

                {/* Badges de propiedades seleccionadas */}
                <BadgesPropiedad badges={badgesActivos} onEliminar={manejarEliminarBadge} />

                {/* Barra de acciones (Opciones + Guardar) */}
                <div className="bottomSheetHabito__acciones">
                    {/* Grupo de opciones (Izquierda) */}
                    <div className="bottomSheetHabito__opcionesGrupo">
                        {/* Frecuencia */}
                        <Boton type="button" variante="ghost" claseAdicional={`bottomSheetHabito__accion ${frecuencia ? 'bottomSheetHabito__accion--activa' : ''}`} onClick={() => setModalActivo('frecuencia')} aria-label={obtenerTextoFrecuencia(frecuencia) || 'Frecuencia'} title={obtenerTextoFrecuencia(frecuencia) || 'Frecuencia'} icono={<Repeat size={18} />} />

                        {/* Importancia */}
                        <Boton type="button" variante="ghost" claseAdicional={`bottomSheetHabito__accion ${importancia ? 'bottomSheetHabito__accion--activa' : ''}`} onClick={() => setModalActivo('importancia')} aria-label={obtenerTextoImportancia(importancia) || 'Importancia'} title={obtenerTextoImportancia(importancia) || 'Importancia'} icono={<Flag size={18} />} />

                        {/* Configuración avanzada (solo edición) */}
                        {esEdicion && onAbrirConfiguracion && (
                            <Boton
                                type="button"
                                variante="ghost"
                                claseAdicional="bottomSheetHabito__accion"
                                onClick={() => {
                                    onAbrirConfiguracion();
                                    onCerrar();
                                }}
                                aria-label="Configuración avanzada"
                                title="Configuración avanzada"
                                icono={<Settings size={18} />}
                            />
                        )}
                    </div>

                    {/* Botón Guardar (Derecha) */}
                    <Boton type="button" variante="primario" claseAdicional="bottomSheetHabito__botonGuardar" onClick={manejarGuardar} disabled={!texto.trim() || cargando} aria-label={esEdicion ? 'Guardar Cambios' : 'Crear Hábito'} icono={<Send size={18} />} />
                </div>
            </div>

            {/* Modal de selección de Frecuencia */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'frecuencia'} titulo="Seleccionar Frecuencia" opciones={OPCIONES_FRECUENCIA} valorActual={frecuencia} onSeleccionar={valor => setFrecuencia(valor || 'diaria')} onCerrar={() => setModalActivo(null)} permitirLimpiar={false} />

            {/* Modal de selección de Importancia */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'importancia'} titulo="Seleccionar Importancia" opciones={OPCIONES_IMPORTANCIA} valorActual={importancia} onSeleccionar={valor => setImportancia(valor)} onCerrar={() => setModalActivo(null)} textoLimpiar="Sin importancia" />
        </BottomSheet>
    );
}

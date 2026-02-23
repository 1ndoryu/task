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

import {Send, Repeat, Flag, Settings} from 'lucide-react';
import {BottomSheet, ModalSeleccionPropiedad, BadgesPropiedad} from '../shared';
import {Input, Boton} from '../ui';
import {OPCIONES_FRECUENCIA, OPCIONES_IMPORTANCIA, obtenerTextoFrecuencia, obtenerTextoImportancia} from '../../utils/constantes';
import {useBottomSheetHabito} from '../../hooks/dashboard/useBottomSheetHabito';
import type {DatosHabito} from '../../hooks/dashboard/useBottomSheetHabito';
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

export type {DatosHabito};

export function BottomSheetHabito({estaAbierto, onCerrar, onGuardar, valoresIniciales = {}, habitoExistente, onAbrirConfiguracion}: BottomSheetHabitoProps): JSX.Element | null {
    const {esEdicion, texto, setTexto, frecuencia, importancia, cargando, modalActivo, setModalActivo, inputRef, badgesActivos, manejarGuardar, manejarEliminarBadge, setFrecuencia, setImportancia} = useBottomSheetHabito({estaAbierto, onCerrar, onGuardar, valoresIniciales, habitoExistente});

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

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
 * - Modales de selección para propiedades
 * - Badges de propiedades seleccionadas
 */

import {useState, useRef, useEffect, useMemo} from 'react';
import {Send, Flag, Hash, Calendar} from 'lucide-react';
import {BottomSheet, ModalSeleccionPropiedad, BadgesPropiedad} from '../shared';
import {Input, Boton} from '../ui';
import type {NivelPrioridad, NivelUrgencia} from '../../types/dashboard';
import {OPCIONES_PRIORIDAD, OPCIONES_URGENCIA, OPCIONES_FECHA_PROYECTO, obtenerTextoPrioridad, obtenerTextoUrgencia} from '../../utils/constantes';
import {calcularFechaDesdeOpcion} from '../../utils/fecha';

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

/* Tipos de modales de selección */
type ModalActivo = 'prioridad' | 'urgencia' | 'fecha' | null;

export function BottomSheetProyecto({estaAbierto, onCerrar, onGuardar, valoresIniciales = {}}: BottomSheetProyectoProps): JSX.Element | null {
    const [nombre, setNombre] = useState('');
    const [prioridad, setPrioridad] = useState<NivelPrioridad | undefined>(valoresIniciales.prioridad);
    const [urgencia, setUrgencia] = useState<NivelUrgencia | undefined>(valoresIniciales.urgencia);
    const [fechaLimite, setFechaLimite] = useState<string | undefined>(undefined);
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
            setNombre('');
            setPrioridad(valoresIniciales.prioridad);
            setUrgencia(valoresIniciales.urgencia);
            setFechaLimite(undefined);
            setModalActivo(null);
        }
    }, [estaAbierto, valoresIniciales]);

    const manejarGuardar = async () => {
        if (!nombre.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                nombre,
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

    /* Construir lista de badges activos */
    const badgesActivos = useMemo(() => {
        const badges = [];
        if (prioridad) {
            badges.push({
                id: 'prioridad',
                etiqueta: obtenerTextoPrioridad(prioridad) || prioridad,
                icono: <Flag size={10} />,
                variante: 'prioridad' as const
            });
        }
        if (urgencia) {
            badges.push({
                id: 'urgencia',
                etiqueta: obtenerTextoUrgencia(urgencia) || urgencia,
                icono: <Hash size={10} />,
                variante: 'urgencia' as const
            });
        }
        if (fechaLimite) {
            badges.push({
                id: 'fecha',
                etiqueta: fechaLimite,
                icono: <Calendar size={10} />,
                variante: 'fecha' as const
            });
        }
        return badges;
    }, [prioridad, urgencia, fechaLimite]);

    /* Manejar eliminación de badge */
    const manejarEliminarBadge = (id: string) => {
        switch (id) {
            case 'prioridad':
                setPrioridad(undefined);
                break;
            case 'urgencia':
                setUrgencia(undefined);
                break;
            case 'fecha':
                setFechaLimite(undefined);
                break;
        }
    };

    if (!estaAbierto) return null;

    return (
        <BottomSheet estaAbierto={estaAbierto} onCerrar={onCerrar}>
            <div className="bottomSheetProyecto">
                {/* Input principal */}
                <div className="bottomSheetProyecto__inputWrapper">
                    <Input ref={inputRef} tipo="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del proyecto..." claseAdicional="bottomSheetProyecto__input" disabled={cargando} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck="false" data-form-type="other" inputMode="text" enterKeyHint="done" name="bottomsheet-proyecto-input" data-lpignore="true" data-1p-ignore="true" aria-autocomplete="none" />
                </div>

                {/* Badges de propiedades seleccionadas */}
                <BadgesPropiedad badges={badgesActivos} onEliminar={manejarEliminarBadge} />

                {/* Barra de acciones (Opciones + Guardar) */}
                <div className="bottomSheetProyecto__acciones">
                    {/* Grupo de opciones (Izquierda) */}
                    <div className="bottomSheetProyecto__opcionesGrupo">
                        {/* Prioridad */}
                        <Boton type="button" variante="ghost" claseAdicional={`bottomSheetProyecto__accion ${prioridad ? 'bottomSheetProyecto__accion--activa' : ''}`} onClick={() => setModalActivo('prioridad')} aria-label={obtenerTextoPrioridad(prioridad) || 'Prioridad'} title={obtenerTextoPrioridad(prioridad) || 'Prioridad'} icono={<Flag size={18} />} />

                        {/* Urgencia */}
                        <Boton type="button" variante="ghost" claseAdicional={`bottomSheetProyecto__accion ${urgencia ? 'bottomSheetProyecto__accion--activa' : ''}`} onClick={() => setModalActivo('urgencia')} aria-label={obtenerTextoUrgencia(urgencia) || 'Urgencia'} title={obtenerTextoUrgencia(urgencia) || 'Urgencia'} icono={<Hash size={18} />} />

                        {/* Fecha límite */}
                        <Boton type="button" variante="ghost" claseAdicional={`bottomSheetProyecto__accion ${fechaLimite ? 'bottomSheetProyecto__accion--activa' : ''}`} onClick={() => setModalActivo('fecha')} aria-label={fechaLimite || 'Fecha límite'} title={fechaLimite || 'Fecha límite'} icono={<Calendar size={18} />} />
                    </div>

                    {/* Botón Guardar (Derecha) */}
                    <Boton type="button" variante="primario" claseAdicional="bottomSheetProyecto__botonGuardar" onClick={manejarGuardar} disabled={!nombre.trim() || cargando} aria-label="Crear Proyecto" icono={<Send size={18} />} />
                </div>
            </div>

            {/* Modal de selección de Prioridad */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'prioridad'} titulo="Seleccionar Prioridad" opciones={OPCIONES_PRIORIDAD} valorActual={prioridad} onSeleccionar={valor => setPrioridad(valor as NivelPrioridad | undefined)} onCerrar={() => setModalActivo(null)} textoLimpiar="Sin prioridad" />

            {/* Modal de selección de Urgencia */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'urgencia'} titulo="Seleccionar Urgencia" opciones={OPCIONES_URGENCIA} valorActual={urgencia} onSeleccionar={valor => setUrgencia(valor as NivelUrgencia | undefined)} onCerrar={() => setModalActivo(null)} textoLimpiar="Sin urgencia" />

            {/* Modal de selección de Fecha */}
            <ModalSeleccionPropiedad
                estaAbierto={modalActivo === 'fecha'}
                titulo="Fecha Límite"
                opciones={OPCIONES_FECHA_PROYECTO}
                valorActual={undefined}
                onSeleccionar={valor => {
                    if (valor) {
                        setFechaLimite(calcularFechaDesdeOpcion(valor));
                    } else {
                        setFechaLimite(undefined);
                    }
                }}
                onCerrar={() => setModalActivo(null)}
                textoLimpiar="Sin fecha"
            />
        </BottomSheet>
    );
}

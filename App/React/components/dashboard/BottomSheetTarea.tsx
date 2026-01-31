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
 * - Modales de selección para propiedades
 * - Badges de propiedades seleccionadas
 */

import {useState, useRef, useEffect, useMemo} from 'react';
import {Send, Calendar, Flag, Hash, Layers, Settings} from 'lucide-react';
import {BottomSheet, ModalSeleccionPropiedad, BadgesPropiedad} from '../shared';
import type {Proyecto, Tarea} from '../../types/dashboard';
import {OPCIONES_PRIORIDAD, OPCIONES_URGENCIA, OPCIONES_FECHA_TAREA, obtenerTextoPrioridad, obtenerTextoUrgencia} from '../../utils/constantes';
import {calcularFechaDesdeOpcion} from '../../utils/fecha';

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

/* Tipos de modales de selección */
type ModalActivo = 'proyecto' | 'prioridad' | 'urgencia' | 'fecha' | null;

export function BottomSheetTarea({estaAbierto, onCerrar, onGuardar, proyectos = [], valoresIniciales = {}, tareaExistente, onAbrirConfiguracion}: BottomSheetTareaProps): JSX.Element | null {
    const esEdicion = !!tareaExistente;
    const [texto, setTexto] = useState(tareaExistente?.texto || '');
    const [proyectoId, setProyectoId] = useState<number | undefined>(tareaExistente?.proyectoId || valoresIniciales.proyectoId);
    const [prioridad, setPrioridad] = useState<string | undefined>(tareaExistente?.prioridad || valoresIniciales.prioridad);
    const [urgencia, setUrgencia] = useState<string | undefined>(tareaExistente?.urgencia || valoresIniciales.urgencia);
    const [fecha, setFecha] = useState<string | undefined>(tareaExistente?.configuracion?.fechaMaxima);
    const [cargando, setCargando] = useState(false);
    const [modalActivo, setModalActivo] = useState<ModalActivo>(null);

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
            setModalActivo(null);
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

    /* Opciones de proyectos para el modal */
    const opcionesProyecto = useMemo(
        () =>
            proyectos.map(p => ({
                id: p.id.toString(),
                etiqueta: p.nombre,
                icono: <Layers size={14} />
            })),
        [proyectos]
    );

    /* Construir lista de badges activos */
    const badgesActivos = useMemo(() => {
        const badges = [];
        if (proyectoId) {
            const nombreProyecto = obtenerNombreProyecto();
            if (nombreProyecto) {
                badges.push({
                    id: 'proyecto',
                    etiqueta: nombreProyecto,
                    icono: <Layers size={10} />,
                    variante: 'proyecto' as const
                });
            }
        }
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
        if (fecha) {
            badges.push({
                id: 'fecha',
                etiqueta: fecha,
                icono: <Calendar size={10} />,
                variante: 'fecha' as const
            });
        }
        return badges;
    }, [proyectoId, prioridad, urgencia, fecha]);

    /* Manejar eliminación de badge */
    const manejarEliminarBadge = (id: string) => {
        switch (id) {
            case 'proyecto':
                setProyectoId(undefined);
                break;
            case 'prioridad':
                setPrioridad(undefined);
                break;
            case 'urgencia':
                setUrgencia(undefined);
                break;
            case 'fecha':
                setFecha(undefined);
                break;
        }
    };

    if (!estaAbierto) return null;

    return (
        <BottomSheet estaAbierto={estaAbierto} onCerrar={onCerrar}>
            <div className="bottomSheetTarea">
                {/* Input principal */}
                <div className="bottomSheetTarea__inputWrapper">
                    <input ref={inputRef} type="text" value={texto} onChange={e => setTexto(e.target.value)} placeholder="¿Qué necesitas hacer?" className="bottomSheetTarea__input" disabled={cargando} />
                </div>

                {/* Badges de propiedades seleccionadas */}
                <BadgesPropiedad badges={badgesActivos} onEliminar={manejarEliminarBadge} />

                {/* Barra de acciones (Opciones + Guardar) */}
                <div className="bottomSheetTarea__acciones">
                    {/* Grupo de opciones (Izquierda) */}
                    <div className="bottomSheetTarea__opcionesGrupo">
                        {/* Proyecto */}
                        {proyectos.length > 0 && (
                            <button type="button" className={`bottomSheetTarea__accion ${proyectoId ? 'bottomSheetTarea__accion--activa' : ''}`} onClick={() => setModalActivo('proyecto')} aria-label={obtenerNombreProyecto() || 'Proyecto'} title={obtenerNombreProyecto() || 'Proyecto'}>
                                <Layers size={15} />
                            </button>
                        )}

                        {/* Prioridad */}
                        <button type="button" className={`bottomSheetTarea__accion ${prioridad ? 'bottomSheetTarea__accion--activa' : ''}`} onClick={() => setModalActivo('prioridad')} aria-label={obtenerTextoPrioridad(prioridad) || 'Prioridad'} title={obtenerTextoPrioridad(prioridad) || 'Prioridad'}>
                            <Flag size={15} />
                        </button>

                        {/* Urgencia */}
                        <button type="button" className={`bottomSheetTarea__accion ${urgencia ? 'bottomSheetTarea__accion--activa' : ''}`} onClick={() => setModalActivo('urgencia')} aria-label={obtenerTextoUrgencia(urgencia) || 'Urgencia'} title={obtenerTextoUrgencia(urgencia) || 'Urgencia'}>
                            <Hash size={15} />
                        </button>

                        {/* Fecha límite */}
                        <button type="button" className={`bottomSheetTarea__accion ${fecha ? 'bottomSheetTarea__accion--activa' : ''}`} onClick={() => setModalActivo('fecha')} aria-label={fecha || 'Fecha'} title={fecha || 'Fecha'}>
                            <Calendar size={15} />
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
                                <Settings size={15} />
                            </button>
                        )}
                    </div>

                    {/* Botón Guardar (Derecha) */}
                    <button type="button" className="bottomSheetTarea__botonGuardar" onClick={manejarGuardar} disabled={!texto.trim() || cargando} aria-label={esEdicion ? 'Guardar Cambios' : 'Crear Tarea'}>
                        <Send size={15} />
                    </button>
                </div>
            </div>

            {/* Modal de selección de Proyecto */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'proyecto'} titulo="Seleccionar Proyecto" opciones={opcionesProyecto} valorActual={proyectoId?.toString()} onSeleccionar={valor => setProyectoId(valor ? parseInt(valor) : undefined)} onCerrar={() => setModalActivo(null)} textoLimpiar="Sin proyecto" />

            {/* Modal de selección de Prioridad */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'prioridad'} titulo="Seleccionar Prioridad" opciones={OPCIONES_PRIORIDAD} valorActual={prioridad} onSeleccionar={valor => setPrioridad(valor)} onCerrar={() => setModalActivo(null)} textoLimpiar="Sin prioridad" />

            {/* Modal de selección de Urgencia */}
            <ModalSeleccionPropiedad estaAbierto={modalActivo === 'urgencia'} titulo="Seleccionar Urgencia" opciones={OPCIONES_URGENCIA} valorActual={urgencia} onSeleccionar={valor => setUrgencia(valor)} onCerrar={() => setModalActivo(null)} textoLimpiar="Sin urgencia" />

            {/* Modal de selección de Fecha */}
            <ModalSeleccionPropiedad
                estaAbierto={modalActivo === 'fecha'}
                titulo="Fecha Límite"
                opciones={OPCIONES_FECHA_TAREA}
                valorActual={undefined}
                onSeleccionar={valor => {
                    if (valor) {
                        setFecha(calcularFechaDesdeOpcion(valor));
                    } else {
                        setFecha(undefined);
                    }
                }}
                onCerrar={() => setModalActivo(null)}
                textoLimpiar="Sin fecha"
            />
        </BottomSheet>
    );
}

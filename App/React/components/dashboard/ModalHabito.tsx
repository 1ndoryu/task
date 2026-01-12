/*
 * ModalHabito
 * Modal para crear/editar un habito con auto-guardado
 *
 * Fase 9.5: Refactorizado para usar componentes modernos estilo Linear
 * - FormularioHabitoModerno para el formulario principal
 * - usePanelChat para la gestión del panel de chat
 * - Fase 10.8.6: Removido PestanasModal (código muerto)
 */

import {useState, useCallback, useEffect} from 'react';
import {Activity, BarChart2} from 'lucide-react';
import type {NivelImportancia, DatosNuevoHabito, FrecuenciaHabito, Habito, Participante} from '../../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../../types/dashboard';
import {AccionesFormulario, Modal} from '../shared';
import type {EstadoHabito} from '../shared';
import {FormularioHabitoModerno} from './habitos/FormularioHabitoModerno';
import {PanelChatHistorial} from './PanelChatHistorial';
import {usePanelChat} from '../../hooks/usePanelChat';
import {useHabitosStore} from '../../stores/habitosStore';
import {obtenerFechaHoy} from '../../utils/fecha';

type DatosFormulario = DatosNuevoHabito;

interface ModalHabitoProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosFormulario) => void;
    habito?: Habito;
    participantes?: Participante[];
}

export function ModalHabito({estaAbierto, onCerrar, onGuardar, habito, participantes = []}: ModalHabitoProps): JSX.Element | null {
    const modoEdicion = !!habito;

    /* Estado local para edicion */
    const [nombre, setNombre] = useState(habito?.nombre || '');
    const [descripcion, setDescripcion] = useState(habito?.descripcion || '');
    const [icono, setIcono] = useState(habito?.icono || 'check-circle');
    const [colorIcono, setColorIcono] = useState(habito?.colorIcono || '#888888');
    const [importancia, setImportancia] = useState<NivelImportancia>(habito?.importancia || 'Media');
    const [frecuencia, setFrecuencia] = useState<FrecuenciaHabito>(habito?.frecuencia || FRECUENCIA_POR_DEFECTO);
    const [errores, setErrores] = useState<{nombre?: string}>({});

    /* Removido: Estado de pestañas móvil (código muerto - Fase 10.8.6) */

    /* Hook para panel de chat */
    const {chatVisible, toggleChat, tieneMensajesSinLeer, participantesChat, mostrarChatColumna} = usePanelChat({
        elementoId: habito?.id,
        elementoTipo: 'habito',
        participantes,
        habilitado: modoEdicion
    });

    /* Estado de cumplimiento de hoy */
    const toggleHabito = useHabitosStore(state => state.toggleHabito);
    const posponerHabito = useHabitosStore(state => state.posponerHabito);
    const hoy = obtenerFechaHoy();

    let estadoHoy: EstadoHabito = 'pendiente';
    if (habito) {
        if (habito.historialCompletados?.includes(hoy)) estadoHoy = 'completado';
        else if (habito.historialPospuestos?.includes(hoy)) estadoHoy = 'pospuesto';
    }

    /* Sincronizar estado cuando cambia el habito */
    useEffect(() => {
        if (habito) {
            setNombre(habito.nombre);
            setDescripcion(habito.descripcion || '');
            setIcono(habito.icono || 'check-circle');
            setColorIcono(habito.colorIcono || '#888888');
            setImportancia(habito.importancia);
            setFrecuencia(habito.frecuencia || FRECUENCIA_POR_DEFECTO);
        } else {
            setNombre('');
            setDescripcion('');
            setIcono('check-circle');
            setColorIcono('#888888');
            setImportancia('Media');
            setFrecuencia(FRECUENCIA_POR_DEFECTO);
        }
        setErrores({});
    }, [habito?.id, estaAbierto]);

    /* Manejador de cambio de estado del habito */
    const manejarCambioEstado = useCallback(
        (nuevoEstado: EstadoHabito) => {
            if (!habito) return;

            if (nuevoEstado === 'completado') {
                toggleHabito(habito.id);
            } else if (nuevoEstado === 'pospuesto') {
                posponerHabito(habito.id);
            } else if (nuevoEstado === 'pendiente') {
                if (estadoHoy === 'completado') toggleHabito(habito.id);
                else if (estadoHoy === 'pospuesto') posponerHabito(habito.id);
            }
        },
        [habito, estadoHoy, toggleHabito, posponerHabito]
    );

    /* Validar formulario */
    const validarFormulario = useCallback((): boolean => {
        const nuevosErrores: {nombre?: string} = {};

        if (!nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es obligatorio';
        } else if (nombre.trim().length < 3) {
            nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    }, [nombre]);

    /* Guardar habito */
    const manejarGuardar = useCallback(() => {
        if (!validarFormulario()) return;

        onGuardar({
            nombre: nombre.trim(),
            importancia,
            tags: [] /* Tags deprecados por ahora */,
            frecuencia,
            descripcion: descripcion.trim() || undefined,
            icono,
            colorIcono
        });
        onCerrar();
    }, [nombre, importancia, frecuencia, validarFormulario, onGuardar, onCerrar]);

    /* Auto-guardado: al cerrar el modal, guardar si hay nombre válido */
    const manejarCerrarConGuardado = useCallback(() => {
        if (nombre.trim().length >= 3) {
            manejarGuardar();
        } else {
            onCerrar();
        }
    }, [nombre, manejarGuardar, onCerrar]);

    /* Header Icons (similar a ModalProyecto) */
    const accionesHeader = modoEdicion ? (
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            {/* Estadisticas (Placeholder) */}
            <button type="button" className="botonIcono botonIcono--sutil" title="Estadísticas (Próximamente)" style={{cursor: 'default', opacity: 0.5}}>
                <BarChart2 size={16} className="textoApagado" />
            </button>

            {/* Actividad / Chat */}
            <button type="button" className={`botonIcono ${chatVisible && tieneMensajesSinLeer ? 'textoActivo' : 'textoApagado'}`} onClick={toggleChat} title={chatVisible ? 'Ocultar chat' : 'Mostrar chat e historial'} style={{cursor: 'pointer'}}>
                {tieneMensajesSinLeer ? (
                    <div style={{position: 'relative'}}>
                        <Activity size={16} />
                        <span className="indicadorBadge" />
                    </div>
                ) : (
                    <Activity size={16} />
                )}
            </button>
        </div>
    ) : undefined;

    /* Clase del modal */
    const claseModal = modoEdicion ? 'panelConfiguracionContenedor modalContenedor--expandido' : 'modalContenedor--moderno';

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={manejarCerrarConGuardado} titulo={modoEdicion ? 'Modificar habito' : 'Nuevo habito'} claseExtra={claseModal} accionesEncabezado={accionesHeader} ocultarBotonCerrar={modoEdicion}>
            {modoEdicion ? (
                <>
                    {/* Layout de 2 columnas (en móvil solo se muestra configuración) */}
                    <div className={`panelConfiguracionDosColumnas ${!mostrarChatColumna ? 'panelConfiguracionDosColumnas--sinChat' : ''}`}>
                        {/* Columna Izquierda: Formulario */}
                        <div className="panelConfiguracionColumnaIzquierda panelConfiguracionColumnaIzquierda--activa">
                            <div className="panelConfiguracionColumnaScroll">
                                <FormularioHabitoModerno
                                    nombre={nombre}
                                    onNombreChange={setNombre}
                                    descripcion={descripcion}
                                    onDescripcionChange={setDescripcion}
                                    icono={icono}
                                    colorIcono={colorIcono}
                                    onIconoChange={(i, c) => {
                                        setIcono(i);
                                        setColorIcono(c);
                                    }}
                                    importancia={importancia}
                                    onImportanciaChange={setImportancia}
                                    frecuencia={frecuencia}
                                    onFrecuenciaChange={setFrecuencia}
                                    estadoHoy={estadoHoy}
                                    onEstadoChange={manejarCambioEstado}
                                    habito={habito}
                                    modoEdicion={true}
                                    errorNombre={errores.nombre}
                                />
                            </div>
                            {/* Input de comentario cuando el chat esta oculto */}
                            {!mostrarChatColumna && habito && <PanelChatHistorial elementoId={habito.id} elementoTipo="habito" participantes={participantesChat} soloInput />}
                        </div>

                        {/* Columna Derecha: Chat e Historial (oculto en móvil) */}
                        {mostrarChatColumna && habito && (
                            <div className="panelConfiguracionColumnaDerecha panelConfiguracionColumnaDerecha--activa ocultarEnMovil">
                                <PanelChatHistorial elementoId={habito.id} elementoTipo="habito" participantes={participantesChat} />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Modo creación simple */
                <>
                    <div id="modal-habito-contenido" className="formularioHabito">
                        <FormularioHabitoModerno
                            nombre={nombre}
                            onNombreChange={setNombre}
                            descripcion={descripcion}
                            onDescripcionChange={setDescripcion}
                            icono={icono}
                            colorIcono={colorIcono}
                            onIconoChange={(i, c) => {
                                setIcono(i);
                                setColorIcono(c);
                            }}
                            importancia={importancia}
                            onImportanciaChange={setImportancia}
                            frecuencia={frecuencia}
                            onFrecuenciaChange={setFrecuencia}
                            modoEdicion={false}
                            errorNombre={errores.nombre}
                        />
                    </div>
                    <AccionesFormulario onCancelar={onCerrar} onGuardar={manejarGuardar} textoGuardar="Crear hábito" />
                </>
            )}
        </Modal>
    );
}

/*
 * ModalProyecto
 * Modal para crear/editar un proyecto con auto-guardado
 * Lógica extraída a useModalProyecto hook
 *
 * Auto-guardado: al cerrar (overlay, ESC, X)
 * Cancelar: descarta cambios y cierra
 *
 * Fase 7.6: Incluye panel de chat/historial siempre en modo edición
 * Fase 9.2.4: Seccion de responsables integrada
 */

import {Activity, BarChart2} from 'lucide-react';
import type {Proyecto, Participante, CompaneroEquipo, RolCompartido, Tarea} from '../../../types/dashboard';
import type {DatosNuevoProyecto} from '../../../hooks/useProyectos';
import {AccionesFormulario, Modal} from '../../shared';
import {Boton} from '../../ui';
import {PanelChatHistorial} from '../PanelChatHistorial';
import {FormularioProyectoModerno} from './FormularioProyectoModerno';
import {useModalProyecto} from '../../../hooks/dashboard/useModalProyecto';

interface ModalProyectoProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosNuevoProyecto) => void;
    proyecto?: Proyecto;
    participantes?: Participante[];
    companeros?: CompaneroEquipo[];
    onAgregarParticipante?: (companeroId: number, rol: RolCompartido) => void;
    onRemoverParticipante?: (participanteId: number) => void;
    onCambiarRolParticipante?: (participanteId: number, nuevoRol: RolCompartido) => void;
    tareas?: Tarea[];
    onToggleTarea?: (id: number) => void;
}

export function ModalProyecto({estaAbierto, onCerrar, onGuardar, proyecto, participantes = [], companeros = [], onAgregarParticipante, onRemoverParticipante, onCambiarRolParticipante, tareas = [], onToggleTarea: _onToggleTarea}: ModalProyectoProps): JSX.Element | null {
    const {
        modoEdicion, nombre, setNombre, descripcion, setDescripcion,
        icono, setIcono, colorIcono, setColorIcono,
        prioridad, setPrioridad, urgencia, setUrgencia,
        fechaLimite, setFechaLimite, adjuntos, setAdjuntos,
        hitos, setHitos, estado, setEstado, errores,
        pestanaActiva, setPestanaActiva,
        chatVisible, toggleChatVisible, tieneMensajesSinLeer,
        participantesChat, mostrarChat, mostrarChatColumna, claseModal,
        manejarGuardar, manejarCerrarConGuardado, manejarCancelar
    } = useModalProyecto({estaAbierto, onCerrar, onGuardar, proyecto, participantes, tareas});

    /* Header Icons (Fase 9.2.8) */
    const accionesHeader = (
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <Boton type="button" variante="icono" title="Estadísticas (Próximamente)" icono={<BarChart2 size={16} className="textoApagado" />} disabled claseAdicional="botonIcono botonIcono--sutil" style={{cursor: 'default', opacity: 0.5}} />
            <Boton
                type="button"
                variante="icono"
                onClick={toggleChatVisible}
                title={chatVisible ? 'Ocultar chat' : 'Mostrar chat e historial'}
                icono={
                    tieneMensajesSinLeer ? (
                        <div style={{position: 'relative'}}>
                            <Activity size={16} />
                            <span className="indicadorBadge" />
                        </div>
                    ) : (
                        <Activity size={16} />
                    )
                }
                claseAdicional={`botonIcono ${chatVisible && tieneMensajesSinLeer ? 'textoActivo' : 'textoApagado'}`}
                style={{cursor: 'pointer'}}
            />
        </div>
    );

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={manejarCerrarConGuardado} titulo={modoEdicion ? nombre : 'Nuevo Proyecto'} claseExtra={claseModal} accionesEncabezado={accionesHeader} ocultarBotonCerrar={true}>
            {mostrarChat ? (
                <>
                    {/* Pestañas para móvil */}
                    <div className="panelConfiguracionPestanas">
                        <Boton type="button" variante="pestaña" activo={pestanaActiva === 'configuracion'} onClick={() => setPestanaActiva('configuracion')}>
                            Configuracion
                        </Boton>
                        <Boton type="button" variante="pestaña" activo={pestanaActiva === 'chat'} onClick={() => setPestanaActiva('chat')}>
                            Chat / Historial
                        </Boton>
                    </div>

                    {/* Layout de 2 columnas */}
                    <div className={`panelConfiguracionDosColumnas ${!mostrarChatColumna ? 'panelConfiguracionDosColumnas--sinChat' : ''}`}>
                        <div className={`panelConfiguracionColumnaIzquierda ${pestanaActiva === 'configuracion' ? 'panelConfiguracionColumnaIzquierda--activa' : ''}`}>
                            <div className="panelConfiguracionColumnaScroll">
                                <FormularioProyectoModerno
                                    nombre={nombre}
                                    onNombreChange={setNombre}
                                    descripcion={descripcion}
                                    onDescripcionChange={setDescripcion}
                                    icono={icono}
                                    colorIcono={colorIcono}
                                    onIconoChange={(nuevoIcono, nuevoColor) => {
                                        setIcono(nuevoIcono);
                                        setColorIcono(nuevoColor);
                                    }}
                                    prioridad={prioridad}
                                    onPrioridadChange={setPrioridad}
                                    urgencia={urgencia}
                                    onUrgenciaChange={setUrgencia}
                                    fechaLimite={fechaLimite}
                                    onFechaLimiteChange={setFechaLimite}
                                    estado={estado}
                                    onEstadoChange={setEstado}
                                    errorNombre={errores.nombre}
                                    modoEdicion={true}
                                    participantes={participantes}
                                    companeros={companeros}
                                    onAgregarParticipante={onAgregarParticipante}
                                    onRemoverParticipante={onRemoverParticipante}
                                    onCambiarRolParticipante={onCambiarRolParticipante}
                                    puedeGestionarParticipantes={modoEdicion}
                                    adjuntos={adjuntos}
                                    onAdjuntosChange={setAdjuntos}
                                    hitos={hitos}
                                    onHitosChange={setHitos}
                                />
                            </div>
                            {!mostrarChatColumna && proyecto && <PanelChatHistorial elementoId={proyecto.id} elementoTipo="proyecto" participantes={participantesChat} soloInput />}
                        </div>

                        {mostrarChatColumna && <div className={`panelConfiguracionColumnaDerecha ${pestanaActiva === 'chat' ? 'panelConfiguracionColumnaDerecha--activa' : ''}`}>{proyecto && <PanelChatHistorial elementoId={proyecto.id} elementoTipo="proyecto" participantes={participantesChat} />}</div>}
                    </div>
                </>
            ) : (
                <>
                    <div id="modal-proyecto-contenido" className="formularioHabito">
                        <FormularioProyectoModerno
                            nombre={nombre}
                            onNombreChange={setNombre}
                            descripcion={descripcion}
                            onDescripcionChange={setDescripcion}
                            icono={icono}
                            colorIcono={colorIcono}
                            onIconoChange={(nuevoIcono, nuevoColor) => {
                                setIcono(nuevoIcono);
                                setColorIcono(nuevoColor);
                            }}
                            prioridad={prioridad}
                            onPrioridadChange={setPrioridad}
                            urgencia={urgencia}
                            onUrgenciaChange={setUrgencia}
                            fechaLimite={fechaLimite}
                            onFechaLimiteChange={setFechaLimite}
                            estado={estado}
                            onEstadoChange={setEstado}
                            errorNombre={errores.nombre}
                            modoEdicion={false}
                            adjuntos={adjuntos}
                            onAdjuntosChange={setAdjuntos}
                            hitos={hitos}
                            onHitosChange={setHitos}
                        />
                    </div>
                    <AccionesFormulario onCancelar={manejarCancelar} onGuardar={manejarGuardar} textoGuardar="Crear proyecto" />
                </>
            )}
        </Modal>
    );
}

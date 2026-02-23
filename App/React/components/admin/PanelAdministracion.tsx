/*
 * PanelAdministracion
 *
 * Panel principal de administración para gestionar usuarios.
 * Muestra lista de usuarios con filtros y acciones administrativas.
 * Incluye tab de feedback de usuarios premium.
 */

import {Users, MessageSquare} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {Boton} from '../ui/Boton';
import {FiltrosUsuarios} from './FiltrosUsuarios';
import {ListaUsuarios} from './ListaUsuarios';
import {ResumenAdmin} from './ResumenAdmin';
import {DetalleUsuario} from './DetalleUsuario';
import {ListaFeedbackAdmin} from './ListaFeedbackAdmin';
import {usePanelAdministracion} from '../../hooks/dashboard/usePanelAdministracion';

interface PanelAdministracionProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

export function PanelAdministracion({estaAbierto, onCerrar}: PanelAdministracionProps): JSX.Element | null {
    const {admin, usuarioDetalle, cargandoAccion, tabActiva, setTabActiva, manejarActivarPremium, manejarCancelarPremium, manejarExtenderTrial, manejarVerDetalle, cerrarDetalle} = usePanelAdministracion({estaAbierto});

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Panel de Administración" claseExtra="panelAdministracionModal">
            <div id="panel-administracion" className="panelAdministracion">
                {/* Tabs de navegación */}
                <div className="adminTabs">
                    <Boton type="button" variante="pestaña" activo={tabActiva === 'usuarios'} onClick={() => setTabActiva('usuarios')}>
                        <Users size={16} />
                        Usuarios
                    </Boton>
                    <Boton type="button" variante="pestaña" activo={tabActiva === 'feedback'} onClick={() => setTabActiva('feedback')}>
                        <MessageSquare size={16} />
                        Feedback
                    </Boton>
                </div>

                {/* Contenido según tab */}
                {tabActiva === 'usuarios' && (
                    <>
                        {/* Resumen global */}
                        {admin.resumen && <ResumenAdmin resumen={admin.resumen} />}

                        {/* Filtros */}
                        <FiltrosUsuarios filtros={admin.filtros} onFiltrarPlan={admin.filtrarPorPlan} onBuscar={admin.buscar} onReiniciar={admin.reiniciarFiltros} />

                        {/* Lista de usuarios */}
                        <ListaUsuarios usuarios={admin.usuarios} cargando={admin.cargando} error={admin.error} paginacion={admin.paginacion} onCambiarPagina={admin.cambiarPagina} onVerDetalle={manejarVerDetalle} onActivarPremium={u => manejarActivarPremium(u.id)} onCancelarPremium={u => manejarCancelarPremium(u.id)} cargandoAccion={cargandoAccion} />
                    </>
                )}

                {tabActiva === 'feedback' && <ListaFeedbackAdmin visible={tabActiva === 'feedback'} />}

                {/* Modal de detalle de usuario */}
                {usuarioDetalle && <DetalleUsuario usuario={usuarioDetalle} onCerrar={cerrarDetalle} onActivarPremium={d => manejarActivarPremium(usuarioDetalle.id, d)} onCancelarPremium={() => manejarCancelarPremium(usuarioDetalle.id)} onExtenderTrial={d => manejarExtenderTrial(usuarioDetalle.id, d)} cargando={cargandoAccion === usuarioDetalle.id} />}
            </div>
        </Modal>
    );
}

/*
 * ModalEquipos
 *
 * Modal principal para el sistema de equipos.
 * Contiene pestañas para: Solicitudes recibidas, Enviadas y Compañeros.
 * Lógica extraída a useModalEquipos hook
 */

import {Modal} from '../shared/Modal';
import {Boton} from '../ui/Boton';
import {FormularioSolicitud} from './FormularioSolicitud';
import {ListaSolicitudes} from './ListaSolicitudes';
import {ListaCompaneros} from './ListaCompaneros';
import {useModalEquipos} from '../../hooks/dashboard/useModalEquipos';
import '../../styles/dashboard/componentes/equipos.css';

interface ModalEquiposProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

export function ModalEquipos({estaAbierto, onCerrar}: ModalEquiposProps): JSX.Element | null {
    const {equipos, pestanaActiva, setPestanaActiva, manejarEnviarSolicitud, manejarAceptar, manejarRechazar, manejarEliminar} = useModalEquipos({estaAbierto});

    const renderizarContenido = () => {
        if (equipos.cargando) {
            return (
                <div className="equiposCargando">
                    <span className="equiposSpinner" />
                    <p>Cargando equipo...</p>
                </div>
            );
        }

        if (equipos.error) {
            return (
                <div className="equiposError">
                    <p>{equipos.error}</p>
                    <Boton type="button" variante="primario" onClick={() => equipos.cargarEquipo()}>
                        Reintentar
                    </Boton>
                </div>
            );
        }

        switch (pestanaActiva) {
            case 'recibidas':
                return <ListaSolicitudes solicitudes={equipos.recibidas} tipo="recibidas" onAceptar={manejarAceptar} onRechazar={manejarRechazar} cargando={equipos.enviando} />;
            case 'enviadas':
                return <ListaSolicitudes solicitudes={equipos.enviadas} tipo="enviadas" onCancelar={manejarEliminar} cargando={equipos.enviando} />;
            case 'companeros':
                return <ListaCompaneros companeros={equipos.companeros} onEliminar={manejarEliminar} cargando={equipos.enviando} />;
            default:
                return null;
        }
    };

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Mi Equipo" claseExtra="modalEquipos">
            <div id="modal-equipos-contenido" className="equiposContenido">
                {/* Formulario para enviar solicitud */}
                <FormularioSolicitud onEnviar={manejarEnviarSolicitud} enviando={equipos.enviando} />

                {/* Pestañas */}
                <div className="equiposPestanas">
                    <Boton type="button" variante="pestaña" activo={pestanaActiva === 'companeros'} onClick={() => setPestanaActiva('companeros')}>
                        Compañeros
                        {equipos.contadores.companeros > 0 && <span className="equiposContador">{equipos.contadores.companeros}</span>}
                    </Boton>
                    <Boton type="button" variante="pestaña" activo={pestanaActiva === 'recibidas'} onClick={() => setPestanaActiva('recibidas')}>
                        Recibidas
                        {equipos.contadores.recibidas > 0 && <span className="equiposContador alerta">{equipos.contadores.recibidas}</span>}
                    </Boton>
                    <Boton type="button" variante="pestaña" activo={pestanaActiva === 'enviadas'} onClick={() => setPestanaActiva('enviadas')}>
                        Enviadas
                        {equipos.contadores.enviadas > 0 && <span className="equiposContador">{equipos.contadores.enviadas}</span>}
                    </Boton>
                </div>

                {/* Contenido de la pestaña activa */}
                <div className="equiposListaContenedor">{renderizarContenido()}</div>
            </div>
        </Modal>
    );
}

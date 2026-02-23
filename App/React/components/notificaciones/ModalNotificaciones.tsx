/*
 * ModalNotificaciones
 *
 * Modal/Dropdown que muestra la lista de notificaciones del usuario.
 * Se abre al hacer clic en el icono de campana del header.
 * Marca automáticamente todas las notificaciones como leídas al abrirse.
 */

import {Bell} from 'lucide-react';
import type {Notificacion} from '../../types/dashboard';
import {ItemNotificacion} from './ItemNotificacion';
import {useModalNotificaciones} from '../../hooks/dashboard/useModalNotificaciones';

interface ModalNotificacionesProps {
    notificaciones: Notificacion[];
    noLeidas: number;
    total: number;
    cargando: boolean;
    cargandoPrimeraVez: boolean;
    posicionX: number;
    posicionY: number;
    onMarcarLeida: (id: number) => Promise<boolean>;
    onMarcarTodasLeidas: () => Promise<boolean>;
    onEliminar: (id: number) => Promise<boolean>;
    onClickNotificacion: (notificacion: Notificacion) => void;
    onCerrar: () => void;
}

export function ModalNotificaciones({notificaciones, noLeidas, total, cargando, cargandoPrimeraVez, posicionX, posicionY, onMarcarLeida, onMarcarTodasLeidas, onEliminar, onClickNotificacion, onCerrar}: ModalNotificacionesProps): JSX.Element {
    const {modalRef, calcularEstilo, manejarClickNotificacion, mostrarCargando} = useModalNotificaciones({noLeidas, posicionX, posicionY, notificaciones, cargandoPrimeraVez, onMarcarLeida, onMarcarTodasLeidas, onClickNotificacion, onCerrar});

    return (
        <div id="modal-notificaciones" className="modalNotificaciones" ref={modalRef} style={calcularEstilo()}>
            {/* Lista de notificaciones */}
            <div className="modalNotificaciones__lista">
                {mostrarCargando ? (
                    <div className="modalNotificaciones__estado">
                        <span className="modalNotificaciones__cargando">Cargando...</span>
                    </div>
                ) : notificaciones.length === 0 ? (
                    <div className="modalNotificaciones__estado">
                        <Bell size={32} className="modalNotificaciones__iconoVacio" />
                        <span className="modalNotificaciones__textoVacio">No tienes notificaciones</span>
                    </div>
                ) : (
                    notificaciones.map(notificacion => <ItemNotificacion key={notificacion.id} notificacion={notificacion} onClick={() => manejarClickNotificacion(notificacion)} onMarcarLeida={() => onMarcarLeida(notificacion.id)} onEliminar={() => onEliminar(notificacion.id)} />)
                )}
            </div>
        </div>
    );
}

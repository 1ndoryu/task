/*
 * ModalConfiguracionUsuario
 * Configuración global de preferencias del usuario.
 */

import {Modal, SeccionPanel} from '../shared';
import {Input} from '../ui';
import {useConfiguracionUsuario} from '../../stores/configuracionUsuarioStore';
import {Moon, Sun} from 'lucide-react';

interface ModalConfiguracionUsuarioProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

export function ModalConfiguracionUsuario({estaAbierto, onCerrar}: ModalConfiguracionUsuarioProps): JSX.Element {
    const {horaFinDia, setHoraFinDia} = useConfiguracionUsuario();

    const horasDisponibles = Array.from({length: 24}, (_, i) => i);

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Preferencias de Usuario">
            <div id="modal-config-usuario" className="formularioConfiguracion">
                {/* Configuración de Jornada */}
                <SeccionPanel titulo="Fin del día (Jornada)">
                    <p className="configuracionUsuarioDescripcion">
                        Define a qué hora termina realmente tu día.
                    </p>

                    <div className="configuracionUsuarioControles">
                        <div className="configuracionUsuarioInputContenedor">
                            <Input
                                tipo="number"
                                claseAdicional="configuracionUsuarioInput"
                                value={horaFinDia}
                                onChange={e => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0 && val <= 23) {
                                        setHoraFinDia(val);
                                    }
                                }}
                                min={0}
                                max={23}
                            />
                            <span className="configuracionUsuarioIcono">
                                <Moon size={14} />
                            </span>
                            <span className="configuracionUsuarioSufijo">:00</span>
                        </div>
                    </div>

                    <div className="configuracionUsuarioInfo">
                        <Sun size={14} className="configuracionUsuarioInfoIcono" />
                        <span className="configuracionUsuarioInfoTexto">
                            Tu nuevo día iniciará a las <strong>{String(horaFinDia).padStart(2, '0')}:00</strong>.
                        </span>
                    </div>
                </SeccionPanel>

                {/* Futuras configuraciones (Temas, Accesibilidad) irían aquí */}
            </div>
        </Modal>
    );
}

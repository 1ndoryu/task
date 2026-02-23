/*
 * ModalConfiguracionProyectos
 * Modal para ajustar preferencias de visualización de proyectos
 */

import {Modal} from '../../shared/Modal';
import {ToggleSwitch} from '../../shared/ToggleSwitch';
import type {ConfiguracionProyectos, OrdenamientoProyectos} from '../../../hooks/useConfiguracionProyectos';

interface ModalConfiguracionProyectosProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    configuracion: ConfiguracionProyectos;
    onToggleCompletados: () => void;
    onToggleTareasCompletadas: () => void;
    onToggleProgreso: () => void;
    onToggleModoCompacto: () => void;
}

export function ModalConfiguracionProyectos({estaAbierto, onCerrar, configuracion, onToggleCompletados, onToggleTareasCompletadas, onToggleProgreso, onToggleModoCompacto}: ModalConfiguracionProyectosProps): JSX.Element {
    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuración de Proyectos">
            <div className="contenedorOpcionesConfig">
                {/* Ocultar Proyectos Completados */}
                <div className="itemOpcionConfig">
                    <div className="detallesOpcionConfig">
                        <span className="tituloOpcionConfig">Ocultar proyectos completados</span>
                        <span className="descripcionOpcionConfig">Los proyectos finalizados no aparecerán en la lista principal</span>
                    </div>
                    <ToggleSwitch checked={configuracion.ocultarCompletados} onChange={onToggleCompletados} />
                </div>

                <div className="separadorOpcionesConfig" />

                {/* Ocultar Tareas Completadas */}
                <div className="itemOpcionConfig">
                    <div className="detallesOpcionConfig">
                        <span className="tituloOpcionConfig">Ocultar tareas completadas</span>
                        <span className="descripcionOpcionConfig">Las tareas finalizadas no aparecerán dentro de los proyectos</span>
                    </div>
                    <ToggleSwitch checked={configuracion.ocultarTareasCompletadas} onChange={onToggleTareasCompletadas} />
                </div>

                <div className="separadorOpcionesConfig" />

                {/* Mostrar Progreso */}
                <div className="itemOpcionConfig">
                    <div className="detallesOpcionConfig">
                        <span className="tituloOpcionConfig">Mostrar progreso</span>
                        <span className="descripcionOpcionConfig">Visualizar la barra de progreso de tareas</span>
                    </div>
                    <ToggleSwitch checked={configuracion.mostrarProgreso} onChange={onToggleProgreso} />
                </div>

                <div className="separadorOpcionesConfig" />

                {/* Modo Compacto */}
                <div className="itemOpcionConfig">
                    <div className="detallesOpcionConfig">
                        <span className="tituloOpcionConfig">Modo Compacto</span>
                        <span className="descripcionOpcionConfig">Reducir el tamaño de la fuente y el espaciado</span>
                    </div>
                    <ToggleSwitch checked={configuracion.modoCompacto} onChange={onToggleModoCompacto} />
                </div>
            </div>
        </Modal>
    );
}

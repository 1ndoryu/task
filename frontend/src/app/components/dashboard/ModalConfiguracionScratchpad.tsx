/*
 * ModalConfiguracionScratchpad
 * Modal para ajustar opciones del Scratchpad
 */

import {Modal} from '../shared/Modal';
import {Select} from '../ui';
import type {ConfiguracionScratchpad, TamanoFuente, AlturaScratchpad} from '../../hooks/useConfiguracionScratchpad';

interface ModalConfiguracionScratchpadProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    configuracion: ConfiguracionScratchpad;
    onCambiarFuente: (t: TamanoFuente) => void;
    onCambiarAltura: (a: AlturaScratchpad) => void;
    onCambiarIntervalo: (i: number) => void;
}

export function ModalConfiguracionScratchpad({estaAbierto, onCerrar, configuracion, onCambiarFuente, onCambiarAltura: _onCambiarAltura, onCambiarIntervalo}: ModalConfiguracionScratchpadProps): JSX.Element {
    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuración Scratchpad">
            <div className="contenedorOpcionesConfig">
                {/* Fuente */}
                <div className="itemOpcionConfig">
                    <div className="detallesOpcionConfig">
                        <span className="tituloOpcionConfig">Tamaño de fuente</span>
                        <span className="descripcionOpcionConfig">Ajustar legibilidad del texto</span>
                    </div>
                    {/* Reutilizamos selectOpcionConfig si existe, o definimos inline si es critico */}
                    <Select claseAdicional="selectOpcionConfig" value={configuracion.tamanoFuente} onChange={e => onCambiarFuente(e.target.value as TamanoFuente)} opciones={[{valor: 'pequeno', etiqueta: 'Pequeño'}, {valor: 'normal', etiqueta: 'Normal'}, {valor: 'grande', etiqueta: 'Grande'}]} />
                </div>

                <div className="separadorOpcionesConfig" />

                {/* Intervalo Guardado */}
                <div className="itemOpcionConfig">
                    <div className="detallesOpcionConfig">
                        <span className="tituloOpcionConfig">Auto-guardado</span>
                        <span className="descripcionOpcionConfig">Tiempo de espera antes de guardar</span>
                    </div>
                    <Select claseAdicional="selectOpcionConfig" value={configuracion.autoGuardadoIntervalo} onChange={e => onCambiarIntervalo(Number(e.target.value))} opciones={[{valor: 500, etiqueta: 'Rápido (0.5s)'}, {valor: 1500, etiqueta: 'Normal (1.5s)'}, {valor: 3000, etiqueta: 'Relax (3s)'}]} />
                </div>
            </div>
        </Modal>
    );
}

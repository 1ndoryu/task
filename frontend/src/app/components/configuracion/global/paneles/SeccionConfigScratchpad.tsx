/* [233A-27] Configuración del scratchpad (tamaño de fuente y auto-guardado). */
import {Select} from '../../../ui';
import {useConfiguracionScratchpad} from '../../../../hooks/useConfiguracionScratchpad';
import type {TamanoFuente} from '../../../../hooks/useConfiguracionScratchpad';

export function SeccionConfigScratchpad(): JSX.Element {
    const {configuracion, cambiarTamanoFuente, cambiarAutoGuardado} = useConfiguracionScratchpad();
    return (
        <div className="contenedorOpcionesConfig">
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Tamaño de fuente</span>
                    <span className="descripcionOpcionConfig">Ajustar legibilidad del texto</span>
                </div>
                <Select claseAdicional="selectOpcionConfig" value={configuracion.tamanoFuente} onChange={e => cambiarTamanoFuente(e.target.value as TamanoFuente)} opciones={[{valor: 'pequeno', etiqueta: 'Pequeño'}, {valor: 'normal', etiqueta: 'Normal'}, {valor: 'grande', etiqueta: 'Grande'}]} />
            </div>
            <div className="separadorOpcionesConfig" />
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Auto-guardado</span>
                    <span className="descripcionOpcionConfig">Tiempo de espera antes de guardar</span>
                </div>
                <Select claseAdicional="selectOpcionConfig" value={configuracion.autoGuardadoIntervalo} onChange={e => cambiarAutoGuardado(Number(e.target.value))} opciones={[{valor: 500, etiqueta: 'Rápido (0.5s)'}, {valor: 1500, etiqueta: 'Normal (1.5s)'}, {valor: 3000, etiqueta: 'Relax (3s)'}]} />
            </div>
        </div>
    );
}

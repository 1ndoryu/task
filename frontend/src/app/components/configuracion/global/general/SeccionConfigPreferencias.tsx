/* [233A-27] Preferencias generales: fin del día (jornada). */
import {Moon, Sun} from 'lucide-react';
import {SeccionPanel} from '../../../shared';
import {Input} from '../../../ui';
import {useConfiguracionUsuario} from '../../../../stores/configuracionUsuarioStore';

export function SeccionConfigPreferencias(): JSX.Element {
    const {horaFinDia, setHoraFinDia} = useConfiguracionUsuario();
    return (
        /* [318A-3 §12.3] Clase CSS renombrada de `formularioConfiguracion` (colisionaba con
 * el componente FormularioConfiguracion) a `formularioConfigGlobal`. Es un marcador
 * semantico de contenedor sin estilos propios: cero cambio visual. */
        <div className="formularioConfigGlobal">
            <SeccionPanel titulo="Fin del día (Jornada)">
                <p className="configuracionUsuarioDescripcion">Define a qué hora termina realmente tu día.</p>
                <div className="configuracionUsuarioControles">
                    <div className="configuracionUsuarioInputContenedor">
                        <Input tipo="number" claseAdicional="configuracionUsuarioInput" value={horaFinDia} onChange={e => { const val = parseInt(e.target.value); if (!isNaN(val) && val >= 0 && val <= 23) setHoraFinDia(val); }} min={0} max={23} />
                        <span className="configuracionUsuarioIcono"><Moon size={14} /></span>
                        <span className="configuracionUsuarioSufijo">:00</span>
                    </div>
                </div>
                <div className="configuracionUsuarioInfo">
                    <Sun size={14} className="configuracionUsuarioInfoIcono" />
                    <span className="configuracionUsuarioInfoTexto">Tu nuevo día iniciará a las <strong>{String(horaFinDia).padStart(2, '0')}:00</strong>.</span>
                </div>
            </SeccionPanel>
        </div>
    );
}

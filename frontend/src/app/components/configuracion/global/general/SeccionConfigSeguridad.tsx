/* [233A-27] Configuración de seguridad: conexión HTTPS y cifrado E2E. */
import {useState} from 'react';
import {Lock, Unlock, Shield, ShieldCheck} from 'lucide-react';
import {ToggleSwitch} from '../../../shared/ToggleSwitch';
import {useCifrado} from '../../../../hooks';
import {useSuscripcionStore} from '../../../../stores/suscripcionStore';

export function SeccionConfigSeguridad(): JSX.Element {
    const {estadoCifrado, cargando, error, toggleCifrado} = useCifrado();
    const [procesando, setProcesando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);
    const esHttps = window.location.protocol === 'https:';
    const esPremium = useSuscripcionStore((s: {esPremium: () => boolean}) => s.esPremium());

    const handleToggle = async (nuevoValor: boolean) => {
        setProcesando(true);
        setMensajeExito(null);
        const exito = await toggleCifrado(nuevoValor);
        if (exito) {
            setMensajeExito(nuevoValor ? 'Cifrado activado' : 'Cifrado desactivado');
            setTimeout(() => setMensajeExito(null), 3000);
        }
        setProcesando(false);
    };

    return (
        <div className="panelSeguridadContenido">
            <section className="seccionSeguridad">
                <div className="seccionSeguridadEncabezado">
                    <span className={`iconoSeguridad ${esHttps ? 'seguro' : 'advertencia'}`}>{esHttps ? <Lock size={18} /> : <Unlock size={18} />}</span>
                    <div className="seccionSeguridadInfo">
                        <h3>Conexión HTTPS</h3>
                        <p className="descripcionSeguridad">{esHttps ? 'Conexión cifrada. Los datos viajan de forma segura.' : 'Conexión no segura. Configura HTTPS para proteger los datos.'}</p>
                    </div>
                    <span className={`estadoIndicador ${esHttps ? 'activo' : 'inactivo'}`}>{esHttps ? 'Seguro' : 'Inseguro'}</span>
                </div>
            </section>
            <section className="seccionSeguridad">
                <div className="seccionSeguridadEncabezado">
                    <span className={`iconoSeguridad ${estadoCifrado?.habilitado ? 'seguro' : ''}`}>{estadoCifrado?.habilitado ? <ShieldCheck size={18} /> : <Shield size={18} />}</span>
                    <div className="seccionSeguridadInfo">
                        <h3>Cifrado E2E</h3>
                        <p className="descripcionSeguridad">
                            Protege tus datos con cifrado AES-256-GCM.
                            {!esPremium && <span className="notaFree"> (FREE: solo texto. Premium: completo)</span>}
                        </p>
                    </div>
                </div>
                <div className="controlCifrado">
                    {cargando ? <span className="cargandoIndicador">verificando...</span> : error ? <span className="errorIndicador">{error}</span> : (
                        <>
                            <ToggleSwitch checked={estadoCifrado?.habilitado ?? false} onChange={handleToggle} disabled={procesando} />
                            <span className="etiquetaCifrado">{estadoCifrado?.habilitado ? 'ENABLED' : 'DISABLED'}</span>
                            {procesando && <span className="procesandoIndicador">procesando...</span>}
                            {mensajeExito && <span className="exitoIndicador">{mensajeExito}</span>}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}

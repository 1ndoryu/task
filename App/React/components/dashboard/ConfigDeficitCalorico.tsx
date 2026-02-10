/*
 * ConfigDeficitCalorico.tsx
 * Formulario de configuración del plugin de déficit calórico
 * Permite configurar datos del usuario para TMB y API Key de Gemini
 */

import {useState} from 'react';
import {Save, Eye, EyeOff} from 'lucide-react';
import {useDeficitCaloricoStore} from '../../stores/deficitCaloricoStore';
import {calcularTDEE, obtenerMetodoCalculo} from '../../utils/calculoTMB';
import type {DatosUsuarioTMB} from '../../types/deficitCalorico';

interface ConfigDeficitCaloricoProps {
    onCerrar: () => void;
}

export function ConfigDeficitCalorico({onCerrar}: ConfigDeficitCaloricoProps): JSX.Element {
    const {datosUsuario, apiKeyGemini, guardarDatosUsuario, guardarApiKey} = useDeficitCaloricoStore();

    const [datos, setDatos] = useState<DatosUsuarioTMB>({...datosUsuario});
    const [apiKey, setApiKey] = useState(apiKeyGemini);
    const [mostrarKey, setMostrarKey] = useState(false);

    const tdeePreview = calcularTDEE(datos);
    const metodo = obtenerMetodoCalculo(datos);

    const manejarGuardar = () => {
        guardarDatosUsuario(datos);
        guardarApiKey(apiKey);
        onCerrar();
    };

    const actualizarCampo = (campo: keyof DatosUsuarioTMB, valor: string) => {
        if (campo === 'sexo') {
            setDatos(prev => ({...prev, sexo: valor as 'masculino' | 'femenino'}));
            return;
        }
        const numerico = valor === '' ? undefined : Number(valor);
        setDatos(prev => ({...prev, [campo]: numerico}));
    };

    return (
        <div className="configDeficitContenido">
            <div className="configDeficitSeccion">
                <h4 className="configDeficitSeccionTitulo">Datos personales (para TMB)</h4>
                <p className="configDeficitSeccionNota">Introduce los datos que tengas disponibles (mínimo 2-3)</p>

                <div className="configDeficitCampos">
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Altura (cm)</label>
                        <input type="number" className="configDeficitInput" placeholder="170" value={datos.altura ?? ''} onChange={e => actualizarCampo('altura', e.target.value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Peso (kg)</label>
                        <input type="number" className="configDeficitInput" placeholder="70" value={datos.peso ?? ''} onChange={e => actualizarCampo('peso', e.target.value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Cintura (cm)</label>
                        <input type="number" className="configDeficitInput" placeholder="80" value={datos.cintura ?? ''} onChange={e => actualizarCampo('cintura', e.target.value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Edad</label>
                        <input type="number" className="configDeficitInput" placeholder="30" value={datos.edad ?? ''} onChange={e => actualizarCampo('edad', e.target.value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Sexo</label>
                        <select className="configDeficitInput" value={datos.sexo ?? ''} onChange={e => actualizarCampo('sexo', e.target.value)}>
                            <option value="">Seleccionar</option>
                            <option value="masculino">Masculino</option>
                            <option value="femenino">Femenino</option>
                        </select>
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Ejercicio (sesiones/semana)</label>
                        <input type="number" className="configDeficitInput" placeholder="3" value={datos.ejercicioSesiones ?? ''} onChange={e => actualizarCampo('ejercicioSesiones', e.target.value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Minutos por sesión</label>
                        <input type="number" className="configDeficitInput" placeholder="45" value={datos.ejercicioMinutos ?? ''} onChange={e => actualizarCampo('ejercicioMinutos', e.target.value)} />
                    </div>
                </div>

                {tdeePreview && (
                    <div className="configDeficitPreview">
                        <span className="configDeficitPreviewLabel">TDEE estimado:</span>
                        <span className="configDeficitPreviewValor">{tdeePreview} kcal/día</span>
                        <span className="configDeficitPreviewMetodo">({metodo})</span>
                    </div>
                )}
            </div>

            <div className="configDeficitSeccion">
                <h4 className="configDeficitSeccionTitulo">API Key de Gemini</h4>
                <p className="configDeficitSeccionNota">Necesaria para estimar calorías con IA desde fotos o texto</p>

                <div className="configDeficitApiKey">
                    <input
                        type={mostrarKey ? 'text' : 'password'}
                        className="configDeficitInput configDeficitInputApiKey"
                        placeholder="AIzaSy..."
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                    />
                    <button type="button" className="configDeficitBotonOjo" onClick={() => setMostrarKey(!mostrarKey)} title={mostrarKey ? 'Ocultar' : 'Mostrar'}>
                        {mostrarKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                </div>
            </div>

            <div className="configDeficitAcciones">
                <button type="button" className="configDeficitBotonCancelar" onClick={onCerrar}>
                    Cancelar
                </button>
                <button type="button" className="configDeficitBotonGuardar" onClick={manejarGuardar}>
                    <Save size={14} />
                    <span>Guardar</span>
                </button>
            </div>
        </div>
    );
}

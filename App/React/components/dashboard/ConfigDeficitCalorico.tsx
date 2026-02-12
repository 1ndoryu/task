/*
 * ConfigDeficitCalorico.tsx
 * Formulario de configuración del plugin de déficit calórico
 * Permite configurar datos del usuario para TMB y API Keys
 */

import {useState} from 'react';
import {Save, Eye, EyeOff} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {useDeficitCaloricoStore} from '../../stores/deficitCaloricoStore';
import {calcularTDEE, obtenerMetodoCalculo} from '../../utils/calculoTMB';
import type {DatosUsuarioTMB} from '../../types/deficitCalorico';

interface ConfigDeficitCaloricoProps {
    onCerrar: () => void;
}

export function ConfigDeficitCalorico({onCerrar}: ConfigDeficitCaloricoProps): JSX.Element {
    const {datosUsuario, apiKeyGemini, apiKeyCalorieNinjas, guardarDatosUsuario, guardarApiKey} = useDeficitCaloricoStore();

    const [datos, setDatos] = useState<DatosUsuarioTMB>({...datosUsuario});
    const [keyGroq, setKeyGroq] = useState(apiKeyGemini);
    const [keyNinjas, setKeyNinjas] = useState(apiKeyCalorieNinjas || '');
    const [mostrarKeyGroq, setMostrarKeyGroq] = useState(false);
    const [mostrarKeyNinjas, setMostrarKeyNinjas] = useState(false);

    const tdeePreview = calcularTDEE(datos);
    const metodo = obtenerMetodoCalculo(datos);

    const manejarGuardar = () => {
        guardarDatosUsuario(datos);
        guardarApiKey(keyGroq, keyNinjas);
        onCerrar();
    };

    const actualizarCampo = (campo: keyof DatosUsuarioTMB, valor: string) => {
        if (campo === 'sexo') {
            setDatos(prev => ({...prev, sexo: valor as 'masculino' | 'femenino'}));
            return;
        }
        if (campo === 'objetivoDeficit') {
            setDatos(prev => ({...prev, objetivoDeficit: valor as DatosUsuarioTMB['objetivoDeficit']}));
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

                    <div className="configDeficitCampo configDeficitCampo--full">
                        <label className="configDeficitLabel">Objetivo de Déficit</label>
                        <select className="configDeficitInput" value={datos.objetivoDeficit ?? 'moderado'} onChange={e => actualizarCampo('objetivoDeficit', e.target.value)}>
                            <option value="bajo">Bajo (-250 kcal/día)</option>
                            <option value="moderado">Moderado (-500 kcal/día)</option>
                            <option value="alto">Alto (-750 kcal/día)</option>
                            <option value="peligroso">Peligroso / Extremo (-1000 kcal/día)</option>
                        </select>
                        <p className="configDeficitAyuda">Define qué tan agresiva será la reducción calórica.</p>
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
                <h4 className="configDeficitSeccionTitulo">API Key de Groq / OpenAI (IA)</h4>
                <p className="configDeficitSeccionNota">Necesaria para traducir tus comidas a inglés (motor de búsqueda).</p>

                <div className="configDeficitApiKey">
                    <input type={mostrarKeyGroq ? 'text' : 'password'} className="configDeficitInput configDeficitInputApiKey" placeholder="gsk_..." value={keyGroq} onChange={e => setKeyGroq(e.target.value)} />
                    <Boton type="button" claseAdicional="configDeficitBotonOjo" onClick={() => setMostrarKeyGroq(!mostrarKeyGroq)} title={mostrarKeyGroq ? 'Ocultar' : 'Mostrar'}>
                        {mostrarKeyGroq ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Boton>
                </div>
            </div>

            <div className="configDeficitSeccion">
                <h4 className="configDeficitSeccionTitulo">API Key de CalorieNinjas (Datos)</h4>
                <p className="configDeficitSeccionNota">Necesaria para obtener la información nutricional precisa.</p>

                <div className="configDeficitApiKey">
                    <input type={mostrarKeyNinjas ? 'text' : 'password'} className="configDeficitInput configDeficitInputApiKey" placeholder="Tu API Key de CalorieNinjas..." value={keyNinjas} onChange={e => setKeyNinjas(e.target.value)} />
                    <Boton type="button" claseAdicional="configDeficitBotonOjo" onClick={() => setMostrarKeyNinjas(!mostrarKeyNinjas)} title={mostrarKeyNinjas ? 'Ocultar' : 'Mostrar'}>
                        {mostrarKeyNinjas ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Boton>
                </div>
            </div>

            <div className="configDeficitAcciones">
                <Boton type="button" claseAdicional="configDeficitBotonCancelar" onClick={onCerrar}>
                    Cancelar
                </Boton>
                <Boton type="button" claseAdicional="configDeficitBotonGuardar" onClick={manejarGuardar}>
                    <Save size={14} />
                    <span>Guardar</span>
                </Boton>
            </div>
        </div>
    );
}

/*
 * ConfigDeficitCalorico.tsx
 * Formulario de configuración del plugin de déficit calórico
 * Permite configurar datos del usuario para TMB y API Keys
 * Lógica extraída a useConfigDeficitCalorico (SRP)
 */

import {Save, Eye, EyeOff} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {Input} from '../ui/Input';
import {Select} from '../ui/Select';
import {useConfigDeficitCalorico, opcionesSexo, opcionesObjetivoDeficit} from '../../hooks/dashboard/useConfigDeficitCalorico';

interface ConfigDeficitCaloricoProps {
    onCerrar: () => void;
}

export function ConfigDeficitCalorico({onCerrar}: ConfigDeficitCaloricoProps): JSX.Element {
    const {
        datos,
        keyGroq, setKeyGroq,
        keyNinjas, setKeyNinjas,
        mostrarKeyGroq,
        mostrarKeyNinjas,
        tdeePreview,
        metodo,
        manejarGuardar,
        actualizarCampo,
        alternarKeyGroq,
        alternarKeyNinjas,
    } = useConfigDeficitCalorico({onCerrar});

    return (
        <div className="configDeficitContenido">
            <div className="configDeficitSeccion">
                <h4 className="configDeficitSeccionTitulo">Datos personales (para TMB)</h4>
                <p className="configDeficitSeccionNota">Introduce los datos que tengas disponibles (mínimo 2-3)</p>

                <div className="configDeficitCampos">
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Altura (cm)</label>
                        <Input tipo="number" claseAdicional="configDeficitInput" placeholder="170" value={datos.altura ?? ''} onChange={e => actualizarCampo('altura', (e.target as HTMLInputElement).value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Peso (kg)</label>
                        <Input tipo="number" claseAdicional="configDeficitInput" placeholder="70" value={datos.peso ?? ''} onChange={e => actualizarCampo('peso', (e.target as HTMLInputElement).value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Cintura (cm)</label>
                        <Input tipo="number" claseAdicional="configDeficitInput" placeholder="80" value={datos.cintura ?? ''} onChange={e => actualizarCampo('cintura', (e.target as HTMLInputElement).value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Edad</label>
                        <Input tipo="number" claseAdicional="configDeficitInput" placeholder="30" value={datos.edad ?? ''} onChange={e => actualizarCampo('edad', (e.target as HTMLInputElement).value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Sexo</label>
                        <Select claseAdicional="configDeficitInput" placeholder="Seleccionar" opciones={opcionesSexo} value={datos.sexo ?? ''} onChange={e => actualizarCampo('sexo', e.target.value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Ejercicio a la semana</label>
                        <Input tipo="number" claseAdicional="configDeficitInput" placeholder="3" value={datos.ejercicioSesiones ?? ''} onChange={e => actualizarCampo('ejercicioSesiones', (e.target as HTMLInputElement).value)} />
                    </div>
                    <div className="configDeficitCampo">
                        <label className="configDeficitLabel">Minutos por sesión</label>
                        <Input tipo="number" claseAdicional="configDeficitInput" placeholder="45" value={datos.ejercicioMinutos ?? ''} onChange={e => actualizarCampo('ejercicioMinutos', (e.target as HTMLInputElement).value)} />
                    </div>

                    <div className="configDeficitCampo configDeficitCampo--full">
                        <label className="configDeficitLabel">Objetivo de Déficit</label>
                        <Select claseAdicional="configDeficitInput" opciones={opcionesObjetivoDeficit} value={datos.objetivoDeficit ?? 'moderado'} onChange={e => actualizarCampo('objetivoDeficit', e.target.value)} />
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
                    <Input tipo={mostrarKeyGroq ? 'text' : 'password'} claseAdicional="configDeficitInput configDeficitInputApiKey" placeholder="gsk_..." value={keyGroq} onChange={e => setKeyGroq((e.target as HTMLInputElement).value)} />
                    <Boton type="button" variante="icono" onClick={alternarKeyGroq} title={mostrarKeyGroq ? 'Ocultar' : 'Mostrar'}>
                        {mostrarKeyGroq ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Boton>
                </div>
            </div>

            <div className="configDeficitSeccion">
                <h4 className="configDeficitSeccionTitulo">API Key de API Ninjas (Datos)</h4>
                <p className="configDeficitSeccionNota">Necesaria para obtener la información nutricional precisa.</p>

                <div className="configDeficitApiKey">
                    <Input tipo={mostrarKeyNinjas ? 'text' : 'password'} claseAdicional="configDeficitInput configDeficitInputApiKey" placeholder="Tu API Key de API Ninjas..." value={keyNinjas} onChange={e => setKeyNinjas((e.target as HTMLInputElement).value)} />
                    <Boton type="button" variante="icono" onClick={alternarKeyNinjas} title={mostrarKeyNinjas ? 'Ocultar' : 'Mostrar'}>
                        {mostrarKeyNinjas ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Boton>
                </div>
            </div>

            <div className="configDeficitAcciones">
                <Boton type="button" variante="secundario" onClick={onCerrar}>
                    Cancelar
                </Boton>
                <Boton type="button" variante="primario" onClick={manejarGuardar}>
                    <Save size={14} />
                    <span>Guardar</span>
                </Boton>
            </div>
        </div>
    );
}

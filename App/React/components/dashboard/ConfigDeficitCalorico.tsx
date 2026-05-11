/*
 * ConfigDeficitCalorico.tsx
 * Formulario de configuración del plugin de déficit calórico
 * Permite configurar datos del usuario para TMB; la IA se centraliza en Asistente IA.
 * Lógica extraída a useConfigDeficitCalorico (SRP)
 */

import {Save} from 'lucide-react';
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
        tieneApiKey,
        tdeePreview,
        metodo,
        manejarGuardar,
        actualizarCampo,
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

            {/* [105A-1] API centralizada — usuarios normales configuran Asistente IA; admin usa env. */}
            <div className="configDeficitSeccion">
                <h4 className="configDeficitSeccionTitulo">Proveedor de IA</h4>
                <p className="configDeficitSeccionNota">
                    {tieneApiKey
                        ? 'IA disponible desde Configuración → Asistente IA o desde las variables de entorno del admin.'
                        : 'Configura Groq o DeepSeek en Configuración → Asistente IA para usar el cálculo por IA.'}
                </p>
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

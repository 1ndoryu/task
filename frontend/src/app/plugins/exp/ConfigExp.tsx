/*
 * plugins/exp/ConfigExp.tsx
 * Configuración del plugin EXP (se abre desde ModalPlugins / SeccionConfigPlugins
 * cuando el plugin está activo). Ajusta: dificultad automática, vida máxima,
 * penalización por incumplimiento, ventana de incumplimientos y multiplicadores.
 */

import {useExpStore} from './store';
import {Boton} from '../../components/ui/Boton';
function FilaConfig({etiqueta, ayuda, children}: {etiqueta: string; ayuda?: string; children: React.ReactNode}): JSX.Element {
    return (
        <label className="configExpFila">
            <span className="configExpEtiqueta">{etiqueta}</span>
            {ayuda && <span className="configExpAyuda">{ayuda}</span>}
            {children}
        </label>
    );
}

function SelectorMultiplicador({valor, onChange}: {valor: number; onChange: (v: number) => void}): JSX.Element {
    return (
        <input
            type="range"
            min={0.5}
            max={3}
            step={0.25}
            className="configExpRange"
            value={valor}
            onChange={e => onChange(Number(e.target.value))}
        />
    );
}

export function ConfigExp({onCerrar}: {onCerrar: () => void}): JSX.Element {
    const config = useExpStore(s => s.config);
    const actualizarConfig = useExpStore(s => s.actualizarConfig);
    const vida = useExpStore(s => s.vida);
    const exp = useExpStore(s => s.exp);
    const nivel = useExpStore(s => s.nivel);

    return (
        <div className="configExp">
            <div className="configExpResumen">
                <span>Vida: <strong>{Math.round(vida)} / {config.vidaMaxima}</strong></span>
                <span>Nivel: <strong>{nivel}</strong></span>
                <span>EXP: <strong>{exp}</strong></span>
            </div>

            <FilaConfig etiqueta="Dificultad automática por IA" ayuda="Estima la dificultad de hábitos/tareas nuevos sin pedirla manualmente. Solo actúa con el plugin activo.">
                <input
                    type="checkbox"
                    className="configExpCheckbox"
                    checked={config.dificultadAutomatica}
                    onChange={e => actualizarConfig({dificultadAutomatica: e.target.checked})}
                />
            </FilaConfig>

            <FilaConfig etiqueta={`Vida máxima: ${config.vidaMaxima}`} ayuda="La vida empieza en este valor y baja por incumplimientos.">
                <input
                    type="range"
                    min={50}
                    max={200}
                    step={10}
                    className="configExpRange"
                    value={config.vidaMaxima}
                    onChange={e => actualizarConfig({vidaMaxima: Number(e.target.value)})}
                />
            </FilaConfig>

            <FilaConfig etiqueta={`Penalización por incumplimiento: ×${config.penalizacionFraccion}`} ayuda="Fracción de (dificultad × importancia) que resta cada día no cumplido.">
                <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="configExpRange"
                    value={config.penalizacionFraccion}
                    onChange={e => actualizarConfig({penalizacionFraccion: Number(e.target.value)})}
                />
            </FilaConfig>

            <FilaConfig etiqueta={`Ventana de incumplimientos: ${config.ventanaIncumplimientos} días`} ayuda="Cuántos días hacia atrás cuentan para la vida.">
                <input
                    type="range"
                    min={3}
                    max={30}
                    step={1}
                    className="configExpRange"
                    value={config.ventanaIncumplimientos}
                    onChange={e => actualizarConfig({ventanaIncumplimientos: Number(e.target.value)})}
                />
            </FilaConfig>

            <div className="configExpMultiplicadores">
                <FilaConfig etiqueta={`Multiplicador hábito: ×${config.multHabito}`}>
                    <SelectorMultiplicador valor={config.multHabito} onChange={multHabito => actualizarConfig({multHabito})} />
                </FilaConfig>
                <FilaConfig etiqueta={`Multiplicador tarea: ×${config.multTarea}`}>
                    <SelectorMultiplicador valor={config.multTarea} onChange={multTarea => actualizarConfig({multTarea})} />
                </FilaConfig>
            </div>

            <div className="configExpAcciones">
                <Boton type="button" variante="primario" onClick={onCerrar}>Listo</Boton>
            </div>
        </div>
    );
}

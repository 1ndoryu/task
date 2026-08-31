/*
 * plugins/exp/ConfigExp.tsx
 * Configuración del plugin EXP (se abre desde ModalPlugins / SeccionConfigPlugins
 * cuando el plugin está activo). Ajusta: dificultad automática, vida máxima,
 * penalización por incumplimiento, ventana de incumplimientos y multiplicadores.
 *
 * [27-08-2026] Reestructurado con el mismo lenguaje visual que la configuración
 * de déficit calórico (secciones con título + nota, preview, pie con acciones):
 * el checkbox pasó a un toggle switch (igual que el de activar plugins) y los
 * rangos se estilizan custom en vez del input nativo con accent-color.
 */

import {useExpStore} from './store';
import {ToggleSwitch} from '../../components/shared/ToggleSwitch';
import {Boton} from '../../components/ui/Boton';

function FilaRange({etiqueta, ayuda, min, max, step, valor, onChange}: {
    etiqueta: string;
    ayuda?: string;
    min: number;
    max: number;
    step: number;
    valor: number;
    onChange: (v: number) => void;
}): JSX.Element {
    return (
        <label className="configExpCampo">
            <span className="configExpLabel">{etiqueta}</span>
            {ayuda && <span className="configExpAyuda">{ayuda}</span>}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                className="configExpRange"
                value={valor}
                onChange={e => onChange(Number(e.target.value))}
            />
        </label>
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
            <div className="configExpPreview">
                <span>Vida: <strong>{Math.round(vida)} / {config.vidaMaxima}</strong></span>
                <span>Nivel: <strong>{nivel}</strong></span>
                <span>EXP: <strong>{exp}</strong></span>
            </div>

            <div className="configExpSeccion">
                <h4 className="configExpSeccionTitulo">Dificultad automática</h4>
                <p className="configExpSeccionNota">Estima la dificultad de hábitos/tareas nuevos sin pedirla manualmente. Solo actúa con el plugin activo.</p>
                <div className="configExpFilaToggle">
                    <span className="configExpLabel">Dificultad automática por IA</span>
                    <ToggleSwitch checked={config.dificultadAutomatica} onChange={v => actualizarConfig({dificultadAutomatica: v})} aria-label="Dificultad automática por IA" />
                </div>
            </div>

            <div className="configExpSeccion">
                <h4 className="configExpSeccionTitulo">Vida</h4>
                <FilaRange
                    etiqueta={`Vida máxima: ${config.vidaMaxima}`}
                    ayuda="La vida empieza en este valor y baja por incumplimientos."
                    min={50}
                    max={200}
                    step={10}
                    valor={config.vidaMaxima}
                    onChange={v => actualizarConfig({vidaMaxima: v})}
                />
                <FilaRange
                    etiqueta={`Penalización por incumplimiento: ×${config.penalizacionFraccion}`}
                    ayuda="Fracción de (dificultad × importancia) que resta cada día no cumplido."
                    min={0.1}
                    max={1}
                    step={0.1}
                    valor={config.penalizacionFraccion}
                    onChange={v => actualizarConfig({penalizacionFraccion: v})}
                />
                <FilaRange
                    etiqueta={`Ventana de incumplimientos: ${config.ventanaIncumplimientos} días`}
                    ayuda="Cuántos días hacia atrás cuentan para la vida."
                    min={3}
                    max={30}
                    step={1}
                    valor={config.ventanaIncumplimientos}
                    onChange={v => actualizarConfig({ventanaIncumplimientos: v})}
                />
            </div>

            <div className="configExpSeccion">
                <h4 className="configExpSeccionTitulo">Multiplicadores</h4>
                <p className="configExpSeccionNota">Cuánta EXP da cada tipo de entidad: dificultad × importancia × multiplicador.</p>
                <div className="configExpMultiplicadores">
                    <FilaRange etiqueta={`Hábito: ×${config.multHabito}`} min={0.5} max={3} step={0.25} valor={config.multHabito} onChange={v => actualizarConfig({multHabito: v})} />
                    <FilaRange etiqueta={`Tarea: ×${config.multTarea}`} min={0.5} max={3} step={0.25} valor={config.multTarea} onChange={v => actualizarConfig({multTarea: v})} />
                </div>
            </div>

            <div className="configExpAcciones">
                <Boton type="button" variante="primario" onClick={onCerrar}>Listo</Boton>
            </div>
        </div>
    );
}

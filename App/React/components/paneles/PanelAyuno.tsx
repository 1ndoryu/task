/*
 * PanelAyuno
 * Panel visual de ayuno intermitente con temporizador circular
 * Plugin: se registra dinámicamente al activar el plugin de ayuno
 *
 * Tres estados visuales:
 * - Inactivo con historial: "Último ayuno: Xh Xm"
 * - Activo: "Tiempo transcurrido: Xh Xm" con progreso circular
 * - Inactivo sin historial: mensaje de bienvenida
 */

import {useMemo} from 'react';
import {Play, Square, RotateCcw, Settings} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {useAyuno} from '../../hooks/useAyuno';
import {usePluginsStore} from '../../stores/pluginsStore';
import type {ConfiguracionAyuno} from '../../types/ayuno';

interface PanelAyunoProps {
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
}

const PLUGIN_ID = 'ayuno';
const RADIO = 70;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/* Opciones de duración preconfiguradas */
const DURACIONES_PRESET = [14, 16, 18, 20] as const;

/*
 * Componente del círculo SVG con progreso animado
 */
function CirculoProgreso({porcentaje, estaActivo}: {porcentaje: number; estaActivo: boolean}): JSX.Element {
    const offset = CIRCUNFERENCIA - (porcentaje / 100) * CIRCUNFERENCIA;

    return (
        <svg className="panelAyunoCirculo" viewBox="0 0 160 160" width="160" height="160">
            {/* Fondo del círculo */}
            <circle
                className="panelAyunoCirculoFondo"
                cx="80"
                cy="80"
                r={RADIO}
                fill="none"
                strokeWidth="4"
            />
            {/* Progreso */}
            {estaActivo && (
                <circle
                    className="panelAyunoCirculoProgreso"
                    cx="80"
                    cy="80"
                    r={RADIO}
                    fill="none"
                    strokeWidth="4"
                    strokeDasharray={CIRCUNFERENCIA}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                />
            )}
        </svg>
    );
}

/*
 * Selector inline de duración de ayuno
 */
function SelectorDuracion({duracionActual, onCambiar}: {duracionActual: number; onCambiar: (horas: number) => void}): JSX.Element {
    return (
        <div className="panelAyunoSelectorDuracion">
            {DURACIONES_PRESET.map(h => (
                <button
                    key={h}
                    className={`panelAyunoDuracionOpcion ${duracionActual === h ? 'panelAyunoDuracionOpcion--activa' : ''}`}
                    onClick={() => onCambiar(h)}
                    type="button"
                >
                    {h}h
                </button>
            ))}
        </div>
    );
}

/*
 * Historial compacto de las últimas sesiones
 */
function HistorialCompacto({historial}: {historial: Array<{tiempoEfectivoMs: number; completada: boolean; inicio: number}>}): JSX.Element | null {
    const ultimas = historial.slice(0, 5);
    if (ultimas.length === 0) return null;

    return (
        <div className="panelAyunoHistorial">
            <span className="panelAyunoHistorialTitulo">Recientes</span>
            <div className="panelAyunoHistorialLista">
                {ultimas.map((s, i) => {
                    const horas = Math.floor(s.tiempoEfectivoMs / 3600000);
                    const minutos = Math.floor((s.tiempoEfectivoMs % 3600000) / 60000);
                    const fecha = new Date(s.inicio);
                    const dia = fecha.toLocaleDateString('es', {day: 'numeric', month: 'short'});

                    return (
                        <div key={i} className={`panelAyunoHistorialItem ${s.completada ? 'panelAyunoHistorialItem--completado' : ''}`}>
                            <span className="panelAyunoHistorialItemFecha">{dia}</span>
                            <span className="panelAyunoHistorialItemTiempo">{horas}h {minutos}m</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function PanelAyuno({renderHandleArrastre, handleMinimizar}: PanelAyunoProps): JSX.Element {
    const {
        estaActivo,
        estadoVisual,
        tiempoFormateado,
        tiempoRestanteFormateado,
        porcentaje,
        alcanzoObjetivo,
        duracionHoras,
        ultimoAyunoFormateado,
        tiempoDesdeUltimoFormateado,
        historial,
        iniciar,
        terminar,
        reiniciar
    } = useAyuno();

    const guardarConfig = usePluginsStore(s => s.guardarConfiguracion);

    const manejarCambiarDuracion = (horas: number) => {
        guardarConfig(PLUGIN_ID, {duracionHoras: horas} satisfies ConfiguracionAyuno);
    };

    /* Contenido central del círculo según estado */
    const contenidoCentral = useMemo(() => {
        if (estaActivo) {
            return (
                <div className="panelAyunoCentro">
                    <span className="panelAyunoCentroEtiqueta">
                        {alcanzoObjetivo ? 'Objetivo alcanzado' : 'Transcurrido'}
                    </span>
                    <span className={`panelAyunoCentroTiempo ${alcanzoObjetivo ? 'panelAyunoCentroTiempo--completado' : ''}`}>
                        {tiempoFormateado}
                    </span>
                    {!alcanzoObjetivo && (
                        <span className="panelAyunoCentroRestante">
                            Faltan {tiempoRestanteFormateado}
                        </span>
                    )}
                </div>
            );
        }

        if (estadoVisual === 'con-historial') {
            return (
                <div className="panelAyunoCentro">
                    <span className="panelAyunoCentroEtiqueta">Último ayuno</span>
                    <span className="panelAyunoCentroTiempo">{ultimoAyunoFormateado}</span>
                    {tiempoDesdeUltimoFormateado && (
                        <span className="panelAyunoCentroRestante">
                            Hace {tiempoDesdeUltimoFormateado}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div className="panelAyunoCentro">
                <span className="panelAyunoCentroEtiqueta">Ayuno</span>
                <span className="panelAyunoCentroTiempo">{duracionHoras}h</span>
                <span className="panelAyunoCentroRestante">Listo para comenzar</span>
            </div>
        );
    }, [estaActivo, estadoVisual, alcanzoObjetivo, tiempoFormateado, tiempoRestanteFormateado, ultimoAyunoFormateado, tiempoDesdeUltimoFormateado, duracionHoras]);

    return (
        <div id="panelAyuno" className="panelAyuno panelDashboard internaColumna">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Ayuno') as any}
                variante="panelHeader"
                acciones={handleMinimizar}
            />

            <div className="panelAyunoContenido">
                {/* Círculo con progreso y contenido central */}
                <div className="panelAyunoCirculoContenedor">
                    <CirculoProgreso porcentaje={porcentaje} estaActivo={estaActivo} />
                    {contenidoCentral}
                </div>

                {/* Selector de duración (solo cuando no hay ayuno activo) */}
                {!estaActivo && (
                    <SelectorDuracion
                        duracionActual={duracionHoras}
                        onCambiar={manejarCambiarDuracion}
                    />
                )}

                {/* Botones de acción */}
                <div className="panelAyunoBotones">
                    {!estaActivo ? (
                        <button
                            className="panelAyunoBoton panelAyunoBoton--iniciar"
                            onClick={iniciar}
                            type="button"
                        >
                            <Play size={16} />
                            <span>Comenzar ayuno</span>
                        </button>
                    ) : (
                        <>
                            <button
                                className="panelAyunoBoton panelAyunoBoton--terminar"
                                onClick={terminar}
                                type="button"
                            >
                                <Square size={16} />
                                <span>Terminar</span>
                            </button>
                            <button
                                className="panelAyunoBoton panelAyunoBoton--reiniciar"
                                onClick={reiniciar}
                                type="button"
                                title="Descarta el ayuno sin registrarlo"
                            >
                                <RotateCcw size={16} />
                                <span>Reiniciar</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Historial compacto de últimas sesiones */}
                <HistorialCompacto historial={historial} />
            </div>
        </div>
    );
}

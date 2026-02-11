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

import {useEffect, useMemo, useState} from 'react';
import {Square, RotateCcw, Settings, Maximize2, AlertCircle} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {useAyuno} from '../../hooks/useAyuno';
import {usePluginsStore} from '../../stores/pluginsStore';
import {OverlayEnfoque} from '../shared';
import {useHabitosStore} from '../../stores/habitosStore';
import {HistorialAyuno} from './ayuno/HistorialAyuno';
import {ModalUltimaComida} from './ayuno/ModalUltimaComida';
import type {ConfiguracionAyuno} from '../../types/ayuno';

interface PanelAyunoProps {
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    onAbrirConfiguracion: () => void;
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

export function PanelAyuno({renderHandleArrastre, handleMinimizar, onAbrirConfiguracion}: PanelAyunoProps): JSX.Element {
    const [modoEnfoque, setModoEnfoque] = useState(false);
    const [modalUltimaComidaAbierto, setModalUltimaComidaAbierto] = useState(false);

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
        reiniciar,
        eliminarSesion
    } = useAyuno();

    const guardarConfig = usePluginsStore(s => s.guardarConfiguracion);
    const configAyuno = usePluginsStore(s => s.configuracionPlugins[PLUGIN_ID]) as unknown as {habitoId?: number} | undefined;

    const habitos = useHabitosStore(s => s.habitos);
    const habitoAyunoExiste = !!(configAyuno?.habitoId && habitos.some(h => h.id === configAyuno.habitoId));

    const crearHabitoEspecialAhora = () => {
        const existente = useHabitosStore.getState().habitos.find(h => h.nombre.trim().toLowerCase() === 'ayuno');
        const habito = existente ?? useHabitosStore.getState().crearHabito({
            nombre: 'Ayuno',
            importancia: 'Media',
            tags: [],
            frecuencia: {tipo: 'diario'},
            descripcion: 'Hábito especial generado por el plugin de ayuno'
        });
        usePluginsStore.getState().guardarConfiguracion(PLUGIN_ID, {habitoId: habito.id});
    };

    /* Si el plugin está activo pero falta habitoId (instalaciones viejas), intentar vincular/crear automáticamente */
    useEffect(() => {
        const pluginsActivos = usePluginsStore.getState().pluginsActivos;
        if (!pluginsActivos.includes(PLUGIN_ID)) return;

        const configActual = usePluginsStore.getState().configuracionPlugins[PLUGIN_ID] as unknown as {habitoId?: number} | undefined;
        if (configActual?.habitoId) return;

        const existente = useHabitosStore.getState().habitos.find(h => h.nombre.trim().toLowerCase() === 'ayuno');
        if (existente) {
            usePluginsStore.getState().guardarConfiguracion(PLUGIN_ID, {habitoId: existente.id});
            return;
        }

        const nuevo = useHabitosStore.getState().crearHabito({
            nombre: 'Ayuno',
            importancia: 'Media',
            tags: [],
            frecuencia: {tipo: 'diario'},
            descripcion: 'Hábito especial generado por el plugin de ayuno'
        });
        usePluginsStore.getState().guardarConfiguracion(PLUGIN_ID, {habitoId: nuevo.id});
    }, []);

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

    const contenidoPanel = (
        <div className="panelAyunoContenido">
            {!habitoAyunoExiste && (
                <div className="panelAyunoAviso">
                    <AlertCircle size={14} />
                    <div className="panelAyunoAvisoTexto">
                        <span className="panelAyunoAvisoTitulo">Falta el hábito Ayuno</span>
                        <span className="panelAyunoAvisoDescripcion">Puedes recrearlo ahora para reactivar el panel.</span>
                    </div>
                    <button type="button" className="panelAyunoAvisoBoton" onClick={crearHabitoEspecialAhora} title="Crear hábito Ayuno ahora">
                        Crear ahora
                    </button>
                </div>
            )}

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
                        onClick={() => habitoAyunoExiste && setModalUltimaComidaAbierto(true)}
                        type="button"
                        disabled={!habitoAyunoExiste}
                        title="Comenzar ayuno"
                    >
                        <span>Comenzar</span>
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

            <HistorialAyuno sesiones={historial} maxPorPagina={6} onEliminarSesion={eliminarSesion} />
        </div>
    );

    return (
        <>
            <div id="panelAyuno" className="panelAyuno panelDashboard internaColumna">
                <SeccionEncabezado
                    icono={null}
                    titulo={renderHandleArrastre('Ayuno') as any}
                    variante="panelHeader"
                    acciones={
                        <>
                            <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirConfiguracion} title="Configuración" type="button">
                                <span className="selectorBadgeIcono">
                                    <Settings size={12} />
                                </span>
                            </button>
                            <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setModoEnfoque(true)} title="Modo enfoque" type="button">
                                <span className="selectorBadgeIcono">
                                    <Maximize2 size={12} />
                                </span>
                            </button>
                            {handleMinimizar}
                        </>
                    }
                />

                {contenidoPanel}
            </div>

            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Ayuno">
                <div className="panelAyuno panelDashboard internaColumna">{contenidoPanel}</div>
            </OverlayEnfoque>

            <ModalUltimaComida
                estaAbierto={modalUltimaComidaAbierto}
                onCerrar={() => setModalUltimaComidaAbierto(false)}
                onConfirmar={horaUltimaComidaMs => iniciar(horaUltimaComidaMs)}
            />
        </>
    );
}

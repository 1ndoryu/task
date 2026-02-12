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
import {Square, Settings, Maximize2, AlertCircle, Play} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {useAyuno} from '../../hooks/useAyuno';
import {usePluginsStore} from '../../stores/pluginsStore';
import {OverlayEnfoque} from '../shared';
import {useHabitosStore} from '../../stores/habitosStore';
import {HistorialAyuno} from './ayuno/HistorialAyuno';
import {ModalUltimaComida} from './ayuno/ModalUltimaComida';
import {ModalFinalizarAyuno} from './ayuno/ModalFinalizarAyuno';
import type {ConfiguracionAyuno} from '../../types/ayuno';
import type {FrecuenciaHabito} from '../../types/dashboard';
import {calcularInicioProximoAyunoMsDesdeFin, calcularVentanaComidaMs, formatearDuracionAyuno} from '../../utils/ayunoVentanas';

interface PanelAyunoProps {
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    onAbrirConfiguracion: () => void;
}

const PLUGIN_ID = 'ayuno';
const RADIO = 100;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/* Opciones de duración preconfiguradas */
const DURACIONES_PRESET = [14, 16, 18, 20] as const;

/*
 * Componente del círculo SVG con progreso animado
 */
function CirculoProgreso({porcentaje, estaActivo}: {porcentaje: number; estaActivo: boolean}): JSX.Element {
    const offset = CIRCUNFERENCIA - (porcentaje / 100) * CIRCUNFERENCIA;

    return (
        <svg className="panelAyunoCirculo" viewBox="0 0 220 220" width="220" height="220">
            {/* Fondo del círculo */}
            <circle className="panelAyunoCirculoFondo" cx="110" cy="110" r={RADIO} fill="none" strokeWidth="8" />
            {/* Progreso */}
            {estaActivo && <circle className="panelAyunoCirculoProgreso" cx="110" cy="110" r={RADIO} fill="none" strokeWidth="8" strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 110 110)" />}
        </svg>
    );
}

function obtenerFraccionDia(ms: number): number {
    const fecha = new Date(ms);
    const totalSegundos = fecha.getHours() * 3600 + fecha.getMinutes() * 60 + fecha.getSeconds();
    return totalSegundos / (24 * 3600);
}

function obtenerPuntoEnCirculo(fraccionDia: number, radio: number): {x: number; y: number} {
    const angulo = fraccionDia * 2 * Math.PI - Math.PI / 2;
    const x = 110 + Math.cos(angulo) * radio;
    const y = 110 + Math.sin(angulo) * radio;
    return {x, y};
}

function CirculoVentanaComida({inicioVentanaMs, finVentanaMs}: {inicioVentanaMs: number; finVentanaMs: number}): JSX.Element {
    const inicioFraccion = obtenerFraccionDia(inicioVentanaMs);
    const finFraccion = obtenerFraccionDia(finVentanaMs);
    const marcador = obtenerPuntoEnCirculo(finFraccion, RADIO);

    const renderSegmento = (segmentoInicio: number, segmentoFin: number, key: string) => {
        const inicio = Math.max(0, Math.min(1, segmentoInicio));
        const fin = Math.max(0, Math.min(1, segmentoFin));
        const longitud = Math.max(0, (fin - inicio) * CIRCUNFERENCIA);
        if (longitud <= 0) return null;

        const dasharray = `${longitud} ${CIRCUNFERENCIA}`;
        const dashoffset = CIRCUNFERENCIA - inicio * CIRCUNFERENCIA;

        return (
            <circle
                key={key}
                className="panelAyunoCirculoVentana"
                cx="110"
                cy="110"
                r={RADIO}
                fill="none"
                strokeWidth="8"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                transform="rotate(-90 110 110)"
            />
        );
    };

    const segmentos = inicioFraccion <= finFraccion ? [renderSegmento(inicioFraccion, finFraccion, 'segmento')]
        : [
              renderSegmento(inicioFraccion, 1, 'segmentoA'),
              renderSegmento(0, finFraccion, 'segmentoB')
          ];

    return (
        <svg className="panelAyunoCirculo" viewBox="0 0 220 220" width="220" height="220">
            <circle className="panelAyunoCirculoFondo" cx="110" cy="110" r={RADIO} fill="none" strokeWidth="8" />
            {segmentos}
            <circle className="panelAyunoCirculoMarcador" cx={marcador.x} cy={marcador.y} r={4} />
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
                <button key={h} className={`panelAyunoDuracionOpcion ${duracionActual === h ? 'panelAyunoDuracionOpcion--activa' : ''}`} onClick={() => onCambiar(h)} type="button">
                    {h}h
                </button>
            ))}
        </div>
    );
}

export function PanelAyuno({renderHandleArrastre, handleMinimizar, onAbrirConfiguracion}: PanelAyunoProps): JSX.Element {
    const [modoEnfoque, setModoEnfoque] = useState(false);
    const [modalUltimaComidaAbierto, setModalUltimaComidaAbierto] = useState(false);
    const [modalFinalizarAyunoAbierto, setModalFinalizarAyunoAbierto] = useState(false);
    const [finAyunoMs, setFinAyunoMs] = useState<number | null>(null);

    const {estaActivo, sesionActiva, tiempoFormateado, tiempoRestanteFormateado, porcentaje, alcanzoObjetivo, duracionHoras, ultimoAyuno, tiempoDesdeUltimoFormateado, historial, iniciar, terminar, reiniciar, eliminarSesion} = useAyuno();

    const guardarConfig = usePluginsStore(s => s.guardarConfiguracion);
    const configAyuno = usePluginsStore(s => s.configuracionPlugins[PLUGIN_ID]) as unknown as {habitoId?: number} | undefined;

    const habitos = useHabitosStore(s => s.habitos);
    const habitoAyunoExiste = !!(configAyuno?.habitoId && habitos.some(h => h.id === configAyuno.habitoId));

    const habitoAyuno = useMemo(() => {
        if (!configAyuno?.habitoId) return undefined;
        return habitos.find(h => h.id === configAyuno.habitoId);
    }, [habitos, configAyuno?.habitoId]);

    const frecuenciaAyuno: FrecuenciaHabito | undefined = habitoAyuno?.frecuencia;

    const duracionObjetivoUltimoMs = ultimoAyuno?.duracionObjetivoMs ?? duracionHoras * 60 * 60 * 1000;

    const ventanaUltima = useMemo(() => {
        if (!ultimoAyuno?.fin) return null;
        return calcularVentanaComidaMs({finAyunoMs: ultimoAyuno.fin, duracionObjetivoMs: duracionObjetivoUltimoMs, frecuencia: frecuenciaAyuno});
    }, [ultimoAyuno?.fin, duracionObjetivoUltimoMs, frecuenciaAyuno]);

    const textoProximoAyuno = useMemo(() => {
        if (!ultimoAyuno?.fin) return null;
        const inicioProximoMs = calcularInicioProximoAyunoMsDesdeFin(ultimoAyuno.fin, duracionObjetivoUltimoMs, frecuenciaAyuno);
        const deltaMs = inicioProximoMs - Date.now();

        if (deltaMs <= 0) {
            return `Próximo ayuno: hace ${formatearDuracionAyuno(Math.abs(deltaMs))}`;
        }

        return `Próximo ayuno: en ${formatearDuracionAyuno(deltaMs)}`;
    }, [ultimoAyuno?.fin, duracionObjetivoUltimoMs, frecuenciaAyuno, tiempoDesdeUltimoFormateado]);

    const textoVentanaComida = useMemo(() => {
        if (!ventanaUltima) return null;
        if (ventanaUltima.periodoMs !== 24 * 60 * 60 * 1000) return null;
        return `Ventana comida: ${formatearDuracionAyuno(ventanaUltima.duracionVentanaComidaMs)}`;
    }, [ventanaUltima?.duracionVentanaComidaMs, ventanaUltima?.periodoMs]);

    const crearHabitoEspecialAhora = () => {
        const existente = useHabitosStore.getState().habitos.find(h => h.nombre.trim().toLowerCase() === 'ayuno');
        const habito =
            existente ??
            useHabitosStore.getState().crearHabito({
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

    /* Contenido central minimalista: Solo tiempo y acción */
    const contenidoCentral = useMemo(() => {
        if (estaActivo) {
            return (
                <div className="panelAyunoCentro">
                    <span className={`panelAyunoCentroTiempo ${alcanzoObjetivo ? 'panelAyunoCentroTiempo--completado' : ''}`}>{tiempoFormateado}</span>
                    {!alcanzoObjetivo && <span className="panelAyunoCentroRestante">-{tiempoRestanteFormateado}</span>}
                    <button
                        className="panelAyunoBotonCircular panelAyunoBotonCircular--terminar"
                        onClick={() => {
                            setFinAyunoMs(Date.now());
                            setModalFinalizarAyunoAbierto(true);
                        }}
                        type="button"
                        title="Terminar ayuno">
                        <Square size={14} fill="currentColor" />
                    </button>
                </div>
            );
        }

        /* Estado inactivo (con o sin historial): Mostrar objetivo y botón iniciar */
        return (
            <div className="panelAyunoCentro">
                <span className="panelAyunoCentroEtiqueta">{tiempoDesdeUltimoFormateado ? 'Desde el último ayuno' : 'Objetivo'}</span>
                <span className="panelAyunoCentroTiempo">{tiempoDesdeUltimoFormateado ? tiempoDesdeUltimoFormateado : `${duracionHoras}h`}</span>
                {!!textoVentanaComida && <span className="panelAyunoCentroRestante">{textoVentanaComida}</span>}
                {!!textoProximoAyuno && <span className="panelAyunoCentroRestante">{textoProximoAyuno}</span>}
                <button className="panelAyunoBotonCircular panelAyunoBotonCircular--iniciar" onClick={() => habitoAyunoExiste && setModalUltimaComidaAbierto(true)} type="button" disabled={!habitoAyunoExiste} title="Comenzar ayuno">
                    <Play size={14} fill="currentColor" className="iconoPlayAjustado" />
                </button>
            </div>
        );
    }, [estaActivo, alcanzoObjetivo, tiempoFormateado, tiempoRestanteFormateado, tiempoDesdeUltimoFormateado, textoVentanaComida, textoProximoAyuno, duracionHoras, habitoAyunoExiste]);

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
                {estaActivo ? (
                    <CirculoProgreso porcentaje={porcentaje} estaActivo={estaActivo} />
                ) : ventanaUltima && ventanaUltima.periodoMs === 24 * 60 * 60 * 1000 ? (
                    <CirculoVentanaComida inicioVentanaMs={ventanaUltima.inicioVentanaComidaMs} finVentanaMs={ventanaUltima.finVentanaComidaMs} />
                ) : (
                    <CirculoProgreso porcentaje={0} estaActivo={false} />
                )}
                {contenidoCentral}
            </div>

            {/* Selector de duración (solo cuando no hay ayuno activo) */}
            {!estaActivo && <SelectorDuracion duracionActual={duracionHoras} onCambiar={manejarCambiarDuracion} />}

            {/* Botones de acción eliminados - movidos al interior del círculo */}

            <HistorialAyuno sesiones={historial} maxPorPagina={6} onEliminarSesion={eliminarSesion} />
        </div>
    );

    return (
        <>
            <div id="panelAyuno" className="panelAyuno internaColumna">
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
                <div className="panelAyuno internaColumna">{contenidoPanel}</div>
            </OverlayEnfoque>

            <ModalUltimaComida estaAbierto={modalUltimaComidaAbierto} onCerrar={() => setModalUltimaComidaAbierto(false)} onConfirmar={horaUltimaComidaMs => iniciar(horaUltimaComidaMs)} />

            <ModalFinalizarAyuno
                estaAbierto={modalFinalizarAyunoAbierto}
                onCerrar={() => setModalFinalizarAyunoAbierto(false)}
                inicioAyunoMs={sesionActiva?.inicio ?? Date.now()}
                finAyunoMs={finAyunoMs ?? Date.now()}
                duracionObjetivoMs={sesionActiva?.duracionObjetivoMs ?? duracionHoras * 60 * 60 * 1000}
                frecuencia={frecuenciaAyuno}
                onContinuar={() => {
                    /* Continuar ayuno = no modificar store */
                }}
                onEliminar={() => {
                    reiniciar();
                }}
                onGuardar={() => {
                    terminar(finAyunoMs ?? Date.now());
                }}
            />
        </>
    );
}

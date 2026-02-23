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
import {Square, Settings, Maximize2, AlertCircle, Play} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {OverlayEnfoque} from '../shared';
import {HistorialAyuno} from './ayuno/HistorialAyuno';
import {ModalUltimaComida} from './ayuno/ModalUltimaComida';
import {ModalFinalizarAyuno} from './ayuno/ModalFinalizarAyuno';
import {usePanelAyuno} from '../../hooks/dashboard/usePanelAyuno';
import {Boton} from '../ui';

interface PanelAyunoProps {
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    onAbrirConfiguracion: () => void;
}

const RADIO = 120;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/* Opciones de duración preconfiguradas */
const DURACIONES_PRESET = [14, 16, 18, 20] as const;

/*
 * Componente del círculo SVG con progreso animado
 */
function CirculoProgreso({porcentaje, estaActivo}: {porcentaje: number; estaActivo: boolean}): JSX.Element {
    const offset = CIRCUNFERENCIA - (porcentaje / 100) * CIRCUNFERENCIA;

    return (
        <svg className="panelAyunoCirculo" viewBox="0 0 260 260" width="260" height="260">
            {/* Fondo del círculo */}
            <circle className="panelAyunoCirculoFondo" cx="130" cy="130" r={RADIO} fill="none" strokeWidth="8" />
            {/* Progreso */}
            {estaActivo && <circle className="panelAyunoCirculoProgreso" cx="130" cy="130" r={RADIO} fill="none" strokeWidth="8" strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 130 130)" />}
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
    const x = 130 + Math.cos(angulo) * radio;
    const y = 130 + Math.sin(angulo) * radio;
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

        return <circle key={key} className="panelAyunoCirculoVentana" cx="130" cy="130" r={RADIO} fill="none" strokeWidth="8" strokeDasharray={dasharray} strokeDashoffset={dashoffset} strokeLinecap="round" transform="rotate(-90 130 130)" />;
    };

    const segmentos = inicioFraccion <= finFraccion ? [renderSegmento(inicioFraccion, finFraccion, 'segmento')] : [renderSegmento(inicioFraccion, 1, 'segmentoA'), renderSegmento(0, finFraccion, 'segmentoB')];

    return (
        <svg className="panelAyunoCirculo" viewBox="0 0 260 260" width="260" height="260">
            <circle className="panelAyunoCirculoFondo" cx="130" cy="130" r={RADIO} fill="none" strokeWidth="8" />
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
                <Boton key={h} type="button" variante="ghost" claseAdicional={`panelAyunoDuracionOpcion ${duracionActual === h ? 'panelAyunoDuracionOpcion--activa' : ''}`} onClick={() => onCambiar(h)}>
                    {h}h
                </Boton>
            ))}
        </div>
    );
}

function SelectorDuracionCompacto({duracionActual, onCambiar}: {duracionActual: number; onCambiar: (horas: number) => void}): JSX.Element {
    return (
        <div className="panelAyunoSelectorDuracion panelAyunoSelectorDuracion--compacto">
            {DURACIONES_PRESET.map(h => (
                <Boton key={h} type="button" variante="ghost" claseAdicional={`panelAyunoDuracionOpcion ${duracionActual === h ? 'panelAyunoDuracionOpcion--activa' : ''}`} onClick={() => onCambiar(h)}>
                    {h}h
                </Boton>
            ))}
        </div>
    );
}

export function PanelAyuno({renderHandleArrastre, handleMinimizar, onAbrirConfiguracion}: PanelAyunoProps): JSX.Element {
    const {
        modoEnfoque, setModoEnfoque,
        modalUltimaComidaAbierto, setModalUltimaComidaAbierto,
        modalFinalizarAyunoAbierto, setModalFinalizarAyunoAbierto,
        finAyunoMs,
        estaActivo, sesionActiva, tiempoFormateado, tiempoRestanteFormateado,
        porcentaje, alcanzoObjetivo, duracionHoras,
        tiempoDesdeUltimoFormateado,
        historial, iniciar, reiniciar, eliminarSesion,
        habitoAyunoExiste, frecuenciaAyuno, duracionObjetivoUltimoMs,
        ventanaUltima, textoProximoAyuno, textoVentanaComida,
        crearHabitoEspecialAhora, manejarCambiarDuracion,
        abrirModalFinalizar, manejarTerminar
    } = usePanelAyuno();

    /* Contenido central minimalista: Solo tiempo y acción */
    const contenidoCentral = useMemo(() => {
        if (estaActivo) {
            return (
                <div className="panelAyunoCentro">
                    <span className="panelAyunoCentroEtiqueta">Objetivo: {duracionHoras}h</span>
                    <SelectorDuracionCompacto duracionActual={duracionHoras} onCambiar={manejarCambiarDuracion} />
                    <span className={`panelAyunoCentroTiempo ${alcanzoObjetivo ? 'panelAyunoCentroTiempo--completado' : ''}`}>{tiempoFormateado}</span>
                    {!alcanzoObjetivo && <span className="panelAyunoCentroRestante">-{tiempoRestanteFormateado}</span>}
                    <Boton
                        variante="ghost"
                        claseAdicional="panelAyunoBotonCircular panelAyunoBotonCircular--terminar"
                        onClick={abrirModalFinalizar}
                        type="button"
                        title="Terminar ayuno">
                        <Square size={14} fill="currentColor" />
                    </Boton>
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
                <Boton variante="ghost" claseAdicional="panelAyunoBotonCircular panelAyunoBotonCircular--iniciar" onClick={() => habitoAyunoExiste && setModalUltimaComidaAbierto(true)} type="button" disabled={!habitoAyunoExiste} title="Comenzar ayuno">
                    <Play size={14} fill="currentColor" className="iconoPlayAjustado" />
                </Boton>
            </div>
        );
    }, [estaActivo, alcanzoObjetivo, tiempoFormateado, tiempoRestanteFormateado, tiempoDesdeUltimoFormateado, textoVentanaComida, textoProximoAyuno, duracionHoras, habitoAyunoExiste, manejarCambiarDuracion]);

    const contenidoPanel = (
        <div className="panelAyunoContenido">
            {!habitoAyunoExiste && (
                <div className="panelAyunoAviso">
                    <AlertCircle size={14} />
                    <div className="panelAyunoAvisoTexto">
                        <span className="panelAyunoAvisoTitulo">Falta el hábito Ayuno</span>
                        <span className="panelAyunoAvisoDescripcion">Puedes recrearlo ahora para reactivar el panel.</span>
                    </div>
                    <Boton type="button" variante="ghost" claseAdicional="panelAyunoAvisoBoton" onClick={crearHabitoEspecialAhora} title="Crear hábito Ayuno ahora">
                        Crear ahora
                    </Boton>
                </div>
            )}

            {/* Círculo con progreso y contenido central */}
            <div className="panelAyunoCirculoContenedor">
                {estaActivo ? <CirculoProgreso porcentaje={porcentaje} estaActivo={estaActivo} /> : ventanaUltima && ventanaUltima.periodoMs === 24 * 60 * 60 * 1000 ? <CirculoVentanaComida inicioVentanaMs={ventanaUltima.inicioVentanaComidaMs} finVentanaMs={ventanaUltima.finVentanaComidaMs} /> : <CirculoProgreso porcentaje={0} estaActivo={false} />}
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
                    titulo={renderHandleArrastre('Ayuno')}
                    variante="panelHeader"
                    acciones={
                        <>
                            <Boton variante="badge" soloIcono onClick={onAbrirConfiguracion} title="Configuración" type="button" icono={<Settings size={12} />} />
                            <Boton variante="badge" soloIcono onClick={() => setModoEnfoque(true)} title="Modo enfoque" type="button" icono={<Maximize2 size={12} />} />
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
                onGuardar={horaFinComidaMs => {
                    manejarTerminar(horaFinComidaMs);
                }}
            />
        </>
    );
}

/*
 * ModalFinalizarAyuno
 * Al terminar un ayuno, muestra detalles y pregunta si desea:
 * - Guardar el registro
 * - Eliminar (descartar) el registro
 * - Continuar el ayuno
 */

import {Play, Trash2, Save, Flag, CalendarClock, CheckCircle2} from 'lucide-react';
import {Modal} from '../../shared/Modal';
import type {FrecuenciaHabito} from '../../../types/dashboard';
import {formatearDuracionAyuno} from '../../../utils/ayunoVentanas';
import {Boton, Input} from '../../ui';
import {useModalFinalizarAyuno, ajustarHoraPorMinutos} from '../../../hooks/paneles/useModalFinalizarAyuno';

interface ModalFinalizarAyunoProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    inicioAyunoMs: number;
    finAyunoMs: number;
    duracionObjetivoMs: number;
    frecuencia: FrecuenciaHabito | undefined;
    onGuardar: (horaFinComidaMs: number) => void;
    onEliminar: () => void;
    onContinuar: () => void;
}

function formatearDiaCorto(ms: number): string {
    const fecha = new Date(ms);
    const ahora = new Date();
    const esHoy = fecha.getDate() === ahora.getDate() && fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    if (esHoy) return 'Hoy';
    return fecha.toLocaleDateString('es-ES', {day: '2-digit', month: 'short'});
}

function formatearFechaHoraCorta(ms: number): string {
    const fecha = new Date(ms);
    const ahora = new Date();
    const esHoy = fecha.getDate() === ahora.getDate() && fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();

    const hora = fecha.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });

    if (esHoy) return `Hoy, ${hora}`;

    return fecha.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function ModalFinalizarAyuno({estaAbierto, onCerrar, inicioAyunoMs, finAyunoMs, duracionObjetivoMs, frecuencia, onGuardar, onEliminar, onContinuar}: ModalFinalizarAyunoProps): JSX.Element | null {
    const {horaFinComida, setHoraFinComida, finComidaMs, tiempoEfectivoMs, completado, ventana, tiempoHastaProximo} = useModalFinalizarAyuno({estaAbierto, inicioAyunoMs, finAyunoMs, duracionObjetivoMs, frecuencia});

    if (!estaAbierto) return null;

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Finalizar ayuno" claseExtra="modalAyunoFinalizar">
            <div className="modalAyunoFinalizarContenido">
                {/* Hero: Duración Principal */}
                <div className="modalAyunoHero">
                    <span className={`modalAyunoHeroTiempo ${completado ? 'modalAyunoHeroTiempo--completado' : ''}`}>{formatearDuracionAyuno(tiempoEfectivoMs)}</span>
                    <div className="modalAyunoHeroObjetivo">
                        {completado && <CheckCircle2 size={14} color="var(--dashboard-estadoExito)" />}
                        <span>Objetivo: {formatearDuracionAyuno(duracionObjetivoMs)}</span>
                    </div>
                </div>

                {/* Timeline Visual */}
                <div className="modalAyunoTimeline">
                    {/* Inicio */}
                    <div className="modalAyunoTimelineItem">
                        <div className="modalAyunoTimelineIcono modalAyunoTimelineIcono--inicio">
                            <Play size={10} fill="currentColor" />
                        </div>
                        <div className="modalAyunoTimelineContenido">
                            <span className="modalAyunoTimelineTitulo">Inicio</span>
                            <span className="modalAyunoTimelineHora">{formatearFechaHoraCorta(inicioAyunoMs)}</span>
                        </div>
                    </div>

                    {/* Fin (Actual) */}
                    <div className="modalAyunoTimelineItem modalAyunoTimelineItem--faseComida">
                        <div className="modalAyunoTimelineIcono modalAyunoTimelineIcono--fin">
                            <Flag size={12} fill="currentColor" />
                        </div>
                        <div className="modalAyunoTimelineContenido">
                            <span className="modalAyunoTimelineTitulo">Fin de comida</span>
                            <div className="modalAyunoTimelineHoraEditable">
                                <Input
                                    tipo="text"
                                    inputMode="numeric"
                                    claseAdicional="selectorVentanaOportunidad__inputHora modalAyunoTimelineHoraInput"
                                    value={horaFinComida}
                                    onChange={e => setHoraFinComida((e.target as HTMLInputElement).value)}
                                    onKeyDown={e => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setHoraFinComida(prev => ajustarHoraPorMinutos(prev, 1));
                                        }
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setHoraFinComida(prev => ajustarHoraPorMinutos(prev, -1));
                                        }
                                    }}
                                    placeholder="HH:MM"
                                    aria-label="Hora de fin de comida"
                                />
                                <span className="modalAyunoTimelineDia">{formatearDiaCorto(finComidaMs)}</span>
                            </div>
                            {ventana.duracionVentanaComidaMs > 0 && <span className="modalAyunoTimelineExtra">Comienza ventana de comida ({formatearDuracionAyuno(ventana.duracionVentanaComidaMs)})</span>}
                        </div>
                    </div>

                    {/* Próximo Ayuno */}
                    <div className="modalAyunoTimelineItem">
                        <div className="modalAyunoTimelineIcono modalAyunoTimelineIcono--proximo">
                            <CalendarClock size={14} />
                        </div>
                        <div className="modalAyunoTimelineContenido">
                            <span className="modalAyunoTimelineTitulo">Próximo Ayuno</span>
                            <span className="modalAyunoTimelineHora">{formatearFechaHoraCorta(ventana.inicioProximoAyunoMs)}</span>
                            <span className="modalAyunoTimelineExtra">{tiempoHastaProximo}</span>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="modalAyunoFinalizarAcciones">
                    <Boton
                        type="button"
                        variante="secundario"
                        onClick={() => {
                            onContinuar();
                            onCerrar();
                        }}
                        title="Continuar ayuno (cancelar finalización)">
                        <Play size={14} />
                        <span>Continuar</span>
                    </Boton>

                    <Boton
                        type="button"
                        variante="peligro"
                        onClick={() => {
                            onEliminar();
                            onCerrar();
                        }}
                        title="Eliminar registro">
                        <Trash2 size={14} />
                        <span>Eliminar</span>
                    </Boton>

                    <Boton
                        type="button"
                        variante="primario"
                        onClick={() => {
                            onGuardar(finComidaMs);
                            onCerrar();
                        }}
                        title="Guardar registro">
                        <Save size={14} />
                        <span>Guardar</span>
                    </Boton>
                </div>
            </div>
        </Modal>
    );
}

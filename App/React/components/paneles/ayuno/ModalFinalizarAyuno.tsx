/*
 * ModalFinalizarAyuno
 * Al terminar un ayuno, muestra detalles y pregunta si desea:
 * - Guardar el registro
 * - Eliminar (descartar) el registro
 * - Continuar el ayuno
 */

import {useEffect, useMemo, useState} from 'react';
import {Play, Trash2, Save, Flag, CalendarClock, CheckCircle2} from 'lucide-react';
import {Modal} from '../../shared/Modal';
import type {FrecuenciaHabito} from '../../../types/dashboard';
import {calcularVentanaComidaMs, formatearDuracionAyuno} from '../../../utils/ayunoVentanas';
import {Boton} from '../../ui';

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

function formatearHoraHHMM(ms: number): string {
    const fecha = new Date(ms);
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minuto = String(fecha.getMinutes()).padStart(2, '0');
    return `${hora}:${minuto}`;
}

function parsearHoraHHMM(valor: string): {hora: number; minuto: number} | null {
    const coincide = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
    if (!coincide) return null;
    const hora = Number(coincide[1]);
    const minuto = Number(coincide[2]);
    if (!Number.isFinite(hora) || !Number.isFinite(minuto)) return null;
    if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null;
    return {hora, minuto};
}

function construirFinComidaMs(baseMs: number, horaTexto: string): number {
    const horaParseada = parsearHoraHHMM(horaTexto);
    if (!horaParseada) return baseMs;
    const base = new Date(baseMs);
    base.setHours(horaParseada.hora, horaParseada.minuto, 0, 0);
    return base.getTime();
}

function ajustarHoraPorMinutos(horaTexto: string, deltaMinutos: number): string {
    const parsed = parsearHoraHHMM(horaTexto) ?? {hora: 0, minuto: 0};
    const base = new Date();
    base.setHours(parsed.hora, parsed.minuto, 0, 0);
    base.setMinutes(base.getMinutes() + deltaMinutos);
    return `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`;
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
    const [horaFinComida, setHoraFinComida] = useState(() => formatearHoraHHMM(finAyunoMs));

    useEffect(() => {
        if (!estaAbierto) return;
        setHoraFinComida(formatearHoraHHMM(finAyunoMs));
    }, [estaAbierto, finAyunoMs]);

    const finComidaMs = useMemo(() => {
        return construirFinComidaMs(finAyunoMs, horaFinComida);
    }, [finAyunoMs, horaFinComida]);

    const tiempoEfectivoMs = Math.max(0, finComidaMs - inicioAyunoMs);
    const completado = tiempoEfectivoMs >= duracionObjetivoMs;

    const ventana = useMemo(() => {
        return calcularVentanaComidaMs({finAyunoMs: finComidaMs, duracionObjetivoMs, frecuencia});
    }, [finComidaMs, duracionObjetivoMs, frecuencia]);

    const tiempoHastaProximo = useMemo(() => {
        const delta = ventana.inicioProximoAyunoMs - Date.now();
        if (delta <= 0) return 'Ya disponible';
        return `En ${formatearDuracionAyuno(delta)}`;
    }, [ventana.inicioProximoAyunoMs]);

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
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="input input--text selectorVentanaOportunidad__inputHora modalAyunoTimelineHoraInput"
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
                        claseAdicional="modalAyunoFinalizarBoton modalAyunoFinalizarBoton--secundario"
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
                        claseAdicional="modalAyunoFinalizarBoton modalAyunoFinalizarBoton--peligro"
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
                        claseAdicional="modalAyunoFinalizarBoton modalAyunoFinalizarBoton--primario"
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

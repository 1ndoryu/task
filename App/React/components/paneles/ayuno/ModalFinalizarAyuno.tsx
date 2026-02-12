/*
 * ModalFinalizarAyuno
 * Al terminar un ayuno, muestra detalles y pregunta si desea:
 * - Guardar el registro
 * - Eliminar (descartar) el registro
 * - Continuar el ayuno
 */

import {useMemo} from 'react';
import {Play, Trash2, Save} from 'lucide-react';
import {Modal} from '../../shared/Modal';
import type {FrecuenciaHabito} from '../../../types/dashboard';
import {calcularVentanaComidaMs, formatearDuracionAyuno} from '../../../utils/ayunoVentanas';

interface ModalFinalizarAyunoProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    inicioAyunoMs: number;
    finAyunoMs: number;
    duracionObjetivoMs: number;
    frecuencia: FrecuenciaHabito | undefined;
    onGuardar: () => void;
    onEliminar: () => void;
    onContinuar: () => void;
}

function formatearFechaHoraCorta(ms: number): string {
    const fecha = new Date(ms);
    return fecha.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function ModalFinalizarAyuno({estaAbierto, onCerrar, inicioAyunoMs, finAyunoMs, duracionObjetivoMs, frecuencia, onGuardar, onEliminar, onContinuar}: ModalFinalizarAyunoProps): JSX.Element | null {
    const tiempoEfectivoMs = Math.max(0, finAyunoMs - inicioAyunoMs);
    const completado = tiempoEfectivoMs >= duracionObjetivoMs;

    const ventana = useMemo(() => {
        return calcularVentanaComidaMs({inicioAyunoMs, finAyunoMs, frecuencia});
    }, [inicioAyunoMs, finAyunoMs, frecuencia]);

    const textoVentana = useMemo(() => {
        if (ventana.duracionVentanaComidaMs <= 0) return 'Sin ventana de comida (según tu frecuencia)';
        return `${formatearFechaHoraCorta(ventana.inicioVentanaComidaMs)} → ${formatearFechaHoraCorta(ventana.finVentanaComidaMs)} (${formatearDuracionAyuno(ventana.duracionVentanaComidaMs)})`;
    }, [ventana]);

    const textoProximoAyuno = useMemo(() => {
        const deltaMs = ventana.inicioProximoAyunoMs - finAyunoMs;
        if (deltaMs <= 0) return `${formatearFechaHoraCorta(ventana.inicioProximoAyunoMs)} (ya debería haber empezado)`;
        return `${formatearFechaHoraCorta(ventana.inicioProximoAyunoMs)} (en ${formatearDuracionAyuno(deltaMs)})`;
    }, [ventana.inicioProximoAyunoMs, finAyunoMs]);

    if (!estaAbierto) return null;

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Finalizar ayuno" claseExtra="modalAyunoFinalizar">
            <div className="modalAyunoFinalizarContenido">
                <p className="modalAyunoFinalizarTexto">¿Qué deseas hacer con este registro?</p>

                <div className="modalAyunoFinalizarResumen">
                    <div className="modalAyunoFinalizarFila">
                        <span className="modalAyunoFinalizarEtiqueta">Duración</span>
                        <span className={`modalAyunoFinalizarValor ${completado ? 'modalAyunoFinalizarValor--completado' : ''}`}>{formatearDuracionAyuno(tiempoEfectivoMs)}</span>
                    </div>

                    <div className="modalAyunoFinalizarFila">
                        <span className="modalAyunoFinalizarEtiqueta">Objetivo</span>
                        <span className="modalAyunoFinalizarValor">{formatearDuracionAyuno(duracionObjetivoMs)}</span>
                    </div>

                    <div className="modalAyunoFinalizarFila">
                        <span className="modalAyunoFinalizarEtiqueta">Inicio</span>
                        <span className="modalAyunoFinalizarValor">{formatearFechaHoraCorta(inicioAyunoMs)}</span>
                    </div>

                    <div className="modalAyunoFinalizarFila">
                        <span className="modalAyunoFinalizarEtiqueta">Fin</span>
                        <span className="modalAyunoFinalizarValor">{formatearFechaHoraCorta(finAyunoMs)}</span>
                    </div>

                    <div className="modalAyunoFinalizarFila">
                        <span className="modalAyunoFinalizarEtiqueta">Ventana de comida</span>
                        <span className="modalAyunoFinalizarValor">{textoVentana}</span>
                    </div>

                    <div className="modalAyunoFinalizarFila">
                        <span className="modalAyunoFinalizarEtiqueta">Próximo ayuno</span>
                        <span className="modalAyunoFinalizarValor">{textoProximoAyuno}</span>
                    </div>
                </div>

                <div className="modalAyunoFinalizarAcciones">
                    <button
                        type="button"
                        className="modalAyunoFinalizarBoton modalAyunoFinalizarBoton--secundario"
                        onClick={() => {
                            onContinuar();
                            onCerrar();
                        }}
                        title="Continuar ayuno">
                        <Play size={14} />
                        <span>Continuar</span>
                    </button>

                    <button
                        type="button"
                        className="modalAyunoFinalizarBoton modalAyunoFinalizarBoton--peligro"
                        onClick={() => {
                            onEliminar();
                            onCerrar();
                        }}
                        title="Eliminar registro">
                        <Trash2 size={14} />
                        <span>Eliminar</span>
                    </button>

                    <button
                        type="button"
                        className="modalAyunoFinalizarBoton modalAyunoFinalizarBoton--primario"
                        onClick={() => {
                            onGuardar();
                            onCerrar();
                        }}
                        title="Guardar registro">
                        <Save size={14} />
                        <span>Guardar</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
}

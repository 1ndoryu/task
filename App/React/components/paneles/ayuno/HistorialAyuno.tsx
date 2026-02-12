/*
 * HistorialAyuno
 * Historial colapsable + paginación (máx 6 registros) + borrado de sesiones.
 */

import {useMemo, useState} from 'react';
import {ChevronDown, ChevronRight, Trash2, Utensils, Clock, Flag, Target} from 'lucide-react';
import type {SesionAyuno} from '../../../types/ayuno';

interface HistorialAyunoProps {
    sesiones: SesionAyuno[];
    maxPorPagina?: number;
    onEliminarSesion: (sesionId: string) => void;
}

function formatearDuracion(ms: number): string {
    const totalMin = Math.floor(ms / 60000);
    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;

    if (horas <= 0) return `${minutos}m`;
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
}

function formatearHora(ms?: number): string | null {
    if (!ms) return null;
    return new Date(ms).toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'});
}

export function HistorialAyuno({sesiones, maxPorPagina = 6, onEliminarSesion}: HistorialAyunoProps): JSX.Element | null {
    const [colapsado, setColapsado] = useState(true);
    const [pagina, setPagina] = useState(0);

    const totalPaginas = Math.max(1, Math.ceil(sesiones.length / maxPorPagina));

    const sesionesPagina = useMemo(() => {
        const inicio = pagina * maxPorPagina;
        return sesiones.slice(inicio, inicio + maxPorPagina);
    }, [sesiones, pagina, maxPorPagina]);

    if (sesiones.length === 0) return null;

    return (
        <div className="panelAyunoHistorial">
            <button type="button" className="panelAyunoHistorialToggle" onClick={() => setColapsado(p => !p)} title={colapsado ? 'Mostrar historial' : 'Ocultar historial'}>
                {colapsado ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span className="panelAyunoHistorialTitulo">Historial</span>
                <span className="panelAyunoHistorialContador">({sesiones.length})</span>
            </button>

            {!colapsado && (
                <>
                    <div className="panelAyunoHistorialLista">
                        {sesionesPagina.map(s => {
                            const fecha = new Date(s.inicio);
                            const dia = fecha.toLocaleDateString('es', {weekday: 'short', day: 'numeric', month: 'short'});
                            const horaInicio = new Date(s.inicio).toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'});
                            const horaFin = s.fin ? new Date(s.fin).toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'}) : null;
                            const horaUltimaComida = formatearHora(s.horaUltimaComidaMs);
                            const duracionObjetivo = formatearDuracion(s.duracionObjetivoMs);

                            return (
                                <div key={s.id} className={`panelAyunoHistorialItem ${s.completada ? 'panelAyunoHistorialItem--completado' : ''}`}>
                                    <div className="panelAyunoHistorialFila">
                                        <div className="panelAyunoHistorialInfo">
                                            <span className="panelAyunoHistorialItemFecha">{dia}</span>
                                            <div className="panelAyunoHistorialItemDetalles">
                                                {horaUltimaComida && (
                                                    <span className="panelAyunoHistorialItemMeta">
                                                        <Utensils size={10} /> {horaUltimaComida}
                                                    </span>
                                                )}
                                                <span className="panelAyunoHistorialItemMeta">
                                                    <Clock size={10} /> {horaInicio}
                                                </span>
                                                {horaFin && (
                                                    <span className="panelAyunoHistorialItemMeta">
                                                        <Flag size={10} /> {horaFin}
                                                    </span>
                                                )}
                                                <span className="panelAyunoHistorialItemMeta">
                                                    <Target size={10} /> {duracionObjetivo}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="panelAyunoHistorialAcciones">
                                            <span className="panelAyunoHistorialItemTiempo">{formatearDuracion(s.tiempoEfectivoMs)}</span>
                                            <button type="button" className="panelAyunoHistorialEliminar" onClick={() => onEliminarSesion(s.id)} title="Borrar registro" aria-label="Borrar registro">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPaginas > 1 && (
                        <div className="panelAyunoHistorialPaginacion">
                            <button type="button" className="panelAyunoHistorialPaginacionBoton" onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina <= 0}>
                                Anterior
                            </button>
                            <span className="panelAyunoHistorialPaginacionTexto">
                                {pagina + 1}/{totalPaginas}
                            </span>
                            <button type="button" className="panelAyunoHistorialPaginacionBoton" onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1}>
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

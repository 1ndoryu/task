/*
 * HistorialAyuno
 * Historial colapsable + paginación (máx 6 registros) + borrado de sesiones.
 */

import {useMemo, useState} from 'react';
import {ChevronDown, ChevronRight, Trash2} from 'lucide-react';
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
                            const dia = fecha.toLocaleDateString('es', {day: 'numeric', month: 'short'});
                            const horaUltimaComida = formatearHora(s.horaUltimaComidaMs);

                            return (
                                <div key={s.id} className={`panelAyunoHistorialItem ${s.completada ? 'panelAyunoHistorialItem--completado' : ''}`}>
                                    <div className="panelAyunoHistorialInfo">
                                        <span className="panelAyunoHistorialItemFecha">{dia}</span>
                                        <span className="panelAyunoHistorialItemTiempo">{formatearDuracion(s.tiempoEfectivoMs)}</span>
                                        {horaUltimaComida && <span className="panelAyunoHistorialItemMeta">Última comida: {horaUltimaComida}</span>}
                                    </div>
                                    <button type="button" className="panelAyunoHistorialEliminar" onClick={() => onEliminarSesion(s.id)} title="Borrar registro">
                                        <Trash2 size={12} />
                                    </button>
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

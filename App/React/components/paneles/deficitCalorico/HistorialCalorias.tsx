/*
 * HistorialCalorias
 * Lista de comidas agrupadas por días con paginación (3 comidas por página)
 * Incluye botones de reintentar e inspeccionar el proceso de IA
 */

import {useState, useMemo} from 'react';
import {ChevronDown, ChevronRight, Trash2, RotateCcw, Eye, Clock, Beef, Wheat, Droplet} from 'lucide-react';
import type {ComidaRegistrada} from '../../../types/deficitCalorico';

interface HistorialCaloriasProps {
    comidas: ComidaRegistrada[];
    maxPorPagina?: number;
    onEliminar: (id: string) => void;
    onReintentar?: (prompt: string) => void;
    onInspeccionar?: (log: string[]) => void;
}

function formatearHora(ms: number): string {
    return new Date(ms).toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'});
}

function formatearFecha(fecha: string): string {
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es', {weekday: 'short', day: 'numeric', month: 'short'});
}

export function HistorialCalorias({comidas, maxPorPagina = 3, onEliminar, onReintentar, onInspeccionar}: HistorialCaloriasProps): JSX.Element | null {
    const [colapsado, setColapsado] = useState(false); /* Expandido por defecto para mostrar comidas de hoy */
    const [pagina, setPagina] = useState(0);

    /* Agrupar comidas por fecha */
    const comidasPorDia = useMemo(() => {
        const grupos = new Map<string, ComidaRegistrada[]>();

        /* Ordenar comidas por fecha descendente (más reciente primero) */
        const ordenadas = [...comidas].sort((a, b) => {
            if (a.fecha === b.fecha) {
                return b.horaRegistro - a.horaRegistro; /* Dentro del mismo día, más reciente primero */
            }
            return b.fecha.localeCompare(a.fecha);
        });

        for (const comida of ordenadas) {
            if (!grupos.has(comida.fecha)) {
                grupos.set(comida.fecha, []);
            }
            grupos.get(comida.fecha)!.push(comida);
        }

        return Array.from(grupos.entries());
    }, [comidas]);

    /* Paginación: dividir grupos de días en páginas */
    const totalPaginas = Math.max(1, Math.ceil(comidasPorDia.length / maxPorPagina));
    const diasPagina = useMemo(() => {
        const inicio = pagina * maxPorPagina;
        return comidasPorDia.slice(inicio, inicio + maxPorPagina);
    }, [comidasPorDia, pagina, maxPorPagina]);

    if (comidas.length === 0) return null;

    return (
        <div className="deficitHistorial">
            <button type="button" className="deficitHistorialToggle" onClick={() => setColapsado(p => !p)} title={colapsado ? 'Mostrar historial' : 'Ocultar historial'}>
                {colapsado ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span className="deficitHistorialTitulo">Historial</span>
                <span className="deficitHistorialContador">({comidas.length})</span>
            </button>

            {!colapsado && (
                <>
                    <div className="deficitHistorialLista">
                        {diasPagina.map(([fecha, comidasDelDia]) => {
                            const totalCaloriasDia = comidasDelDia.reduce((sum, c) => sum + c.calorias, 0);
                            return (
                                <div key={fecha} className="deficitHistorialDiaGrupo">
                                    <div className="deficitHistorialDiaHeader">
                                        <span className="deficitHistorialDiaFecha">{formatearFecha(fecha)}</span>
                                        <span className="deficitHistorialDiaTotalCalorias">{totalCaloriasDia} kcal</span>
                                    </div>
                                    <div className="deficitHistorialDiaComidas">
                                        {comidasDelDia.map(comida => {
                                            const hora = formatearHora(comida.horaRegistro);
                                            return (
                                                <div key={comida.id} className="deficitComidaItem">
                                                    <div className="deficitComidaInfo">
                                                        <span className="deficitComidaDesc">{comida.descripcion}</span>
                                                        <div className="deficitComidaDetalles">
                                                            <span className="deficitComidaHora">
                                                                <Clock size={10} /> {hora}
                                                            </span>
                                                            {comida.proteinas !== undefined && (
                                                                <span className="deficitComidaMacro">
                                                                    <Beef size={10} /> {comida.proteinas}g
                                                                </span>
                                                            )}
                                                            {comida.carbohidratos !== undefined && (
                                                                <span className="deficitComidaMacro">
                                                                    <Wheat size={10} /> {comida.carbohidratos}g
                                                                </span>
                                                            )}
                                                            {comida.grasas !== undefined && (
                                                                <span className="deficitComidaMacro">
                                                                    <Droplet size={10} /> {comida.grasas}g
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="deficitComidaAcciones">
                                                        <span className="deficitComidaCalorias">{comida.calorias} kcal</span>
                                                        {comida.promptOriginal && onReintentar && (
                                                            <button type="button" className="deficitComidaBotonAccion deficitComidaBotonAccion--reintentar" onClick={() => onReintentar(comida.promptOriginal!)} title="Reintentar con el mismo prompt">
                                                                <RotateCcw size={12} />
                                                            </button>
                                                        )}
                                                        {comida.logProceso && onInspeccionar && (
                                                            <button type="button" className="deficitComidaBotonAccion deficitComidaBotonAccion--inspeccionar" onClick={() => onInspeccionar(comida.logProceso!)} title="Ver proceso de IA">
                                                                <Eye size={12} />
                                                            </button>
                                                        )}
                                                        <button type="button" className="deficitComidaEliminar" onClick={() => onEliminar(comida.id)} title="Eliminar">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPaginas > 1 && (
                        <div className="deficitHistorialPaginacion">
                            <button type="button" className="deficitHistorialPaginacionBoton" onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina <= 0}>
                                Anterior
                            </button>
                            <span className="deficitHistorialPaginacionTexto">
                                {pagina + 1}/{totalPaginas}
                            </span>
                            <button type="button" className="deficitHistorialPaginacionBoton" onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1}>
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

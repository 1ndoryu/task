/*
 * HistorialCalorias
 * Lista de comidas agrupadas por días con paginación (3 comidas por página)
 * Incluye botones de reintentar e inspeccionar el proceso de IA
 */

import {useState, useMemo} from 'react';
import {ChevronDown, ChevronRight, Trash2, RotateCcw, Eye, Clock, Beef, Wheat, Droplet} from 'lucide-react';
import {Boton} from '../../ui';
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
                                                        {comida.promptOriginal && onReintentar && <Boton variante="icono" onClick={() => onReintentar(comida.promptOriginal!)} icono={<RotateCcw size={12} />} title="Reintentar con el mismo prompt" claseAdicional="deficitComidaBotonAccion deficitComidaBotonAccion--reintentar" />}
                                                        {comida.logProceso && onInspeccionar && <Boton variante="icono" onClick={() => onInspeccionar(comida.logProceso!)} icono={<Eye size={12} />} title="Ver proceso de IA" claseAdicional="deficitComidaBotonAccion deficitComidaBotonAccion--inspeccionar" />}
                                                        <Boton variante="icono" onClick={() => onEliminar(comida.id)} icono={<Trash2 size={12} />} title="Eliminar" claseAdicional="deficitComidaEliminar" />
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
                            <Boton variante="secundario" onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina <= 0} claseAdicional="deficitHistorialPaginacionBoton">
                                Anterior
                            </Boton>
                            <span className="deficitHistorialPaginacionTexto">
                                {pagina + 1}/{totalPaginas}
                            </span>
                            <Boton variante="secundario" onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1} claseAdicional="deficitHistorialPaginacionBoton">
                                Siguiente
                            </Boton>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

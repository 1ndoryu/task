/*
 * plugins/agente/barraContexto.tsx
 * [039A-1/FASE-FINAL] Barra de uso de contexto del chat, extraída de
 * mensajes.tsx para respetar el límite de líneas. mensajes.tsx la re-exporta
 * para no romper los imports de los call-sites (vía componentes.tsx).
 */

import {Boton} from '../../components/ui/Boton';
import {Loader2} from 'lucide-react';
import type {ContextoVisual} from './mensajes';

/* ---------- Barra de uso de contexto inferior (318A-5) ---------- */

export interface BarraContextoInferiorProps {
    /* Contexto del último turno del chat (si lo hay). */
    contexto?: ContextoVisual | null;
    /* Ventana máxima de contexto configurada (tokens). */
    maxVentana: number;
    /* [318A-7] Compactar: marca los mensajes antiguos como compactados e
     * inserta un resumen system (endpoint POST /compactar). */
    onCompactar?: () => void;
    /* [318A-7] El endpoint de compactación está en curso (deshabilita el botón). */
    compactando?: boolean;
}

/* [318A-5] Barra fija sobre el input que muestra el uso del contexto con una
 * barra de progreso. Al poner el mouse encima muestra un tooltip con el
 * detalle. [318A-7] Si el runtime emitió `contexto_detalle`, el tooltip muestra
 * el desglose por secciones (System Instructions, Tool Definitions, Messages,
 * Tool Results, Reservado para respuesta) + botón Compactar.
 * Fuente de datos: eventos usage/contexto/contexto_detalle del último turno. */
export function BarraContextoInferior({contexto, maxVentana, onCompactar, compactando = false}: BarraContextoInferiorProps): JSX.Element {
    const ocupacionPct =
        contexto?.ocupacionPct !== null && contexto?.ocupacionPct !== undefined
            ? contexto.ocupacionPct
            : maxVentana > 0 && (contexto?.tokensPrompt ?? 0) > 0
                ? Math.min(100, ((contexto?.tokensPrompt ?? 0) / maxVentana) * 100)
                : null;
    const usado = contexto?.tokensPrompt ?? 0;
    const porc = ocupacionPct !== null ? ocupacionPct : 0;
    const mostrado = ocupacionPct !== null;

    /* [318A-7] Desglose por secciones (si el runtime lo emitió). */
    const ventana = contexto?.maxVentana ?? maxVentana;
    const reserva = contexto?.reservaSalida ?? 0;
    const secciones = [
        {clave: 'system', nombre: 'System Instructions', tokens: contexto?.systemInstrucciones ?? 0},
        {clave: 'tools', nombre: 'Tool Definitions', tokens: contexto?.definicionesTools ?? 0},
        {clave: 'mensajes', nombre: 'Messages', tokens: contexto?.mensajes ?? 0},
        {clave: 'resultados', nombre: 'Tool Results', tokens: contexto?.resultadosTools ?? 0},
    ];
    const tieneDesglose =
        contexto?.systemInstrucciones !== undefined &&
        contexto?.definicionesTools !== undefined &&
        contexto?.mensajes !== undefined &&
        contexto?.resultadosTools !== undefined;
    const pctSeccion = (tokens: number): string =>
        ventana > 0 ? `${((tokens / ventana) * 100).toFixed(1)}%` : '—';

    return (
        <div className="panelIAContextoBarra" title="">
            <div className="panelIAContextoBarraPista">
                <div
                    className={`panelIAContextoBarraRelleno ${porc >= 85 ? 'panelIAContextoBarraRelleno--critico' : porc >= 70 ? 'panelIAContextoBarraRelleno--alto' : ''}`}
                    /* Ancho data-driven (% tokens usados): no expresable en CSS. */
                    style={{ /* sentinel-disable inline-style-prohibido */
                        width: mostrado ? `${Math.max(2, Math.min(100, porc))}%` : '0%'
                    }}
                />
            </div>
            <div
                className={`panelIAContextoBarraTooltip ${tieneDesglose && onCompactar ? 'panelIAContextoBarraTooltip--conAccion' : ''}`}
                role="tooltip"
            >
                {mostrado ? (
                    <>
                        <div className="panelIAContextoBarraTooltipTitulo">
                            <strong>{porc.toFixed(0)}%</strong>
                            <span>de contexto usado</span>
                        </div>
                        <span className="panelIAContextoBarraDetalle">
                            {usado.toLocaleString('es')} tok usados · {ventana.toLocaleString('es')} tok máx
                        </span>
                        {contexto?.tokensComplecion ? (
                            <span className="panelIAContextoBarraDetalle">
                                {contexto.tokensComplecion.toLocaleString('es')} tok de salida
                            </span>
                        ) : null}
                        {contexto?.skills ? (
                            <span className="panelIAContextoBarraDetalle">{contexto.skills} skills activas</span>
                        ) : null}
                        {tieneDesglose && (
                            <>
                                <div className="panelIAContextoBarraSecciones">
                                    <span className="panelIAContextoBarraSeccionTitulo">Ventana de contexto</span>
                                    {secciones.map(s => (
                                        <div key={s.clave} className="panelIAContextoBarraSeccion">
                                            <span className="panelIAContextoBarraSeccionNombre">{s.nombre}</span>
                                            <span className="panelIAContextoBarraSeccionValor">
                                                {s.tokens.toLocaleString('es')} · {pctSeccion(s.tokens)}
                                            </span>
                                        </div>
                                    ))}
                                    {reserva > 0 && (
                                        <div className="panelIAContextoBarraSeccion">
                                            <span className="panelIAContextoBarraSeccionNombre">Reservado para respuesta</span>
                                            <span className="panelIAContextoBarraSeccionValor">
                                                {reserva.toLocaleString('es')} · {pctSeccion(reserva)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {onCompactar && (
                                    <Boton
                                        variante="secundario"
                                        tamano="pequeño"
                                        onClick={onCompactar}
                                        disabled={compactando}
                                        title="Compacta los mensajes antiguos en un resumen y libera la ventana de contexto"
                                    >
                                        {compactando ? <Loader2 size={11} className="animacionGirar" /> : null}
                                        {compactando ? 'Compactando...' : 'Compactar'}
                                    </Boton>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <>Sin datos de contexto del último turno · ventana {ventana.toLocaleString('es')} tok</>
                )}
            </div>
        </div>
    );
}

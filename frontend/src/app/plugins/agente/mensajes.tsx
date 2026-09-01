/*
 * plugins/agente/mensajes.tsx
 * Burbujas y tarjetas de mensaje del chat, extraídas de componentes.tsx para
 * respetar el límite de líneas. componentes.tsx las re-exporta para no romper
 * los imports de los call-sites (galería visual, PanelAgente, ModalConfigAgente).
 */

import {AlertTriangle, CheckCircle, Loader2, Wrench, XCircle} from 'lucide-react';
import {Boton} from '../../components/ui/Boton';

/* ---------- Tipos visuales (espejo del store) ---------- */

export interface HerramientaVisual {
    tool: string;
    ok: boolean;
    resumen: string;
    argumentos?: unknown;
    diff?: string;
}

export interface ContextoVisual {
    ocupacionPct: number | null;
    tokensPrompt: number;
    tokensComplecion: number;
    skills: number;
}

/* ---------- Tarjetas de tool y contexto ---------- */

export function TarjetaTool({h}: {h: HerramientaVisual}): JSX.Element {
    return (
        <details
            className={`panelAgenteHerramienta ${h.ok ? 'panelAgenteHerramienta--ok' : 'panelAgenteHerramienta--error'}`}
            open={h.resumen === 'ejecutando...'}
        >
            <summary className="panelAgenteHerramientaResumen">
                {h.ok ? <CheckCircle size={10} /> : <XCircle size={10} />}
                <Wrench size={10} />
                <span className="panelAgenteHerramientaNombre">{h.tool}</span>
                <span className="panelAgenteHerramientaTexto">{h.resumen}</span>
            </summary>
            {h.diff !== undefined && h.diff !== null && h.diff !== '' ? (
                <pre className="panelAgenteHerramientaArgs">{h.diff}</pre>
            ) : (
                h.argumentos !== undefined && (
                    <pre className="panelAgenteHerramientaArgs">{JSON.stringify(h.argumentos, null, 2)}</pre>
                )
            )}
        </details>
    );
}

export function BarraContexto({contexto}: {contexto: ContextoVisual}): JSX.Element {
    return (
        <div className="panelAgenteContexto">
            {contexto.skills > 0 && <span>{contexto.skills} skills</span>}
            {contexto.ocupacionPct !== null && <span>{contexto.ocupacionPct.toFixed(0)}% contexto</span>}
            {contexto.tokensPrompt > 0 && (
                <span>{contexto.tokensPrompt} tok entrada · {contexto.tokensComplecion} salida</span>
            )}
        </div>
    );
}

/* ---------- Barra de uso de contexto inferior (318A-5) ---------- */

interface BarraContextoInferiorProps {
    /* Contexto del último turno del chat (si lo hay). */
    contexto?: ContextoVisual | null;
    /* Ventana máxima de contexto configurada (tokens). */
    maxVentana: number;
}

/* [318A-5] Barra fija sobre el input que muestra el uso del contexto con una
 * barra de progreso. Al poner el mouse encima muestra un tooltip con el
 * detalle: tokens usados, máximo, porcentaje, skills y tokens de salida.
 * Fuente de datos: eventos usage/contexto del último turno (el runtime solo
 * emite tokens_prompt reales del proveedor cuando el streaming termina). */
export function BarraContextoInferior({contexto, maxVentana}: BarraContextoInferiorProps): JSX.Element {
    const ocupacionPct =
        contexto?.ocupacionPct !== null && contexto?.ocupacionPct !== undefined
            ? contexto.ocupacionPct
            : maxVentana > 0 && (contexto?.tokensPrompt ?? 0) > 0
                ? Math.min(100, ((contexto?.tokensPrompt ?? 0) / maxVentana) * 100)
                : null;
    const usado = contexto?.tokensPrompt ?? 0;
    const porc = ocupacionPct !== null ? ocupacionPct : 0;
    const mostrado = ocupacionPct !== null;
    return (
        <div className="panelIAContextoBarra" title="">
            <div className="panelIAContextoBarraPista">
                <div
                    className={`panelIAContextoBarraRelleno ${porc >= 85 ? 'panelIAContextoBarraRelleno--critico' : porc >= 70 ? 'panelIAContextoBarraRelleno--alto' : ''}`}
                    style={{width: mostrado ? `${Math.max(2, Math.min(100, porc))}%` : '0%'}}
                />
            </div>
            <div className="panelIAContextoBarraTooltip" role="tooltip">
                {mostrado ? (
                    <>
                        <strong>{porc.toFixed(0)}%</strong> de contexto usado
                        <span className="panelIAContextoBarraDetalle">
                            {usado.toLocaleString('es')} tok usados · {maxVentana.toLocaleString('es')} tok máx
                        </span>
                        {contexto?.tokensComplecion ? (
                            <span className="panelIAContextoBarraDetalle">{contexto.tokensComplecion.toLocaleString('es')} tok de salida</span>
                        ) : null}
                        {contexto?.skills ? (
                            <span className="panelIAContextoBarraDetalle">{contexto.skills} skills activas</span>
                        ) : null}
                    </>
                ) : (
                    <>Sin datos de contexto del último turno · ventana {maxVentana.toLocaleString('es')} tok</>
                )}
            </div>
        </div>
    );
}

export function AprobacionPendiente({tool}: {tool: string}): JSX.Element {
    return (
        <div className="panelIAAccionBadge panelIAAccionBadge--pendiente">
            <AlertTriangle size={10} />
            <span>{tool} requiere aprobación del usuario</span>
        </div>
    );
}

export function BotonReintentar({onClick}: {onClick?: () => void}): JSX.Element {
    return (
        <Boton
            variante="ghost"
            tamano="pequeño"
            onClick={onClick}
            title="Reenviar el último mensaje con la misma clave de idempotencia"
        >
            ↻ Reintentar
        </Boton>
    );
}

export function IndicadorPensando(): JSX.Element {
    return (
        <div className="panelIAMensajeBurbuja--cargando panelAgentePensando">
            <Loader2 size={12} className="animacionGirar" />
            <span>Pensando...</span>
        </div>
    );
}

/* ---------- Burbujas de mensaje ---------- */

/* [318A-5] Botones de acción del mensaje (volver atrás / editar). Solo en los
 * mensajes del USUARIO, sobre la burbuja, en fila (uno al lado del otro) y
 * solo icono: el nombre completo va en el tooltip (title). */
function AccionesMensaje({
    onVolver,
    onEditar,
}: {
    onVolver?: () => void;
    onEditar?: () => void;
}): JSX.Element | null {
    if (!onVolver && !onEditar) return null;
    return (
        <div className="panelIAMensajeAcciones panelIAMensajeAcciones--usuario">
            {onVolver && (
                <button
                    type="button"
                    className="panelIAMensajeAccion"
                    title="Volver a este mensaje (descarta el contexto posterior)"
                    aria-label="Volver a este mensaje"
                    onClick={onVolver}
                >
                    ←
                </button>
            )}
            {onEditar && (
                <button
                    type="button"
                    className="panelIAMensajeAccion"
                    title="Editar este mensaje (el contexto vuelve a este punto)"
                    aria-label="Editar este mensaje"
                    onClick={onEditar}
                >
                    ✎
                </button>
            )}
        </div>
    );
}

interface MensajeUsuarioProps {
    contenido: string;
    /* [318A-5] id real del mensaje en BD (para rebobinar). */
    idBd?: number;
    onVolver?: () => void;
    onEditar?: () => void;
}

export function MensajeUsuario({contenido, onVolver, onEditar}: MensajeUsuarioProps): JSX.Element {
    return (
        <div className="panelIAMensaje panelIAMensaje--usuario">
            <AccionesMensaje onVolver={onVolver} onEditar={onEditar} />
            <div className="panelIAMensajeBurbuja">
                <span className="panelIAMensajeTexto">{contenido || '...'}</span>
            </div>
        </div>
    );
}

interface MensajeAsistenteProps {
    contenido: string;
    herramientas?: HerramientaVisual[];
    contexto?: ContextoVisual | null;
    aprobacionPendiente?: {tool: string; argumentos: unknown} | null;
    reintentar?: boolean | null;
    enviando?: boolean;
    ultimo?: boolean;
    onReintentar?: () => void;
}

export function MensajeAsistente({
    contenido,
    herramientas,
    contexto,
    aprobacionPendiente,
    reintentar,
    enviando,
    ultimo,
    onReintentar,
}: MensajeAsistenteProps): JSX.Element {
    const contextoVisible = Boolean(
        contexto && (contexto.ocupacionPct !== null || contexto.tokensPrompt > 0 || contexto.skills > 0)
    );
    return (
        <div className="panelIAMensaje panelIAMensaje--asistente">
            <div className="panelIAMensajeBurbuja">
                <span className="panelIAMensajeTexto">{contenido || '...'}</span>

                {herramientas && herramientas.length > 0 && (
                    <div className="panelAgenteHerramientas">
                        {herramientas.map((h, i) => (
                            <TarjetaTool key={`${h.tool}-${i}`} h={h} />
                        ))}
                    </div>
                )}

                {contextoVisible && <BarraContexto contexto={contexto!} />}

                {reintentar && !enviando && <BotonReintentar onClick={onReintentar} />}

                {aprobacionPendiente && <AprobacionPendiente tool={aprobacionPendiente.tool} />}

                {enviando && ultimo && contenido === '' && <IndicadorPensando />}
            </div>
        </div>
    );
}
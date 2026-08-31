/*
 * plugins/agente/mensajes.tsx
 * Burbujas y tarjetas de mensaje del chat, extraídas de componentes.tsx para
 * respetar el límite de líneas. componentes.tsx las re-exporta para no romper
 * los imports de los call-sites (galería visual, PanelAgente, ModalConfigAgente).
 */

import {AlertTriangle, Bot, CheckCircle, Loader2, Wrench, XCircle} from 'lucide-react';
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

export function MensajeUsuario({contenido}: {contenido: string}): JSX.Element {
    return (
        <div className="panelIAMensaje panelIAMensaje--usuario">
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
            <div className="panelIAMensajeAvatar">
                <Bot size={14} />
            </div>
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
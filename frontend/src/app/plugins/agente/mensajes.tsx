/*
 * plugins/agente/mensajes.tsx
 * Burbujas y tarjetas de mensaje del chat, extraídas de componentes.tsx para
 * respetar el límite de líneas. componentes.tsx las re-exporta para no romper
 * los imports de los call-sites (galería visual, PanelAgente, ModalConfigAgente).
 */

import {useState} from 'react';
import {AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Loader2} from 'lucide-react';
import {Boton} from '../../components/ui/Boton';
/* [02-09-2026] Para mostrar el nombre amigable del modelo REAL que respondió
 * (el catálogo mapea provider+modelo → etiqueta; sin ciclo de imports:
 * catalogoModelos.tsx no importa mensajes.tsx). */
import {entradaModelo} from './catalogoModelos';

/* ---------- Tipos visuales (espejo del store) ---------- */

export interface HerramientaVisual {
    tool: string;
    ok: boolean;
    resumen: string;
    argumentos?: unknown;
    diff?: string;
}

/* [318A-7] Contexto del último turno. `contexto_detalle` (evento del runtime)
 * añade el desglose por secciones de la ventana: system, definiciones de
 * tools, mensajes, resultados de tools, reserva de salida y ventana máxima.
 * [02-09-2026] `provider`/`modelo` = proveedor/modelo REAL que respondió
 * (llega en el evento usage de cada llamada LLM tras resolver el fallback). */
export interface ContextoVisual {
    ocupacionPct: number | null;
    tokensPrompt: number;
    tokensComplecion: number;
    skills: number;
    provider?: string | null;
    modelo?: string | null;
    maxVentana?: number;
    reservaSalida?: number;
    systemInstrucciones?: number;
    definicionesTools?: number;
    mensajes?: number;
    resultadosTools?: number;
    totalEntrada?: number;
}

/* [02-09-2026] Etiqueta del modelo real que respondió. Resuelve el nombre
 * amigable del catálogo (provider+modelo → etiqueta) y cae al ID crudo si el
 * modelo no está en el catálogo (p. ej. un proveedor del fallback distinto).
 * Si no hay dato (turnos previos sin el campo) devuelve null: no se muestra. */
function etiquetaModeloReal(contexto: ContextoVisual): string | null {
    const modelo = contexto.modelo?.trim();
    const provider = contexto.provider?.trim();
    if (!modelo) return null;
    const entrada = entradaModelo(modelo, provider || undefined);
    if (entrada) {
        return provider && provider !== entrada.proveedor
            ? `${entrada.nombre} (${provider})`
            : entrada.nombre;
    }
    return provider ? `${provider}/${modelo}` : modelo;
}

/* [02-09-2026] Formato compacto tipo HUD para cantidades de tokens: 3 → "3",
 * 1400 → "1.4k", 12000 → "12k". Usa notación compacta con separador "." y
 * una cifra decimal máxima; sin sufijo para < 1000 (evita "0.3k" y ruido). */
function formatearCompacto(n: number): string {
    if (n < 1000) return `${n}`;
    const abs = Math.abs(n);
    const unidades = ['', 'k', 'M'];
    const grado = Math.min(2, Math.floor(Math.log10(abs) / 3));
    const valor = abs / Math.pow(10, grado * 3);
    const texto = valor >= 100 ? `${Math.round(valor)}` : valor.toFixed(1);
    return `${texto}${unidades[grado]}`;
}

/* [02-09-2026] Etiqueta de tokens con icono de dirección de entrada/salida
 * (lucide). "CONTX" es la abreviatura de contexto pedida por el usuario. */
function etiquetaTokens(direccion: 'entrada' | 'salida', cantidad: number): JSX.Element {
    const Icono = direccion === 'entrada' ? ArrowDownToLine : ArrowUpFromLine;
    return (
        <span className="panelAgenteContextoChip" title={direccion === 'entrada' ? 'Tokens de entrada (prompt)' : 'Tokens de salida (respuesta)'}>
            <Icono size={9} aria-hidden="true" />
            {formatearCompacto(cantidad)}
        </span>
    );
}

/* ---------- Tarjetas de tool y contexto ---------- */

/* [039A-2] Cabecera del diff: "N líneas · M cambios" para ver de un vistazo
 * que el parche es puntual (los hunks ya colapsan el contexto en el core). */
function encabezadoDiff(diff: string): string {
    const lineas = diff.split('\n').filter(l => l.length > 0);
    const cambios = lineas.filter(l => l.startsWith('-') || l.startsWith('+')).length;
    return `${lineas.length} líneas · ${cambios} cambios`;
}

export function TarjetaTool({h}: {h: HerramientaVisual}): JSX.Element {
    return (
        <details
            className={`panelAgenteHerramienta ${h.ok ? 'panelAgenteHerramienta--ok' : 'panelAgenteHerramienta--error'}`}
            open={h.resumen === 'ejecutando...'}
        >
            <summary className="panelAgenteHerramientaResumen">
                <span className="panelAgenteHerramientaNombre">{h.tool}</span>
                <span className="panelAgenteHerramientaTexto">{h.resumen}</span>
            </summary>
            {h.diff !== undefined && h.diff !== null && h.diff !== '' ? (
                <>
                    <div className="panelAgenteHerramientaDifCabecera">{encabezadoDiff(h.diff)}</div>
                    <pre className="panelAgenteHerramientaArgs">{h.diff}</pre>
                </>
            ) : (
                h.argumentos !== undefined && (
                    <pre className="panelAgenteHerramientaArgs">{JSON.stringify(h.argumentos, null, 2)}</pre>
                )
            )}
        </details>
    );
}

export function BarraContexto({contexto}: {contexto: ContextoVisual}): JSX.Element {
    const modeloReal = etiquetaModeloReal(contexto);
    return (
        <div className="panelAgenteContexto">
            {modeloReal && <span title="Modelo que respondió este turno">{modeloReal}</span>}
            {contexto.skills > 0 && <span>{contexto.skills} skills</span>}
            {contexto.ocupacionPct !== null && (
                <span title="Contexto ocupado en este turno">{contexto.ocupacionPct.toFixed(0)}% CONTX</span>
            )}
            {contexto.tokensPrompt > 0 && (
                <>
                    {etiquetaTokens('entrada', contexto.tokensPrompt)}
                    {contexto.tokensComplecion >= 0 &&
                        etiquetaTokens('salida', contexto.tokensComplecion)}
                </>
            )}
        </div>
    );
}

export {BarraContextoInferior} from './barraContexto';
export type {BarraContextoInferiorProps} from './barraContexto';
/* [318A-16 F2] Decisión de aprobación con las tres vías (Rechazar / Permitir
 * una vez / Permitir siempre). `Permitir siempre` pide confirmación en un
 * segundo clic (patrón opencode: "Always" pasa por confirmación); sin
 * `onResponder` (petición sin id, backend que solo emite `requiere_aprobacion`)
 * muestra solo la insignia informativa del flujo conversacional previo. */
export type DecisionAprobacionUI = 'aprobar' | 'siempre' | 'rechazar';

export function AprobacionPendiente({
    tool,
    clasificacion,
    onResponder,
}: {
    tool: string;
    clasificacion?: string;
    onResponder?: (decision: DecisionAprobacionUI) => void;
}): JSX.Element {
    const [confirmandoSiempre, setConfirmandoSiempre] = useState(false);
    const responder = (decision: DecisionAprobacionUI) => {
        if (decision === 'siempre' && !confirmandoSiempre) {
            setConfirmandoSiempre(true);
            return;
        }
        setConfirmandoSiempre(false);
        onResponder?.(decision);
    };
    return (
        <div className="panelIAAccionBadge panelIAAccionBadge--pendiente">
            <div className="panelAprobacionInfo">
                <AlertTriangle size={10} />
                <span>
                    {tool} requiere aprobación
                    {clasificacion ? ` · ${clasificacion}` : ''}
                </span>
            </div>
            {onResponder && (
                <div className="panelAprobacionBotones">
                    <Boton variante="ghost" tamano="pequeño" onClick={() => responder('rechazar')} title="Denegar esta clase de acción (regla deny persistente)">
                        Rechazar
                    </Boton>
                    <Boton variante="secundario" tamano="pequeño" onClick={() => responder('aprobar')} title="Permitir esta acción una sola vez">
                        Permitir una vez
                    </Boton>
                    {confirmandoSiempre ? (
                        <>
                            <Boton variante="primario" tamano="pequeño" onClick={() => responder('siempre')} title="Confirmar: recordar y permitir siempre esta clase">
                                Confirmar siempre
                            </Boton>
                            <Boton variante="ghost" tamano="pequeño" onClick={() => setConfirmandoSiempre(false)}>
                                No
                            </Boton>
                        </>
                    ) : (
                        <Boton variante="primario" tamano="pequeño" onClick={() => responder('siempre')} title="Recordar esta clase de acción como siempre permitida">
                            Permitir siempre
                        </Boton>
                    )}
                </div>
            )}
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
    aprobacionPendiente?: {id: string; tool: string; argumentos: unknown; clasificacion: string} | null;
    reintentar?: boolean | null;
    enviando?: boolean;
    ultimo?: boolean;
    onReintentar?: () => void;
    /* [318A-16 F2] Responde la petición con las tres vías; sin ella la tarjeta
     * queda informativa (flujo conversacional). */
    onResponderAprobacion?: (decision: DecisionAprobacionUI) => void;
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
    onResponderAprobacion,
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

                {aprobacionPendiente && (
                    <AprobacionPendiente
                        tool={aprobacionPendiente.tool}
                        clasificacion={aprobacionPendiente.clasificacion || undefined}
                        onResponder={aprobacionPendiente.id ? onResponderAprobacion : undefined}
                    />
                )}

                {enviando && ultimo && contenido === '' && <IndicadorPensando />}
            </div>
        </div>
    );
}
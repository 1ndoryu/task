/*
 * plugins/agente/componentes.tsx
 * Componentes visuales compartidos del chat del agente. Son los MISMOS que
 * usa el panel real (PanelAgente, ModalConfigAgente): la galería visual
 * (/agente/visuales, solo dev) los renderiza alimentados por fixtures
 * (fixtures.ts) sin copias ni maquetas divergentes.
 */

import {AlertTriangle, Bot, Check, CheckCircle, Loader2, Pencil, Trash2, Wrench, X, XCircle} from 'lucide-react';
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

export type ModoAgente = 'predeterminado' | 'meta' | 'autonomo';

export interface SkillVisual {
    id: string;
    nombre: string;
    descripcion: string;
    activa: boolean;
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

/* ---------- Tabs de workspace (conversaciones) ---------- */

export interface TabWorkspaceVisual {
    id: string;
    titulo: string;
}

interface TabsWorkspaceProps {
    tabs: TabWorkspaceVisual[];
    activaId: string | null;
    editandoId: string | null;
    tituloEdicion: string;
    onActivar: (id: string) => void;
    onIniciarRenombrado: (id: string, titulo: string) => void;
    onCambiarTituloEdicion: (titulo: string) => void;
    onConfirmarRenombrado: (id: string) => void;
    onCancelarRenombrado: () => void;
    onCerrar: (id: string) => void;
}

export function TabsWorkspace(props: TabsWorkspaceProps): JSX.Element {
    const {
        tabs,
        activaId,
        editandoId,
        tituloEdicion,
        onActivar,
        onIniciarRenombrado,
        onCambiarTituloEdicion,
        onConfirmarRenombrado,
        onCancelarRenombrado,
        onCerrar,
    } = props;
    return (
        <div className="panelAgenteTabs">
            {tabs.map(tab => {
                const activa = tab.id === activaId;
                const editando = editandoId === tab.id;
                return (
                    <div
                        key={tab.id}
                        className={`panelAgenteTab ${activa ? 'panelAgenteTab--activa' : ''}`}
                        onClick={() => onActivar(tab.id)}
                        onDoubleClick={() => onIniciarRenombrado(tab.id, tab.titulo)}
                        title={tab.titulo}
                    >
                        {editando ? (
                            <input
                                className="panelAgenteTabInput"
                                value={tituloEdicion}
                                autoFocus
                                onChange={e => onCambiarTituloEdicion(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') onConfirmarRenombrado(tab.id);
                                    if (e.key === 'Escape') onCancelarRenombrado();
                                    e.stopPropagation();
                                }}
                            />
                        ) : (
                            <span className="panelAgenteTabTitulo">{tab.titulo}</span>
                        )}
                        <button
                            type="button"
                            className="panelAgenteTabCerrar"
                            title="Cerrar conversación"
                            onClick={e => {
                                e.stopPropagation();
                                onCerrar(tab.id);
                            }}
                        >
                            <X size={10} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

/* ---------- Tarjeta de tarea programada ---------- */

export function TarjetaTareaProgramada({
    tarea,
    onEliminar,
}: {
    tarea: {
        id: string;
        nombre: string;
        tipo: 'una_vez' | 'recurrente';
        cron_expr: string | null;
        estado: 'pendiente' | 'ejecutando' | 'completada' | 'fallida' | 'cancelada';
        proxima_ejecucion: string | null;
        result_summary: string | null;
    };
    onEliminar?: (id: string) => void;
}): JSX.Element {
    return (
        <div className="panelAgenteTarea">
            <div className="panelAgenteTareaFila">
                <span className="panelAgenteTareaNombre">{tarea.nombre}</span>
                <span className={`panelAgenteTareaEstado panelAgenteTareaEstado--${tarea.estado}`}>
                    {tarea.estado}
                </span>
                {onEliminar && (
                    <button
                        type="button"
                        className="panelAgenteTareaBorrar"
                        title="Eliminar tarea programada"
                        onClick={() => onEliminar(tarea.id)}
                    >
                        <Trash2 size={10} />
                    </button>
                )}
            </div>
            <div className="panelAgenteTareaMeta">
                {tarea.tipo === 'recurrente'
                    ? (tarea.cron_expr ?? 'recurrente')
                    : tarea.proxima_ejecucion
                        ? `próxima: ${new Date(tarea.proxima_ejecucion).toLocaleString()}`
                        : 'una vez'}
            </div>
            {tarea.result_summary && <div className="panelAgenteTareaResumen">{tarea.result_summary}</div>}
        </div>
    );
}

/* ---------- Estados vacío / carga ---------- */

export function EstadoVacio({icono, texto, children}: {icono: React.ReactNode; texto: string; children?: React.ReactNode}): JSX.Element {
    return (
        <div className="panelIAVacio">
            {icono}
            <p>{texto}</p>
            {children}
        </div>
    );
}

export function EstadoCarga({texto}: {texto: string}): JSX.Element {
    return (
        <div className="panelIAVacio">
            <Loader2 size={24} className="animacionGirar" />
            <p>{texto}</p>
        </div>
    );
}

/* ---------- Botón de cancelación del turno (AbortController) ---------- */

export function BotonCancelar({onCancelar}: {onCancelar?: () => void}): JSX.Element {
    return (
        <Boton
            type="button"
            variante="icono"
            tamano="pequeño"
            soloIcono
            claseAdicional="panelIAInputEnviar"
            onClick={onCancelar}
            icono={<X size={16} />}
            title="Cancelar turno"
        />
    );
}

/* ---------- Selector de modo + aviso de modo autónomo ---------- */

export const MODOS_AGENTE: ReadonlyArray<{id: ModoAgente; nombre: string; descripcion: string}> = Object.freeze([
    {id: 'predeterminado', nombre: 'Predeterminado', descripcion: 'Pide aprobación para herramientas con efecto.'},
    {id: 'meta', nombre: 'Meta', descripcion: 'Permite ajustar reglas además de pedir aprobación.'},
    {id: 'autonomo', nombre: 'Autónomo', descripcion: 'Ejecuta herramientas con efecto sin preguntar.'},
]);

export function SelectorModo({modo, onChange}: {modo: ModoAgente; onChange: (modo: ModoAgente) => void}): JSX.Element {
    return (
        <div className="modalConfigAgenteOpciones" role="radiogroup" aria-label="Modo por defecto">
            {MODOS_AGENTE.map(m => (
                <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={modo === m.id}
                    className={`modalConfigAgenteOpcion ${modo === m.id ? 'modalConfigAgenteOpcion--activa' : ''}`}
                    onClick={() => onChange(m.id)}
                >
                    <span className="modalConfigAgenteOpcionRadio">{modo === m.id && <Check size={12} />}</span>
                    <span className="modalConfigAgenteOpcionTexto">
                        <span className="modalConfigAgenteOpcionNombre">{m.nombre}</span>
                        <span className="modalConfigAgenteOpcionDesc">{m.descripcion}</span>
                    </span>
                </button>
            ))}
        </div>
    );
}

export function AvisoModoAutonomo(): JSX.Element {
    return (
        <p className="modalConfigAgenteAvisoAutonomo" role="alert">
            <AlertTriangle size={11} /> Modo autónomo: el agente ejecutará herramientas con efecto sin pedir aprobación.
        </p>
    );
}

/* ---------- Fila de skill (lista del modal) ---------- */

interface SkillFilaProps {
    skill: SkillVisual;
    onActivar?: (skill: SkillVisual) => void;
    onEditar?: (skill: SkillVisual) => void;
    onEliminar?: (id: string) => void;
}

export function SkillFila({skill, onActivar, onEditar, onEliminar}: SkillFilaProps): JSX.Element {
    return (
        <div className="modalConfigAgenteSkill">
            {onActivar && (
                <label className="modalConfigAgenteSkillActiva" title={skill.activa ? 'Desactivar' : 'Activar'}>
                    <input type="checkbox" checked={skill.activa} onChange={() => onActivar(skill)} />
                </label>
            )}
            <div className="modalConfigAgenteSkillTexto">
                <span className="modalConfigAgenteSkillNombre">{skill.nombre}</span>
                {skill.descripcion && <span className="modalConfigAgenteSkillDesc">{skill.descripcion}</span>}
            </div>
            {(onEditar || onEliminar) && (
                <div className="modalConfigAgenteSkillAcciones">
                    {onEditar && (
                        <button type="button" className="modalConfigAgenteSkillBoton" onClick={() => onEditar(skill)} aria-label={`Editar ${skill.nombre}`}>
                            <Pencil size={13} />
                        </button>
                    )}
                    {onEliminar && (
                        <button type="button" className="modalConfigAgenteSkillBoton" onClick={() => onEliminar(skill.id)} aria-label={`Eliminar ${skill.nombre}`}>
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

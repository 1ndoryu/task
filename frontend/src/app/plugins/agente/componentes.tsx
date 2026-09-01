/*
 * plugins/agente/componentes.tsx
 * Componentes visuales compartidos del chat del agente. Son los MISMOS que
 * usa el panel real (PanelAgente, ModalConfigAgente): la galería visual
 * (/agente/visuales, solo dev) los renderiza alimentados por fixtures
 * (fixtures.ts) sin copias ni maquetas divergentes.
 */

import {useState} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle, Check, ChevronDown, Loader2, Pencil, Trash2, X} from 'lucide-react';
import {Boton} from '../../components/ui/Boton';
import {Checkbox} from '../../components/ui/Checkbox';
import {MenuContextual} from '../../components/shared/MenuContextual';
import type {OpcionMenu} from '../../components/shared/MenuContextual';
/* Burbujas de mensaje y tarjetas de tool viven en mensajes.tsx; esto re-exporta
 * sus tipos/componentes para no romper los imports de los call-sites. */
export type {HerramientaVisual, ContextoVisual} from './mensajes';
export {
    TarjetaTool,
    BarraContexto,
    AprobacionPendiente,
    BotonReintentar,
    IndicadorPensando,
    MensajeUsuario,
    MensajeAsistente
} from './mensajes';

export type ModoAgente = 'predeterminado' | 'meta' | 'autonomo';

export interface SkillVisual {
    id: string;
    nombre: string;
    descripcion: string;
    activa: boolean;
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

/* ---------- Campo de configuración (label + control) ---------- */

interface CampoAgenteProps {
    etiqueta: string;
    children?: React.ReactNode;
}

/* Envuelve el patrón `<label className="modalConfigAgenteCampo">{etiqueta}{control}`
 * del modal de configuración del agente. El CSS del modal estiliza los controles
 * por selectores descendentes (.modalConfigAgenteCampo input/select/textarea), así
 * que el wrapper conserva el lenguaje visual propio del plugin sin CSS nuevo. */
export function CampoAgente({etiqueta, children}: CampoAgenteProps): JSX.Element {
    return <label className="modalConfigAgenteCampo">{etiqueta}{children}</label>;
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
                <Checkbox
                    checked={skill.activa}
                    onChange={() => onActivar(skill)}
                    aria-label={skill.activa ? 'Desactivar' : 'Activar'}
                />
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

/* ---------- Selector de modelo + modo en el input (318A-4) ---------- */

/* [318A-4] Catálogo de modelos para el selector del input. Orden:
 * "auto" (deja que el backend resuelva la ruta, hoy Glory/commandcode) y luego
 * los modelos conocidos del backend (src/services/ai.rs). El backend aún fija
 * Glory/commandcode como política de servidor, pero la UI queda lista para
 * cuando los usuarios traigan sus propias APIs y haya varios gratuitos. */
export const MODELOS_AGENTE: ReadonlyArray<{id: string; nombre: string; proveedor: string; descripcion: string}> = Object.freeze([
    {id: 'auto', nombre: 'Auto', proveedor: 'glory', descripcion: 'Deja que el servidor elija la mejor ruta.'},
    /* [02-09-2026] Laguna S 2.1 Free: modelo GRATIS (100% OFF) de Command Code
     * Provider API directa (sin gloryapi). El ID real del endpoint Provider es
     * `poolside/laguna-s-2.1-free` (prefijo poolside/, verificado en /models).
     * Requiere COMMAND_CODE_API_KEY en el backend (y $1 de crédito en la
     * cuenta). Primera opción del fallback. */
    {id: 'poolside/laguna-s-2.1-free', nombre: 'Laguna S 2.1 Free', proveedor: 'commandcode', descripcion: 'Command Code Provider · GRATIS (mientras haya capacidad).'},
    {id: 'commandcode', nombre: 'Commandcode', proveedor: 'glory', descripcion: 'Glory API · ruta auto → DeepSeek Flash.'},
    {id: 'glm-5.3-flash', nombre: 'GLM 5.3 Flash', proveedor: 'glory', descripcion: 'Glory API · modelo gratuito disponible.'},
    {id: 'deepseek-v4-flash', nombre: 'DeepSeek V4 Flash', proveedor: 'deepseek', descripcion: 'API DeepSeek directa.'},
    {id: 'groq/compound-mini', nombre: 'Compound Mini', proveedor: 'groq', descripcion: 'API Groq · rápido y compacto.'},
    {id: 'groq/compound', nombre: 'Compound', proveedor: 'groq', descripcion: 'API Groq · general.'},
    {id: 'cerebras/gemma-4-31b', nombre: 'Gemma 4 31B', proveedor: 'cerebras', descripcion: 'API Cerebras.'},
    {id: 'cerebras/gpt-oss-120b', nombre: 'GPT-OSS 120B', proveedor: 'cerebras', descripcion: 'API Cerebras · razonamiento.'},
]);

interface ControlesInputIAProps {
    modelo: string;
    modo: ModoAgente;
    onCambiarModelo: (modelo: string) => void;
    onCambiarModo: (modo: ModoAgente) => void;
    deshabilitado?: boolean;
}

/* [318A-4] Controles compactos del input: selector de modelo y selector de modo.
 * Usan el MenuContextual global (no selects nativos) para coherencia visual con
 * el resto del proyecto. Cada botón abre el menú posicionado bajo él y marca la
 * opción activa con un check (patrón EncabezadoAcciones). */
export function ControlesInputIA({modelo, modo, onCambiarModelo, onCambiarModo, deshabilitado = false}: ControlesInputIAProps): JSX.Element {
    const [menuActivo, setMenuActivo] = useState<'modelo' | 'modo' | null>(null);
    const [posicion, setPosicion] = useState({x: 0, y: 0});

    const modeloActual = MODELOS_AGENTE.find(m => m.id === modelo) ?? MODELOS_AGENTE[0];
    const modoActual = MODOS_AGENTE.find(m => m.id === modo) ?? MODOS_AGENTE[0];

    const abrirMenu = (tipo: 'modelo' | 'modo', evento: React.MouseEvent) => {
        if (deshabilitado) return;
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setPosicion({x: rect.left, y: rect.bottom + 4});
        setMenuActivo(menuActivo === tipo ? null : tipo);
    };

    const opcionesModelo: OpcionMenu[] = MODELOS_AGENTE.map(m => ({
        id: m.id,
        etiqueta: m.nombre,
        marcada: m.id === modelo,
        separadorDespues: m.id === 'auto',
    }));

    const opcionesModo: OpcionMenu[] = MODOS_AGENTE.map(m => ({
        id: m.id,
        etiqueta: m.nombre,
        marcada: m.id === modo,
    }));

    const seleccionar = (tipo: 'modelo' | 'modo', opcionId: string) => {
        if (tipo === 'modelo') onCambiarModelo(opcionId);
        else onCambiarModo(opcionId as ModoAgente);
        setMenuActivo(null);
    };

    return (
        <div className="panelIAInputControles">
            <Boton
                type="button"
                variante="ghost"
                tamano="pequeño"
                compacto
                claseAdicional="panelIAInputControl"
                disabled={deshabilitado}
                onClick={e => abrirMenu('modelo', e)}
                title={modeloActual.descripcion}
                aria-haspopup="menu"
                aria-expanded={menuActivo === 'modelo'}
            >
                {modeloActual.nombre}
                <ChevronDown size={12} />
            </Boton>
            {menuActivo === 'modelo' && createPortal(
                <MenuContextual
                    opciones={opcionesModelo}
                    posicionX={posicion.x}
                    posicionY={posicion.y}
                    onSeleccionar={id => seleccionar('modelo', id)}
                    onCerrar={() => setMenuActivo(null)}
                />,
                document.body
            )}

            <Boton
                type="button"
                variante="ghost"
                tamano="pequeño"
                compacto
                claseAdicional="panelIAInputControl"
                disabled={deshabilitado}
                onClick={e => abrirMenu('modo', e)}
                title={modoActual.descripcion}
                aria-haspopup="menu"
                aria-expanded={menuActivo === 'modo'}
            >
                {modoActual.nombre}
                <ChevronDown size={12} />
            </Boton>
            {menuActivo === 'modo' && createPortal(
                <MenuContextual
                    opciones={opcionesModo}
                    posicionX={posicion.x}
                    posicionY={posicion.y}
                    onSeleccionar={id => seleccionar('modo', id)}
                    onCerrar={() => setMenuActivo(null)}
                />,
                document.body
            )}
        </div>
    );
}

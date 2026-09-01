/*
 * plugins/agente/componentes.tsx
 * Componentes visuales compartidos del chat del agente. Son los MISMOS que
 * usa el panel real (PanelAgente, ModalConfigAgente): la galería visual
 * (/agente/visuales, solo dev) los renderiza alimentados por fixtures
 * (fixtures.ts) sin copias ni maquetas divergentes.
 */

import {AlertTriangle, Loader2, Pencil, Trash2, X} from 'lucide-react';
import {Boton} from '../../components/ui/Boton';
import {Checkbox} from '../../components/ui/Checkbox';
import {Radio} from '../../components/ui/Radio';

/* [318A-4] Catálogo de modelos/modos y controles del input viven en
 * catalogoModelos.tsx (seam natural del split de limite-lineas); aquí se
 * importan para uso interno y se re-exportan para no romper los imports de
 * los call-sites. */
import {MODOS_AGENTE, MODELOS_AGENTE, ControlesInputIA, type ModoAgente} from './catalogoModelos';
export {MODOS_AGENTE, MODELOS_AGENTE, ControlesInputIA};
export type {ModoAgente};
/* Burbujas de mensaje y tarjetas de tool viven en mensajes.tsx; esto re-exporta
 * sus tipos/componentes para no romper los imports de los call-sites. */
export type {HerramientaVisual, ContextoVisual} from './mensajes';
export {
    TarjetaTool,
    BarraContexto,
    BarraContextoInferior,
    AprobacionPendiente,
    BotonReintentar,
    IndicadorPensando,
    MensajeUsuario,
    MensajeAsistente
} from './mensajes';

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

/* ---------- Selector de modo + aviso de modo autónomo ---------- */

/* [318A-4] Selector de modo con la receta canónica del sistema (Radio con
 * descripción): etiqueta + descripción por opción, mismo ritmo y espacios que
 * el resto de opciones del dashboard. Sustituye las tarjetas locales
 * (modalConfigAgenteOpcion). */
export function SelectorModo({modo, onChange}: {modo: ModoAgente; onChange: (modo: ModoAgente) => void}): JSX.Element {
    return (
        <Radio
            name="modo-agente"
            value={modo}
            onChange={e => onChange(e.target.value as ModoAgente)}
            opciones={MODOS_AGENTE.map(m => ({valor: m.id, etiqueta: m.nombre, descripcion: m.descripcion}))}
        />
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
                        <Boton type="button" variante="icono" tamano="pequeño" soloIcono icono={<Pencil size={13} />} onClick={() => onEditar(skill)} aria-label={`Editar ${skill.nombre}`} title={`Editar ${skill.nombre}`} />
                    )}
                    {onEliminar && (
                        <Boton type="button" variante="icono" tamano="pequeño" soloIcono icono={<Trash2 size={13} />} onClick={() => onEliminar(skill.id)} aria-label={`Eliminar ${skill.nombre}`} title={`Eliminar ${skill.nombre}`} />
                    )}
                </div>
            )}
        </div>
    );
}

/* ---------- Selector de modelo + modo en el input (318A-4) ---------- */
/* Ver catalogoModelos.tsx: MODELOS_AGENTE, MODOS_AGENTE, ControlesInputIA y
 * ModoAgente viven allí y se re-exportan al inicio de este módulo. */

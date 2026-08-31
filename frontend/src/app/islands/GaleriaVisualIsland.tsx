/*
 * islands/GaleriaVisualIsland.tsx
 * Fase 4.5 del plan-agente-ia-plugin (sección 9.5): galería visual del chat
 * del agente. Ruta /agente/visuales, SOLO en dev (registrada en main.tsx bajo
 * import.meta.env.DEV). Renderiza los 19 ítems del checklist con los MISMOS
 * componentes del chat (plugins/agente/componentes.tsx) alimentados por
 * fixtures realistas (plugins/agente/fixtures.ts) — no hay copias ni maquetas
 * divergentes. Incluye toggle de los 3 temas (data-theme real del proyecto:
 * 'original' cae a :root (oscuro) y 'claro' tiene selector propio).
 */

import {useEffect, useState} from 'react';
import {AlertTriangle, Bot, Check, Monitor, Plus, ShieldAlert, Sun} from 'lucide-react';
import {
    CATALOGO,
    fixtureAvisoMeta,
    fixtureContexto,
    fixtureMensajes,
    fixturePropuestaSkill,
    fixtureSkills,
    fixtureTabs,
    fixtureTareas,
    fixtureToolEjecutando,
    fixtureTrabajando,
    fixtureVerificacionAutonoma,
} from '../plugins/agente/fixtures';
import type {FixtureEntrada} from '../plugins/agente/fixtures';
import {
    AvisoModoAutonomo,
    BarraContexto,
    BotonCancelar,
    EstadoCarga,
    EstadoVacio,
    IndicadorPensando,
    MensajeAsistente,
    MensajeUsuario,
    SelectorModo,
    SkillFila,
    TabsWorkspace,
    TarjetaTareaProgramada,
    TarjetaTool,
} from '../plugins/agente/componentes';
import type {ModoAgente} from '../plugins/agente/componentes';
import {Boton} from '../components/ui';

import '../styles/dashboard/componentes/panelIA.css';
import '../plugins/agente/panelAgente.css';
import '../plugins/agente/modalConfigAgente.css';
import './galeriaVisual.css';

type TemaGaleria = 'original' | 'claro';

/* Tool buscada en los fixtures de mensajes (misma fuente que el chat). */
function toolDe(nombre: string) {
    return fixtureMensajes
        .flatMap(m => m.herramientas ?? [])
        .find(h => h.tool === nombre);
}

/* ---------- Vistas de cada ítem (mismos componentes del chat) ---------- */

function VistaUsuario(): JSX.Element {
    return (
        <div className="galeriaChat">
            {fixtureMensajes.filter(m => m.rol === 'user').map(m => (
                <MensajeUsuario key={m.contenido} contenido={m.contenido} />
            ))}
        </div>
    );
}

function VistaAsistente(): JSX.Element {
    const primerAsistente = fixtureMensajes.find(m => m.rol === 'assistant');
    return (
        <div className="galeriaChat">
            {primerAsistente && (
                <MensajeAsistente
                    contenido={primerAsistente.contenido}
                    herramientas={primerAsistente.herramientas}
                    contexto={primerAsistente.contexto}
                />
            )}
            <IndicadorPensando />
        </div>
    );
}

function VistaToolEjecutando(): JSX.Element {
    return (
        <div className="galeriaChat">
            {fixtureToolEjecutando.map(h => <TarjetaTool key={h.tool} h={h} />)}
        </div>
    );
}

function VistaToolOk(): JSX.Element {
    const h = toolDe('crear_tarea');
    return <div className="galeriaChat">{h ? <TarjetaTool h={h} /> : null}</div>;
}

function VistaToolError(): JSX.Element {
    const h = toolDe('buscar_web');
    return <div className="galeriaChat">{h ? <TarjetaTool h={h} /> : null}</div>;
}

function VistaDiff(): JSX.Element {
    const h = toolDe('file_write');
    return <div className="galeriaChat">{h ? <TarjetaTool h={h} /> : null}</div>;
}

function VistaTrabajando(): JSX.Element {
    return (
        <div className="galeriaChat">
            {fixtureTrabajando.map(t => (
                <TarjetaTool key={t} h={{tool: t, ok: true, resumen: 'ejecutando...', argumentos: {}} as never} />
            ))}
        </div>
    );
}

function VistaContexto(): JSX.Element {
    return <BarraContexto contexto={fixtureContexto} />;
}

function VistaTareas(): JSX.Element {
    return (
        <div className="galeriaTareas">
            {fixtureTareas.map(t => <TarjetaTareaProgramada key={t.id} tarea={t} />)}
        </div>
    );
}

function VistaTabs(): JSX.Element {
    const [activaId, setActivaId] = useState<string | null>(fixtureTabs[0]?.id ?? null);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [tituloEdicion, setTituloEdicion] = useState('');
    const [tabs, setTabs] = useState(fixtureTabs);
    return (
        <TabsWorkspace
            tabs={tabs}
            activaId={activaId}
            editandoId={editandoId}
            tituloEdicion={tituloEdicion}
            onActivar={setActivaId}
            onIniciarRenombrado={(id, titulo) => {setEditandoId(id); setTituloEdicion(titulo);}}
            onCambiarTituloEdicion={setTituloEdicion}
            onConfirmarRenombrado={id => {
                setTabs(prev => prev.map(t => t.id === id ? {...t, titulo: tituloEdicion.trim() || t.titulo} : t));
                setEditandoId(null);
            }}
            onCancelarRenombrado={() => setEditandoId(null)}
            onCerrar={id => setTabs(prev => prev.filter(t => t.id !== id))}
        />
    );
}

function VistaModo(): JSX.Element {
    const [modo, setModo] = useState<ModoAgente>('predeterminado');
    return (
        <div className="galeriaModal">
            <SelectorModo modo={modo} onChange={setModo} />
            {modo === 'autonomo' && <AvisoModoAutonomo />}
        </div>
    );
}

function VistaSkills(): JSX.Element {
    return (
        <div className="galeriaModal">
            {fixtureSkills.map(s => (
                <SkillFila key={s.id} skill={s} onActivar={skill => { /* demo estática: la activación se muestra con el toggle real en el modal */ }} />
            ))}
        </div>
    );
}

function VistaErrorRetryable(): JSX.Element {
    const errorTool = toolDe('buscar_web');
    return (
        <div className="galeriaChat">
            <MensajeUsuario contenido="Busca en internet la documentación de Glory API" />
            <MensajeAsistente
                contenido="La búsqueda web no está disponible ahora mismo."
                herramientas={errorTool ? [errorTool] : undefined}
                reintentar={true}
            />
        </div>
    );
}

function VistaVacio(): JSX.Element {
    return (
        <EstadoVacio icono={<Bot size={32} />} texto="Nueva conversación: pide al agente crear tareas, hábitos, notas o recordatorios.">
            <Boton variante="primario" tamano="pequeño"><Plus size={12} /> Nueva conversación</Boton>
        </EstadoVacio>
    );
}

function VistaCarga(): JSX.Element {
    return <EstadoCarga texto="Cargando conversaciones..." />;
}

function VistaCancelar(): JSX.Element {
    return (
        <div className="galeriaCancelar">
            <BotonCancelar />
            <span className="galeriaCancelarNota">Enviando → el botón pasa a cancelar (aborta el SSE con AbortController).</span>
        </div>
    );
}

function VistaPropuestaSkill(): JSX.Element {
    return (
        <div className="galeriaPropuesta">
            <div className="panelIAAccionBadge panelIAAccionBadge--pendiente">
                <AlertTriangle size={10} />
                <span>Skill sugerida tras el turno: {fixturePropuestaSkill.nombre}</span>
            </div>
            <p>{fixturePropuestaSkill.descripcion}</p>
            <div className="galeriaPropuestaAcciones">
                <Boton variante="primario" tamano="pequeño"><Check size={12} /> Aprobar</Boton>
                <Boton variante="ghost" tamano="pequeño">Descartar</Boton>
            </div>
        </div>
    );
}

function VistaAvisoMeta(): JSX.Element {
    return (
        <div className="galeriaPropuesta">
            <p className="panelIAAccionBadge panelIAAccionBadge--pendiente">
                <ShieldAlert size={10} />
                <span>Meta: {fixtureAvisoMeta.meta} · cumplida: {fixtureAvisoMeta.cumplida ? 'sí' : 'no'} · continúo</span>
            </p>
        </div>
    );
}

function VistaVerificacion(): JSX.Element {
    return (
        <div className="galeriaPropuesta">
            <p className="galeriaVerificacionSeguro"><Check size={11} /> Seguro: {fixtureVerificacionAutonoma.razonamiento}</p>
            <p className="galeriaVerificacionInseguro"><AlertTriangle size={11} /> Inseguro: {fixtureVerificacionAutonoma.inseguro}</p>
        </div>
    );
}

const VISTAS: Record<string, () => JSX.Element> = {
    '01-usuario': VistaUsuario,
    '02-asistente': VistaAsistente,
    '03-tool-ejecutando': VistaToolEjecutando,
    '04-tool-ok': VistaToolOk,
    '05-tool-error': VistaToolError,
    '06-diff': VistaDiff,
    '07-trabajando': VistaTrabajando,
    '08-contexto': VistaContexto,
    '09-tarea-programada': VistaTareas,
    '10-tabs-workspace': VistaTabs,
    '11-selector-modo': VistaModo,
    '12-skills': VistaSkills,
    '13-error-retryable': VistaErrorRetryable,
    '14-estado-vacio': VistaVacio,
    '15-estado-carga': VistaCarga,
    '16-boton-cancelar': VistaCancelar,
    '17-propuesta-skill': VistaPropuestaSkill,
    '18-aviso-meta': VistaAvisoMeta,
    '19-verificacion-autonoma': VistaVerificacion,
};

function Entrada({entrada, children}: {entrada: FixtureEntrada; children: React.ReactNode}): JSX.Element {
    return (
        <section className="galeriaEntrada" id={entrada.id}>
            <header className="galeriaEntradaCabecera">
                <span className="galeriaEntradaId">{entrada.id}</span>
                <h2 className="galeriaEntradaTitulo">{entrada.titulo}</h2>
                <span className="galeriaEntradaEstados">{entrada.estados.join(' · ')}</span>
            </header>
            <p className="galeriaEntradaDesc">{entrada.descripcion}</p>
            <div className="galeriaEntradaVista">{children}</div>
            {entrada.pendiente && (
                <p className="galeriaEntradaPendiente" role="note">⏸ {entrada.pendiente}</p>
            )}
        </section>
    );
}

export function GaleriaVisualIsland(): JSX.Element {
    const [tema, setTema] = useState<TemaGaleria>('original');

    /* Aplica el tema real del proyecto (data-theme) y lo restaura al salir. */
    useEffect(() => {
        const anterior = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', tema);
        return () => {
            if (anterior) {
                document.documentElement.setAttribute('data-theme', anterior);
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        };
    }, [tema]);

    return (
        <div className="galeriaVisual">
            <header className="galeriaVisualCabecera">
                <div>
                    <h1 className="galeriaVisualTitulo">Galería visual del agente</h1>
                    <p className="galeriaVisualSub">
                        Los 19 ítems de la sección 9.5 del plan con los mismos componentes del chat
                        (plugins/agente/componentes.tsx) y fixtures compartidos (fixtures.ts). Dev only.
                    </p>
                </div>
                <button
                    type="button"
                    className="galeriaVisualTema"
                    onClick={() => setTema(t => (t === 'original' ? 'claro' : 'original'))}
                    title="Alternar tema: Terminal → Claro"
                >
                    {tema === 'original' ? <Monitor size={14} /> : <Sun size={14} />}
                    {tema === 'original' ? 'Terminal' : 'Claro'}
                </button>
            </header>

            <main className="galeriaVisualGrid">
                {CATALOGO.map(entrada => {
                    const Vista = VISTAS[entrada.id];
                    return (
                        <Entrada key={entrada.id} entrada={entrada}>
                            {Vista ? <Vista /> : null}
                        </Entrada>
                    );
                })}
            </main>
        </div>
    );
}

export default GaleriaVisualIsland;

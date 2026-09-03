/*
 * islands/GaleriaVisualVistas.tsx
 * [029A-1] Vistas de la galería extraídas de GaleriaVisualIsland (limite-lineas:
 * la island quedaba en 309/300). Cada vista renderiza los MISMOS componentes del
 * chat con fixtures compartidos. Solo dev (/agente/visuales).
 */

import {useState} from 'react';
import {AlertTriangle, Bot, Check, Plus, ShieldAlert} from 'lucide-react';
import {
    fixtureAvisoMeta,
    fixtureContexto,
    fixtureContextoDetallado,
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
    BarraContextoInferior,
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

/* Tool buscada en los fixtures de mensajes (misma fuente que el chat). */
function toolDe(nombre: string) {
    return fixtureMensajes
        .flatMap(m => m.herramientas ?? [])
        .find(h => h.tool === nombre);
}

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

/* [318A-7] Barra inferior con el desglose por secciones y botón Compactar. */
function VistaContextoDetallado(): JSX.Element {
    return (
        <div className="galeriaChat">
            <BarraContextoInferior
                contexto={fixtureContextoDetallado}
                maxVentana={fixtureContextoDetallado.maxVentana ?? 128000}
                onCompactar={() => undefined}
            />
        </div>
    );
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
                <SkillFila key={s.id} skill={s} onActivar={_skill => { /* demo estática */ }} />
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

export const VISTAS: Record<string, () => JSX.Element> = {
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
    '20-contexto-detallado': VistaContextoDetallado,
};

export function Entrada({entrada, children}: {entrada: FixtureEntrada; children: React.ReactNode}): JSX.Element {
    return (
        <section className="galeriaEntrada" id={entrada.id}>
            <header className="galeriaEntradaCabecera">
                <span className="galeriaEntradaId">{entrada.id}</span>
                <span className="galeriaEntradaTitulo">{entrada.titulo}</span>
                <span className="galeriaEntradaEstados">{entrada.estados.join(' · ')}</span>
            </header>
            <p className="galeriaEntradaDesc">{entrada.descripcion}</p>
            <div className="galeriaEntradaVista">{children}</div>
            {entrada.pendiente && (
                <p className="galeriaEntradaPendiente" role="note">En pausa {entrada.pendiente}</p>
            )}
        </section>
    );
}

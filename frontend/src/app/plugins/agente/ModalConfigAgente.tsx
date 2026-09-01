/* Configuración del agente: todos los valores se persisten y se envían al runtime.
 * [318A-5] Reorganizado con SIDEBAR de navegación (mismo patrón que
 * ModalConfiguracionGlobal: configGlobalSidebar + configGlobalContenido) y el
 * MISMO ancho/alto que el modal global (720px × 750px). Las secciones se
 * agrupan en 3 categorías: General, Comportamiento y Avanzado.
 * [318A-4] Coherencia con el sistema declarativo: títulos de sección SIN iconos
 * (patrón A), campos migrados a FormCampo (ritmo/gap del sistema) y botones
 * nativos -> Boton. Se retiran los 2 sentinel-disable-file del CSS. */
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {Route, Check, Plus, X, MessageSquare, SlidersHorizontal} from 'lucide-react';
import {useAgenteStore} from './store';
import type {ConfigAgente, SkillAgente} from './service';
import {Boton} from '../../components/ui/Boton';
import {Input} from '../../components/ui/Input';
import {Select} from '../../components/ui/Select';
import {Textarea} from '../../components/ui/Textarea';
import {Range} from '../../components/shared/Range';
import {Checkbox} from '../../components/ui/Checkbox';
import {FormCampo} from '../../components/shared/FormCampo';
import {AvisoModoAutonomo, MODELOS_AGENTE, SelectorModo, SkillFila} from './componentes';
import {useGestionSkills} from './useGestionSkills';
import './modalConfigAgente.css';

interface ModalConfigAgenteProps { activo: boolean; onCerrar: () => void; }
const clamped = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type SeccionAgente = 'general' | 'comportamiento' | 'avanzado';

/* [318A-5] Secciones del sidebar (mismo patrón que ModalConfiguracionGlobal).
 * Los iconos SOLO viven aquí (navegación), no en los títulos de sección. */
const SECCIONES_SIDEBAR: ReadonlyArray<{id: SeccionAgente; nombre: string; icono: JSX.Element}> = Object.freeze([
    {id: 'general', nombre: 'Modo y modelo', icono: <Route size={14} />},
    {id: 'comportamiento', nombre: 'Estilo y preferencias', icono: <MessageSquare size={14} />},
    {id: 'avanzado', nombre: 'Workspace y contexto', icono: <SlidersHorizontal size={14} />},
]);

export function ModalConfigAgente({activo, onCerrar}: ModalConfigAgenteProps): JSX.Element | null {
    const config = useAgenteStore(s => s.config);
    const establecerConfig = useAgenteStore(s => s.establecerConfig);
    const [draft, setDraft] = useState(config);
    const [seccion, setSeccion] = useState<SeccionAgente>('general');
    const gestion = useGestionSkills(activo);
    const {skills, skillsError, nuevaSkill, setNuevaSkill, editandoId, setEditandoId, editando, setEditando, crear, alternar, guardarEdicion, eliminar} = gestion;
    useEffect(() => {
        if (activo) setDraft(config);
    }, [activo, config]);
    if (!activo) return null;
    const actualizar = <K extends keyof ConfigAgente>(campo: K, valor: ConfigAgente[K]) => setDraft(actual => ({...actual, [campo]: valor}));
    const guardar = () => {
        establecerConfig(draft);
        onCerrar();
    };
    /* [318A-4] Patrón A (SeccionConfigIAPanelChat): el valor del rango viaja en
     * el título y el control en su propia fila (FormCampo vertical). */
    const rangoConValor = (titulo: string, salida: React.ReactNode, control: React.ReactElement) => (
        <FormCampo
            titulo={<>{titulo} <output>{salida}</output></>}
            orientacion="vertical"
            control={control}
        />
    );

    return createPortal(
        /* [318A-2 fb] Portal a document.body: dentro del panel (modo vistas) el
         * overlay position:fixed queda confinado/recortado por el transform del
         * panel arrastrable y los overflow:hidden de los contenedores de vistas;
         * con portal el modal se abre global como el resto de modales. */
        <div className="modalConfigAgenteOverlay" onMouseDown={e => {if (e.target === e.currentTarget) onCerrar();}}>
            <div className="modalConfigAgente" role="dialog" aria-modal="true" aria-label="Configuración del agente">
                <div className="modalConfigAgenteCabecera">
                    <span className="modalConfigAgenteTitulo">Configuración del agente</span>
                    <Boton type="button" variante="icono" tamano="pequeño" soloIcono icono={<X size={13} />} onClick={onCerrar} aria-label="Cerrar" title="Cerrar" />
                </div>
                <div className="modalConfigAgenteCuerpo">
                    {/* [318A-5] Sidebar de navegación: REUTILIZA las mismas clases que
                     * el modal de configuración global (configGlobalSidebar,
                     * configGlobalNavGrupo, configGlobalNavItem + Boton ghost) para
                     * que ambas navegaciones sean visualmente idénticas. */}
                    <nav className="configGlobalSidebar">
                        {SECCIONES_SIDEBAR.map(s => (
                            <Boton
                                key={s.id}
                                type="button"
                                variante="ghost"
                                claseAdicional={`configGlobalNavItem ${seccion === s.id ? 'activo' : ''}`}
                                onClick={() => setSeccion(s.id)}
                            >
                                {s.icono}
                                <span>{s.nombre}</span>
                            </Boton>
                        ))}
                    </nav>

                    {/* Contenido de la sección activa */}
                    <div className="modalConfigAgenteContenido">
                        {seccion === 'general' && (
                            <>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Modo por defecto</h3>
                                    <SelectorModo modo={draft.modo} onChange={m => actualizar('modo', m)} />
                                    {draft.modo === 'autonomo' && <AvisoModoAutonomo />}
                                </section>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Proveedor y modelo</h3>
                                    {/* [02-09-2026] El backend ya lee provider/modelo de la
                                     * config guardada (config_desde_guardada), así que el
                                     * selector es editable y coherente con el del input.
                                     * Incluye el modelo gratuito laguna-s-2.1-free. */}
                                    <FormCampo
                                        titulo="Proveedor"
                                        orientacion="vertical"
                                        control={
                                            <Select claseAdicional="modalConfigAgenteInput"
                                                opciones={[{valor: 'glory', etiqueta: 'Glory API · ruta auto'}, {valor: 'commandcode', etiqueta: 'Command Code Provider (directo)'}]}
                                                value={draft.provider}
                                                onChange={e => actualizar('provider', e.target.value as ConfigAgente['provider'])} />
                                        }
                                    />
                                    <FormCampo
                                        titulo="Modelo"
                                        orientacion="vertical"
                                        control={
                                            <Select claseAdicional="modalConfigAgenteInput"
                                                opciones={MODELOS_AGENTE.map(m => ({valor: m.id, etiqueta: m.nombre}))}
                                                value={draft.modelo}
                                                onChange={e => {
                                                    const modelo = e.target.value as ConfigAgente['modelo'];
                                                    /* [02-09-2026] Fijar también el proveedor del
                                                     * catálogo para que el backend enrute directo
                                                     * (p.ej. laguna-s-2.1-free → commandcode). */
                                                    const entrada = MODELOS_AGENTE.find(m => m.id === modelo);
                                                    actualizar('modelo', modelo);
                                                    if (entrada) actualizar('provider', entrada.proveedor as ConfigAgente['provider']);
                                                }} />
                                        }
                                    />
                                </section>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Respuesta y límites</h3>
                                    {rangoConValor('Temperatura', draft.temperatura.toFixed(1), <Range min={0} max={2} step={0.1} value={draft.temperatura} onChange={v => actualizar('temperatura', clamped(v, 0, 2))} aria-label="Temperatura" />)}
                                    {rangoConValor('Máximo de tokens', draft.maxTokens, <Range min={64} max={4096} step={64} value={draft.maxTokens} onChange={v => actualizar('maxTokens', clamped(v, 64, 4096))} aria-label="Máximo de tokens" />)}
                                    {rangoConValor('Turnos máximos', draft.maxTurns, <Range min={1} max={10} step={1} value={draft.maxTurns} onChange={v => actualizar('maxTurns', clamped(v, 1, 10))} aria-label="Turnos máximos" />)}
                                    {rangoConValor('Timeout por herramienta (segundos)', draft.timeoutToolSecs, <Range min={1} max={15} step={1} value={draft.timeoutToolSecs} onChange={v => actualizar('timeoutToolSecs', clamped(v, 1, 15))} aria-label="Timeout por herramienta" />)}
                                </section>
                            </>
                        )}

                        {seccion === 'comportamiento' && (
                            <>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Comportamiento</h3>
                                    <p className="modalConfigAgenteSeccionDesc">Migrado de la configuración del chat IA: cómo redacta el agente y qué prefiere el usuario.</p>
                                    <FormCampo
                                        titulo="Estilo de respuesta"
                                        orientacion="vertical"
                                        control={
                                            <Select claseAdicional="modalConfigAgenteInput" opciones={[
                                                {valor: 'conciso', etiqueta: 'Conciso — respuestas cortas y directas'},
                                                {valor: 'detallado', etiqueta: 'Detallado — explica el razonamiento'},
                                                {valor: 'amable', etiqueta: 'Amable — tono cercano y motivador'},
                                            ]} value={draft.estilo} onChange={e => actualizar('estilo', e.target.value as ConfigAgente['estilo'])} />
                                        }
                                    />
                                    <FormCampo
                                        titulo="Preferencias personales"
                                        orientacion="vertical"
                                        control={
                                            <Textarea claseAdicional="modalConfigAgenteInput modalConfigAgenteTextarea" maxLength={2000} value={draft.preferencias} onChange={e => actualizar('preferencias', e.target.value)} placeholder="Ej: Prefiero tareas cortas. Trabajo mejor de 9 a 14. Evitar notificaciones tarde..." />
                                        }
                                    />
                                </section>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Idioma y contexto</h3>
                                    <FormCampo
                                        titulo="Idioma"
                                        orientacion="vertical"
                                        control={
                                            <Select claseAdicional="modalConfigAgenteInput" opciones={[
                                                {valor: 'es', etiqueta: 'Español'},
                                                {valor: 'en', etiqueta: 'English'},
                                                {valor: 'pt', etiqueta: 'Português'},
                                                {valor: 'fr', etiqueta: 'Français'},
                                            ]} value={draft.idioma} onChange={e => actualizar('idioma', e.target.value as ConfigAgente['idioma'])} />
                                        }
                                    />
                                    {/* [318A-4] Opciones con ritmo del sistema: FormCampo
                                     * horizontal (título a la izquierda, control a la
                                     * derecha), el mismo de los toggles de Hábitos. */}
                                    {([
                                        ['incluirNotas', 'Incluir notas'],
                                        ['incluirTareasCompletadas', 'Incluir tareas completadas'],
                                        ['incluirHabitosPausados', 'Incluir hábitos pausados'],
                                        ['permitirBusquedaWeb', 'Permitir búsqueda web'],
                                        ['permitirRecordatorios', 'Permitir recordatorios'],
                                        ['incluirMemoria', 'Incluir memoria persistente'],
                                        ['incluirSkills', 'Incluir skills activas'],
                                    ] as const).map(([campo, etiqueta]) => (
                                        <FormCampo
                                            key={campo}
                                            titulo={etiqueta}
                                            control={
                                                <Checkbox
                                                    checked={draft[campo]}
                                                    onChange={e => actualizar(campo, e.target.checked)}
                                                />
                                            }
                                        />
                                    ))}
                                </section>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Prompt de sistema</h3>
                                    <FormCampo
                                        orientacion="vertical"
                                        control={
                                            <Textarea claseAdicional="modalConfigAgenteInput modalConfigAgenteTextarea" maxLength={4000} value={draft.promptSistema} onChange={e => actualizar('promptSistema', e.target.value)} placeholder="Instrucciones adicionales para el agente..." />
                                        }
                                    />
                                </section>
                            </>
                        )}

                        {seccion === 'avanzado' && (
                            <>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Workspace</h3>
                                    <p className="modalConfigAgenteSeccionDesc">Carpeta de trabajo de las herramientas de archivo. Solo aplica en modo local/dev (AGENTE_MODO=local); en producción el agente corre sin tools de archivo y este valor se ignora.</p>
                                    <FormCampo
                                        titulo="Ruta de la carpeta (solo local)"
                                        orientacion="vertical"
                                        control={
                                            <Input claseAdicional="modalConfigAgenteInput" value={draft.workspace} onChange={e => actualizar('workspace', e.target.value)} placeholder="C:\ruta\al\workspace (vacío = AGENTE_WORKSPACE_ROOT o el directorio del servidor)" />
                                        }
                                    />
                                </section>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Contexto y compactación</h3>
                                    <p className="modalConfigAgenteSeccionDesc">La ventana de contexto del modelo y cuándo el agente compacta el historial. La compactación nunca borra mensajes: marca el historial como compactado en BD.</p>
                                    <FormCampo
                                        titulo="Ventana máxima de contexto"
                                        orientacion="vertical"
                                        control={
                                            <Select claseAdicional="modalConfigAgenteInput" opciones={[32768, 65536, 128000, 256000, 512000].map(v => ({valor: v, etiqueta: `${v.toLocaleString('es')} tokens`}))} value={draft.maxVentana} onChange={e => actualizar('maxVentana', Number(e.target.value))} />
                                        }
                                    />
                                    {rangoConValor('Umbral de compactación', `${(draft.umbralCompactacion * 100).toFixed(0)}%`, <Range min={0.3} max={0.85} step={0.05} value={draft.umbralCompactacion} onChange={v => actualizar('umbralCompactacion', clamped(v, 0.1, 0.9))} aria-label="Umbral de compactación" />)}
                                </section>
                                <section className="modalConfigAgenteSeccion">
                                    <h3 className="modalConfigAgenteSeccionTitulo">Skills</h3>
                                    <p className="modalConfigAgenteSeccionDesc">Skills del usuario que el agente inyecta como contexto cuando «Incluir skills activas» está marcado.</p>
                                    {skillsError && <p className="modalConfigAgenteError" role="alert">{skillsError}</p>}
                                    <div className="modalConfigAgenteSkills">
                                        {skills.length === 0 && !skillsError && <p className="modalConfigAgenteSeccionDesc">Sin skills todavía.</p>}
                                        {skills.map(s => editandoId === s.id ? (
                                            <div key={s.id} className="modalConfigAgenteSkill modalConfigAgenteSkill--editando">
                                                <Input claseAdicional="modalConfigAgenteInput" value={editando.nombre} onChange={e => setEditando({...editando, nombre: e.target.value})} placeholder="Nombre" onKeyDown={e => {if (e.key === 'Enter') void guardarEdicion(s); if (e.key === 'Escape') setEditandoId(null);}} />
                                                <Input claseAdicional="modalConfigAgenteInput" value={editando.descripcion} onChange={e => setEditando({...editando, descripcion: e.target.value})} placeholder="Descripción" />
                                                <div className="modalConfigAgenteSkillAcciones">
                                                    <Boton type="button" variante="icono" tamano="pequeño" soloIcono icono={<Check size={13} />} onClick={() => void guardarEdicion(s)} aria-label="Guardar skill" title="Guardar skill" />
                                                    <Boton type="button" variante="icono" tamano="pequeño" soloIcono icono={<X size={13} />} onClick={() => setEditandoId(null)} aria-label="Cancelar edición" title="Cancelar edición" />
                                                </div>
                                            </div>
                                        ) : (
                                            <SkillFila
                                                key={s.id}
                                                skill={s}
                                                onActivar={skill => void alternar(skill)}
                                                onEditar={skill => {setEditandoId(skill.id); setEditando({nombre: skill.nombre, descripcion: skill.descripcion});}}
                                                onEliminar={id => void eliminar(id)}
                                            />
                                        ))}
                                    </div>
                                    <div className="modalConfigAgenteSkillNueva">
                                        <Input claseAdicional="modalConfigAgenteInput" value={nuevaSkill.nombre} onChange={e => setNuevaSkill({...nuevaSkill, nombre: e.target.value})} placeholder="Nombre de la skill" onKeyDown={e => {if (e.key === 'Enter') void crear();}} />
                                        <Input claseAdicional="modalConfigAgenteInput" value={nuevaSkill.descripcion} onChange={e => setNuevaSkill({...nuevaSkill, descripcion: e.target.value})} placeholder="Descripción" />
                                        <Boton type="button" variante="secundario" disabled={!nuevaSkill.nombre.trim() || !nuevaSkill.descripcion.trim()} onClick={() => void crear()}><Plus size={13}/> Añadir</Boton>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </div>
                <div className="modalConfigAgentePie"><Boton type="button" variante="primario" onClick={guardar}>Guardar</Boton></div>
            </div>
        </div>,
        document.body
    );
}
/* Configuración del agente: todos los valores se persisten y se envían al runtime. */
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {Bot, Cpu, Route, Gauge, Languages, FileText, Brain, Sparkles, Folder, Layers, Check, Plus, X} from 'lucide-react';
import {useAgenteStore} from './store';
import type {ConfigAgente, SkillAgente} from './service';
import {Boton} from '../../components/ui/Boton';
import {Input} from '../../components/ui/Input';
import {Select} from '../../components/ui/Select';
import {Textarea} from '../../components/ui/Textarea';
import {Range} from '../../components/shared/Range';
import {Checkbox} from '../../components/ui/Checkbox';
import {AvisoModoAutonomo, CampoAgente, MODELOS_AGENTE, SelectorModo, SkillFila} from './componentes';
import {useGestionSkills} from './useGestionSkills';
import './modalConfigAgente.css';

interface ModalConfigAgenteProps { activo: boolean; onCerrar: () => void; }
const clamped = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function ModalConfigAgente({activo, onCerrar}: ModalConfigAgenteProps): JSX.Element | null {
    const config = useAgenteStore(s => s.config);
    const establecerConfig = useAgenteStore(s => s.establecerConfig);
    const [draft, setDraft] = useState(config);
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

    return createPortal(
        /* [318A-2 fb] Portal a document.body: dentro del panel (modo vistas) el
         * overlay position:fixed queda confinado/recortado por el transform del
         * panel arrastrable y los overflow:hidden de los contenedores de vistas;
         * con portal el modal se abre global como el resto de modales. */
        <div className="modalConfigAgenteOverlay" onMouseDown={e => {if (e.target === e.currentTarget) onCerrar();}}>
            <div className="modalConfigAgente" role="dialog" aria-modal="true" aria-label="Configuración del agente">
                <div className="modalConfigAgenteCabecera">
                    <span className="modalConfigAgenteTitulo"><Bot size={14}/> Configuración del agente</span>
                    <button type="button" className="modalConfigAgenteCerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
                </div>
                <div className="modalConfigAgenteCuerpo">
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Route size={12}/> Modo por defecto</h3>
                        <SelectorModo modo={draft.modo} onChange={m => actualizar('modo', m)} />
                        {draft.modo === 'autonomo' && <AvisoModoAutonomo />}
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Cpu size={12}/> Proveedor y modelo</h3>
                        {/* [02-09-2026] El backend ya lee provider/modelo de la
                         * config guardada (config_desde_guardada), así que el
                         * selector es editable y coherente con el del input.
                         * Incluye el modelo gratuito laguna-s-2.1-free. */}
                        <CampoAgente etiqueta="Proveedor">
                            <Select claseAdicional="modalConfigAgenteInput"
                                opciones={[{valor: 'glory', etiqueta: 'Glory API · ruta auto'}, {valor: 'commandcode', etiqueta: 'Command Code Provider (directo)'}]}
                                value={draft.provider}
                                onChange={e => actualizar('provider', e.target.value as ConfigAgente['provider'])} />
                        </CampoAgente>
                        <CampoAgente etiqueta="Modelo">
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
                        </CampoAgente>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Gauge size={12}/> Respuesta y límites</h3>
                        <CampoAgente etiqueta="Temperatura"><output>{draft.temperatura.toFixed(1)}</output><Range min={0} max={2} step={0.1} value={draft.temperatura} onChange={v => actualizar('temperatura', clamped(v, 0, 2))} aria-label="Temperatura" /></CampoAgente>
                        <CampoAgente etiqueta="Máximo de tokens"><output>{draft.maxTokens}</output><Range min={64} max={4096} step={64} value={draft.maxTokens} onChange={v => actualizar('maxTokens', clamped(v, 64, 4096))} aria-label="Máximo de tokens" /></CampoAgente>
                        <CampoAgente etiqueta="Turnos máximos"><output>{draft.maxTurns}</output><Range min={1} max={10} step={1} value={draft.maxTurns} onChange={v => actualizar('maxTurns', clamped(v, 1, 10))} aria-label="Turnos máximos" /></CampoAgente>
                        <CampoAgente etiqueta="Timeout por herramienta (segundos)"><output>{draft.timeoutToolSecs}</output><Range min={1} max={15} step={1} value={draft.timeoutToolSecs} onChange={v => actualizar('timeoutToolSecs', clamped(v, 1, 15))} aria-label="Timeout por herramienta" /></CampoAgente>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Sparkles size={12}/> Comportamiento</h3>
                        <p className="modalConfigAgenteSeccionDesc">Migrado de la configuración del chat IA: cómo redacta el agente y qué prefiere el usuario.</p>
                        <CampoAgente etiqueta="Estilo de respuesta">
                            <Select claseAdicional="modalConfigAgenteInput" opciones={[
                                {valor: 'conciso', etiqueta: 'Conciso — respuestas cortas y directas'},
                                {valor: 'detallado', etiqueta: 'Detallado — explica el razonamiento'},
                                {valor: 'amable', etiqueta: 'Amable — tono cercano y motivador'},
                            ]} value={draft.estilo} onChange={e => actualizar('estilo', e.target.value as ConfigAgente['estilo'])} />
                        </CampoAgente>
                        <CampoAgente etiqueta="Preferencias personales">
                            <Textarea claseAdicional="modalConfigAgenteInput modalConfigAgenteTextarea" maxLength={2000} value={draft.preferencias} onChange={e => actualizar('preferencias', e.target.value)} placeholder="Ej: Prefiero tareas cortas. Trabajo mejor de 9 a 14. Evitar notificaciones tarde..." />
                        </CampoAgente>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Languages size={12}/> Idioma y contexto</h3>
                        <CampoAgente etiqueta="Idioma">
                            <Select claseAdicional="modalConfigAgenteInput" opciones={[
                                {valor: 'es', etiqueta: 'Español'},
                                {valor: 'en', etiqueta: 'English'},
                                {valor: 'pt', etiqueta: 'Português'},
                                {valor: 'fr', etiqueta: 'Français'},
                            ]} value={draft.idioma} onChange={e => actualizar('idioma', e.target.value as ConfigAgente['idioma'])} />
                        </CampoAgente>
                        {([
                            ['incluirNotas', 'Incluir notas'],
                            ['incluirTareasCompletadas', 'Incluir tareas completadas'],
                            ['incluirHabitosPausados', 'Incluir hábitos pausados'],
                            ['permitirBusquedaWeb', 'Permitir búsqueda web'],
                            ['permitirRecordatorios', 'Permitir recordatorios'],
                            ['incluirMemoria', 'Incluir memoria persistente'],
                            ['incluirSkills', 'Incluir skills activas'],
                        ] as const).map(([campo, etiqueta]) => (
                            <Checkbox
                                key={campo}
                                etiqueta={etiqueta}
                                checked={draft[campo]}
                                onChange={e => actualizar(campo, e.target.checked)}
                            />
                        ))}
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><FileText size={12}/> Prompt de sistema</h3>
                        <Textarea claseAdicional="modalConfigAgenteInput modalConfigAgenteTextarea" maxLength={4000} value={draft.promptSistema} onChange={e => actualizar('promptSistema', e.target.value)} placeholder="Instrucciones adicionales para el agente..." />
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Folder size={12}/> Workspace</h3>
                        <p className="modalConfigAgenteSeccionDesc">Carpeta de trabajo de las herramientas de archivo. Solo aplica en modo local/dev (AGENTE_MODO=local); en producción el agente corre sin tools de archivo y este valor se ignora.</p>
                        <CampoAgente etiqueta="Ruta de la carpeta (solo local)">
                            <Input claseAdicional="modalConfigAgenteInput" value={draft.workspace} onChange={e => actualizar('workspace', e.target.value)} placeholder="C:\ruta\al\workspace (vacío = AGENTE_WORKSPACE_ROOT o el directorio del servidor)" />
                        </CampoAgente>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Layers size={12}/> Contexto y compactación</h3>
                        <p className="modalConfigAgenteSeccionDesc">La ventana de contexto del modelo y cuándo el agente compacta el historial. La compactación nunca borra mensajes: marca el historial como compactado en BD.</p>
                        <CampoAgente etiqueta="Ventana máxima de contexto">
                            <Select claseAdicional="modalConfigAgenteInput" opciones={[32768, 65536, 128000, 256000, 512000].map(v => ({valor: v, etiqueta: `${v.toLocaleString('es')} tokens`}))} value={draft.maxVentana} onChange={e => actualizar('maxVentana', Number(e.target.value))} />
                        </CampoAgente>
                        <CampoAgente etiqueta="Umbral de compactación"><output>{(draft.umbralCompactacion * 100).toFixed(0)}%</output><Range min={0.3} max={0.85} step={0.05} value={draft.umbralCompactacion} onChange={v => actualizar('umbralCompactacion', clamped(v, 0.1, 0.9))} aria-label="Umbral de compactación" /></CampoAgente>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Brain size={12}/> Skills</h3>
                        <p className="modalConfigAgenteSeccionDesc">Skills del usuario que el agente inyecta como contexto cuando «Incluir skills activas» está marcado.</p>
                        {skillsError && <p className="modalConfigAgenteError" role="alert">{skillsError}</p>}
                        <div className="modalConfigAgenteSkills">
                            {skills.length === 0 && !skillsError && <p className="modalConfigAgenteSeccionDesc">Sin skills todavía.</p>}
                            {skills.map(s => editandoId === s.id ? (
                                <div key={s.id} className="modalConfigAgenteSkill modalConfigAgenteSkill--editando">
                                    <Input claseAdicional="modalConfigAgenteInput" value={editando.nombre} onChange={e => setEditando({...editando, nombre: e.target.value})} placeholder="Nombre" onKeyDown={e => {if (e.key === 'Enter') void guardarEdicion(s); if (e.key === 'Escape') setEditandoId(null);}} />
                                    <Input claseAdicional="modalConfigAgenteInput" value={editando.descripcion} onChange={e => setEditando({...editando, descripcion: e.target.value})} placeholder="Descripción" />
                                    <div className="modalConfigAgenteSkillAcciones">
                                        <button type="button" className="modalConfigAgenteSkillBoton" onClick={() => void guardarEdicion(s)} aria-label="Guardar skill"><Check size={13}/></button>
                                        <button type="button" className="modalConfigAgenteSkillBoton" onClick={() => setEditandoId(null)} aria-label="Cancelar edición"><X size={13}/></button>
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
                </div>
                <div className="modalConfigAgentePie"><Boton type="button" variante="primario" onClick={guardar}>Guardar</Boton></div>
            </div>
        </div>,
        document.body
    );
}
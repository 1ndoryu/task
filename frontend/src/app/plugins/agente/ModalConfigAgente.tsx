/* Configuración del agente: todos los valores se persisten y se envían al runtime. */
import {useEffect, useState} from 'react';
import {Bot, Cpu, Route, Gauge, Languages, FileText, Brain, Check, Plus, Trash2, Pencil, X} from 'lucide-react';
import {useAgenteStore} from './store';
import {listarSkills, crearSkill, actualizarSkill, eliminarSkill} from './service';
import type {ConfigAgente, SkillAgente} from './service';
import {Boton} from '../../components/ui/Boton';
import './modalConfigAgente.css';

interface ModalConfigAgenteProps { activo: boolean; onCerrar: () => void; }
const MODOS: Array<{id: ConfigAgente['modo']; nombre: string; descripcion: string}> = [
    {id: 'predeterminado', nombre: 'Predeterminado', descripcion: 'Pide aprobación para herramientas con efecto.'},
    {id: 'meta', nombre: 'Meta', descripcion: 'Permite ajustar reglas además de pedir aprobación.'},
    {id: 'autonomo', nombre: 'Autónomo', descripcion: 'Ejecuta herramientas con efecto sin preguntar.'},
];
const clamped = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function ModalConfigAgente({activo, onCerrar}: ModalConfigAgenteProps): JSX.Element | null {
    const config = useAgenteStore(s => s.config);
    const establecerConfig = useAgenteStore(s => s.establecerConfig);
    const [draft, setDraft] = useState(config);
    const [skills, setSkills] = useState<SkillAgente[]>([]);
    const [skillsError, setSkillsError] = useState<string | null>(null);
    const [nuevaSkill, setNuevaSkill] = useState({nombre: '', descripcion: ''});
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editando, setEditando] = useState({nombre: '', descripcion: ''});
    useEffect(() => {
        if (activo) {
            setDraft(config);
            setSkillsError(null);
            void listarSkills().then(setSkills).catch(e => setSkillsError(e instanceof Error ? e.message : 'No se pudieron cargar las skills'));
        }
    }, [activo, config]);
    if (!activo) return null;
    const actualizar = <K extends keyof ConfigAgente>(campo: K, valor: ConfigAgente[K]) => setDraft(actual => ({...actual, [campo]: valor}));
    const guardar = () => {
        establecerConfig(draft);
        onCerrar();
    };
    const crear = async () => {
        const nombre = nuevaSkill.nombre.trim();
        const descripcion = nuevaSkill.descripcion.trim();
        if (!nombre || !descripcion) return;
        try {
            const skill = await crearSkill({nombre, descripcion, activa: true});
            setSkills(prev => [...prev, skill]);
            setNuevaSkill({nombre: '', descripcion: ''});
            setSkillsError(null);
        } catch (e) { setSkillsError(e instanceof Error ? e.message : 'No se pudo crear la skill'); }
    };
    const alternar = async (skill: SkillAgente) => {
        try {
            const actualizada = await actualizarSkill(skill.id, {activa: !skill.activa});
            setSkills(prev => prev.map(s => s.id === skill.id ? actualizada : s));
            setSkillsError(null);
        } catch (e) { setSkillsError(e instanceof Error ? e.message : 'No se pudo actualizar la skill'); }
    };
    const guardarEdicion = async (skill: SkillAgente) => {
        const nombre = editando.nombre.trim();
        const descripcion = editando.descripcion.trim();
        if (!nombre || !descripcion) return;
        try {
            const actualizada = await actualizarSkill(skill.id, {nombre, descripcion});
            setSkills(prev => prev.map(s => s.id === skill.id ? actualizada : s));
            setEditandoId(null);
            setSkillsError(null);
        } catch (e) { setSkillsError(e instanceof Error ? e.message : 'No se pudo guardar la skill'); }
    };
    const eliminar = async (id: string) => {
        try {
            await eliminarSkill(id);
            setSkills(prev => prev.filter(s => s.id !== id));
            setSkillsError(null);
        } catch (e) { setSkillsError(e instanceof Error ? e.message : 'No se pudo eliminar la skill'); }
    };

    return (
        <div className="modalConfigAgenteOverlay" onMouseDown={e => {if (e.target === e.currentTarget) onCerrar();}}>
            <div className="modalConfigAgente" role="dialog" aria-modal="true" aria-label="Configuración del agente">
                <div className="modalConfigAgenteCabecera">
                    <span className="modalConfigAgenteTitulo"><Bot size={14}/> Configuración del agente</span>
                    <button type="button" className="modalConfigAgenteCerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
                </div>
                <div className="modalConfigAgenteCuerpo">
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Route size={12}/> Modo por defecto</h3>
                        <div className="modalConfigAgenteOpciones" role="radiogroup" aria-label="Modo por defecto">
                            {MODOS.map(m => <button key={m.id} type="button" role="radio" aria-checked={draft.modo === m.id} className={`modalConfigAgenteOpcion ${draft.modo === m.id ? 'modalConfigAgenteOpcion--activa' : ''}`} onClick={() => actualizar('modo', m.id)}><span className="modalConfigAgenteOpcionRadio">{draft.modo === m.id && <Check size={12}/>}</span><span className="modalConfigAgenteOpcionTexto"><span className="modalConfigAgenteOpcionNombre">{m.nombre}</span><span className="modalConfigAgenteOpcionDesc">{m.descripcion}</span></span></button>)}
                        </div>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Cpu size={12}/> Proveedor y modelo</h3>
                        <label className="modalConfigAgenteCampo">Proveedor
                            <select className="modalConfigAgenteInput" value="glory" disabled><option value="glory">Glory API · ruta auto</option></select>
                        </label>
                        {/* El backend fija provider/modelo a Glory API / commandcode
                         * (ruta auto → DeepSeek Flash); el campo no es editable para
                         * no dejar un control que parezca configurable pero sea inerte. */}
                        <label className="modalConfigAgenteCampo">Modelo
                            <input className="modalConfigAgenteInput" value="commandcode" disabled />
                        </label>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Gauge size={12}/> Respuesta y límites</h3>
                        <label className="modalConfigAgenteCampo">Temperatura <output>{draft.temperatura.toFixed(1)}</output><input type="range" min="0" max="2" step="0.1" value={draft.temperatura} onChange={e => actualizar('temperatura', clamped(Number(e.target.value), 0, 2))}/></label>
                        <label className="modalConfigAgenteCampo">Máximo de tokens <output>{draft.maxTokens}</output><input type="range" min="64" max="4096" step="64" value={draft.maxTokens} onChange={e => actualizar('maxTokens', clamped(Number(e.target.value), 64, 4096))}/></label>
                        <label className="modalConfigAgenteCampo">Turnos máximos <output>{draft.maxTurns}</output><input type="range" min="1" max="10" step="1" value={draft.maxTurns} onChange={e => actualizar('maxTurns', clamped(Number(e.target.value), 1, 10))}/></label>
                        <label className="modalConfigAgenteCampo">Timeout por herramienta (segundos) <output>{draft.timeoutToolSecs}</output><input type="range" min="1" max="15" step="1" value={draft.timeoutToolSecs} onChange={e => actualizar('timeoutToolSecs', clamped(Number(e.target.value), 1, 15))}/></label>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Languages size={12}/> Idioma y contexto</h3>
                        <label className="modalConfigAgenteCampo">Idioma
                            <select className="modalConfigAgenteInput" value={draft.idioma} onChange={e => actualizar('idioma', e.target.value as ConfigAgente['idioma'])}><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option><option value="fr">Français</option></select>
                        </label>
                        {([
                            ['incluirNotas', 'Incluir notas'],
                            ['incluirTareasCompletadas', 'Incluir tareas completadas'],
                            ['incluirHabitosPausados', 'Incluir hábitos pausados'],
                            ['permitirBusquedaWeb', 'Permitir búsqueda web'],
                            ['permitirRecordatorios', 'Permitir recordatorios'],
                            ['incluirMemoria', 'Incluir memoria persistente'],
                            ['incluirSkills', 'Incluir skills activas'],
                        ] as const).map(([campo, etiqueta]) => <label key={campo} className="modalConfigAgenteCheck"><input type="checkbox" checked={draft[campo]} onChange={e => actualizar(campo, e.target.checked)}/>{etiqueta}</label>)}
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><FileText size={12}/> Prompt de sistema</h3>
                        <textarea className="modalConfigAgenteInput modalConfigAgenteTextarea" maxLength={4000} value={draft.promptSistema} onChange={e => actualizar('promptSistema', e.target.value)} placeholder="Instrucciones adicionales para el agente..." />
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Brain size={12}/> Skills</h3>
                        <p className="modalConfigAgenteSeccionDesc">Skills del usuario que el agente inyecta como contexto cuando «Incluir skills activas» está marcado.</p>
                        {skillsError && <p className="modalConfigAgenteError" role="alert">{skillsError}</p>}
                        <div className="modalConfigAgenteSkills">
                            {skills.length === 0 && !skillsError && <p className="modalConfigAgenteSeccionDesc">Sin skills todavía.</p>}
                            {skills.map(s => editandoId === s.id ? (
                                <div key={s.id} className="modalConfigAgenteSkill modalConfigAgenteSkill--editando">
                                    <input className="modalConfigAgenteInput" value={editando.nombre} onChange={e => setEditando({...editando, nombre: e.target.value})} placeholder="Nombre" onKeyDown={e => {if (e.key === 'Enter') void guardarEdicion(s); if (e.key === 'Escape') setEditandoId(null);}} />
                                    <input className="modalConfigAgenteInput" value={editando.descripcion} onChange={e => setEditando({...editando, descripcion: e.target.value})} placeholder="Descripción" />
                                    <div className="modalConfigAgenteSkillAcciones">
                                        <button type="button" className="modalConfigAgenteSkillBoton" onClick={() => void guardarEdicion(s)} aria-label="Guardar skill"><Check size={13}/></button>
                                        <button type="button" className="modalConfigAgenteSkillBoton" onClick={() => setEditandoId(null)} aria-label="Cancelar edición"><X size={13}/></button>
                                    </div>
                                </div>
                            ) : (
                                <div key={s.id} className="modalConfigAgenteSkill">
                                    <label className="modalConfigAgenteSkillActiva" title={s.activa ? 'Desactivar' : 'Activar'}><input type="checkbox" checked={s.activa} onChange={() => void alternar(s)} /></label>
                                    <div className="modalConfigAgenteSkillTexto">
                                        <span className="modalConfigAgenteSkillNombre">{s.nombre}</span>
                                        {s.descripcion && <span className="modalConfigAgenteSkillDesc">{s.descripcion}</span>}
                                    </div>
                                    <div className="modalConfigAgenteSkillAcciones">
                                        <button type="button" className="modalConfigAgenteSkillBoton" onClick={() => {setEditandoId(s.id); setEditando({nombre: s.nombre, descripcion: s.descripcion});}} aria-label={`Editar ${s.nombre}`}><Pencil size={13}/></button>
                                        <button type="button" className="modalConfigAgenteSkillBoton" onClick={() => void eliminar(s.id)} aria-label={`Eliminar ${s.nombre}`}><Trash2 size={13}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="modalConfigAgenteSkillNueva">
                            <input className="modalConfigAgenteInput" value={nuevaSkill.nombre} onChange={e => setNuevaSkill({...nuevaSkill, nombre: e.target.value})} placeholder="Nombre de la skill" onKeyDown={e => {if (e.key === 'Enter') void crear();}} />
                            <input className="modalConfigAgenteInput" value={nuevaSkill.descripcion} onChange={e => setNuevaSkill({...nuevaSkill, descripcion: e.target.value})} placeholder="Descripción" />
                            <Boton type="button" variante="secundario" disabled={!nuevaSkill.nombre.trim() || !nuevaSkill.descripcion.trim()} onClick={() => void crear()}><Plus size={13}/> Añadir</Boton>
                        </div>
                    </section>
                </div>
                <div className="modalConfigAgentePie"><Boton type="button" variante="primario" onClick={guardar}>Guardar</Boton></div>
            </div>
        </div>
    );
}
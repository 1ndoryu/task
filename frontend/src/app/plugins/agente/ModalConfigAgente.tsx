/* Configuración del agente: todos los valores se persisten y se envían al runtime. */
import {useEffect, useState} from 'react';
import {Bot, Cpu, Check} from 'lucide-react';
import {useAgenteStore} from './store';
import type {ConfigAgente} from './service';
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
    useEffect(() => { if (activo) setDraft(config); }, [activo, config]);
    if (!activo) return null;
    const actualizar = <K extends keyof ConfigAgente>(campo: K, valor: ConfigAgente[K]) => setDraft(actual => ({...actual, [campo]: valor}));
    const guardar = () => {
        establecerConfig(draft);
        onCerrar();
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
                        <h3 className="modalConfigAgenteSeccionTitulo">Modo por defecto</h3>
                        <div className="modalConfigAgenteOpciones" role="radiogroup" aria-label="Modo por defecto">
                            {MODOS.map(m => <button key={m.id} type="button" role="radio" aria-checked={draft.modo === m.id} className={`modalConfigAgenteOpcion ${draft.modo === m.id ? 'modalConfigAgenteOpcion--activa' : ''}`} onClick={() => actualizar('modo', m.id)}><span className="modalConfigAgenteOpcionRadio">{draft.modo === m.id && <Check size={12}/>}</span><span className="modalConfigAgenteOpcionTexto"><span className="modalConfigAgenteOpcionNombre">{m.nombre}</span><span className="modalConfigAgenteOpcionDesc">{m.descripcion}</span></span></button>)}
                        </div>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Cpu size={12}/> Proveedor y modelo</h3>
                        <label className="modalConfigAgenteCampo">Proveedor
                            <select className="modalConfigAgenteInput" value="glory" disabled><option value="glory">Glory API · ruta auto</option></select>
                        </label>
                        <label className="modalConfigAgenteCampo">Modelo
                            <input className="modalConfigAgenteInput" value={draft.modelo} onChange={e => actualizar('modelo', e.target.value.replace(/^glory\//, ''))} placeholder="commandcode" />
                        </label>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo">Respuesta y límites</h3>
                        <label className="modalConfigAgenteCampo">Temperatura <output>{draft.temperatura.toFixed(1)}</output><input type="range" min="0" max="2" step="0.1" value={draft.temperatura} onChange={e => actualizar('temperatura', clamped(Number(e.target.value), 0, 2))}/></label>
                        <label className="modalConfigAgenteCampo">Máximo de tokens <output>{draft.maxTokens}</output><input type="range" min="64" max="4096" step="64" value={draft.maxTokens} onChange={e => actualizar('maxTokens', clamped(Number(e.target.value), 64, 4096))}/></label>
                        <label className="modalConfigAgenteCampo">Turnos máximos <output>{draft.maxTurns}</output><input type="range" min="1" max="10" step="1" value={draft.maxTurns} onChange={e => actualizar('maxTurns', clamped(Number(e.target.value), 1, 10))}/></label>
                        <label className="modalConfigAgenteCampo">Timeout por herramienta (segundos) <output>{draft.timeoutToolSecs}</output><input type="range" min="1" max="15" step="1" value={draft.timeoutToolSecs} onChange={e => actualizar('timeoutToolSecs', clamped(Number(e.target.value), 1, 15))}/></label>
                    </section>
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo">Idioma y contexto</h3>
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
                        <h3 className="modalConfigAgenteSeccionTitulo">Prompt de sistema</h3>
                        <textarea className="modalConfigAgenteInput modalConfigAgenteTextarea" maxLength={4000} value={draft.promptSistema} onChange={e => actualizar('promptSistema', e.target.value)} placeholder="Instrucciones adicionales para el agente..." />
                    </section>
                </div>
                <div className="modalConfigAgentePie"><Boton type="button" variante="primario" onClick={guardar}>Guardar</Boton></div>
            </div>
        </div>
    );
}
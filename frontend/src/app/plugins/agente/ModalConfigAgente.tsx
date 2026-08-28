/*
 * plugins/agente/ModalConfigAgente.tsx
 * Modal de configuración del plugin de agente (Fase 5 del plan, v1).
 *
 * Expone solo los parámetros que el contrato backend realmente respeta hoy:
 * - Modo por defecto: se aplica a las nuevas conversaciones (backend hereda el
 *   modo en el stream).
 * - Modelo: se envía con cada turno al stream (el backend lo acepta como
 *   opcional; si vacío, usa su valor por defecto).
 *
 * Persiste en `glory-agente-config`/`establecerConfig`. Autocontenido
 * (el patrón de ModalEditorArbol): se abre/cierra desde PanelAgente.
 */

import {useState} from 'react';
import {Bot, Cpu, Check} from 'lucide-react';
import {type ConfigAgente, useAgenteStore} from './store';
import {Boton} from '../../components/ui/Boton';
import './modalConfigAgente.css';

interface ModalConfigAgenteProps {
    activo: boolean;
    onCerrar: () => void;
}

const MODOS: Array<{id: ConfigAgente['modo']; nombre: string; descripcion: string}> = [
    {id: 'predeterminado', nombre: 'Predeterminado', descripcion: 'Las herramientas con efecto piden tu aprobación antes de ejecutarse.'},
    {id: 'meta', nombre: 'Meta', descripcion: 'Como predeterminado, y además puede proponerte ajustar sus propias reglas.'},
    {id: 'autonomo', nombre: 'Autónomo', descripcion: 'Ejecuta las herramientas con efecto sin preguntar (todo queda auditado).'},
];

export function ModalConfigAgente({activo, onCerrar}: ModalConfigAgenteProps): JSX.Element | null {
    const config = useAgenteStore(s => s.config);
    const establecerConfig = useAgenteStore(s => s.establecerConfig);
    const [modo, setModo] = useState<ConfigAgente['modo']>(config.modo);
    const [modelo, setModelo] = useState(config.modelo);

    if (!activo) return null;

    const guardar = () => {
        establecerConfig({modo, modelo: modelo.trim()});
        onCerrar();
    };

    return (
        <div className="modalConfigAgenteOverlay" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
            <div className="modalConfigAgente" role="dialog" aria-modal="true" aria-label="Configuración del agente">
                <div className="modalConfigAgenteCabecera">
                    <span className="modalConfigAgenteTitulo"><Bot size={14} /> Configuración del agente</span>
                    <button type="button" className="modalConfigAgenteCerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
                </div>

                <div className="modalConfigAgenteCuerpo">
                    {/* Modo por defecto */}
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo">Modo de operación</h3>
                        <p className="modalConfigAgenteSeccionDesc">Se aplica a las conversaciones nuevas.</p>
                        <div className="modalConfigAgenteOpciones" role="radiogroup" aria-label="Modo de operación">
                            {MODOS.map(m => {
                                const activoModo = modo === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={activoModo}
                                        className={`modalConfigAgenteOpcion ${activoModo ? 'modalConfigAgenteOpcion--activa' : ''}`}
                                        onClick={() => setModo(m.id)}
                                    >
                                        <span className="modalConfigAgenteOpcionRadio">
                                            {activoModo && <Check size={12} />}
                                        </span>
                                        <span className="modalConfigAgenteOpcionTexto">
                                            <span className="modalConfigAgenteOpcionNombre">{m.nombre}</span>
                                            <span className="modalConfigAgenteOpcionDesc">{m.descripcion}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Modelo */}
                    <section className="modalConfigAgenteSeccion">
                        <h3 className="modalConfigAgenteSeccionTitulo"><Cpu size={12} /> Modelo del proveedor</h3>
                        <p className="modalConfigAgenteSeccionDesc">
                            Nombre del modelo sin prefijo de proveedor. Por defecto <code>commandcode</code>,
                            la ruta "auto" de Glory API (sin clave) que resuelve a DeepSeek Flash.
                            Vacío = el predeterminado del backend.
                        </p>
                        <input
                            className="modalConfigAgenteInput"
                            type="text"
                            value={modelo}
                            onChange={e => setModelo(e.target.value.replace(/^glory\//, ''))}
                            placeholder="commandcode"
                        />
                    </section>
                </div>

                <div className="modalConfigAgentePie">
                    <Boton type="button" variante="primario" onClick={guardar}>Guardar</Boton>
                </div>
            </div>
        </div>
    );
}
/*
 * islands/VerificacionFormularios318A3Island.tsx
 * [318A-3] Verificación visual (DoD) de los formularios migrados al sistema
 * centralizado FormCampo/FormularioConfiguracion: patrón A (9/9) + patrón B
 * (ModalConfigAgente). Ruta /agente/formularios318a3, SOLO en dev
 * (registrada en main.tsx bajo import.meta.env.DEV, igual que
 * GaleriaVisualIsland). Reutiliza las clases de layout de galeriaVisual.css
 * (cero CSS nuevo) y los componentes MISMOS de producción:
 * - Secciones inline (grid de entradas): SeccionConfigIAPanelChat,
 *   SeccionConfigScratchpad, SeccionConfigGruposFb, ItemToggle.
 * - Modales: se abren UNO a la vez con la interacción real (botón → modal con
 *   su botón cerrar), para no apilar overlays fixed.
 * No hay copias ni maquetas divergentes: los fixtures usan los defaults
 * exportados de los hooks reales.
 */

import {useState} from 'react';
import {Boton} from '../components/ui';
import {ItemToggle} from '../components/configuracion/global/paneles/ItemToggle';
import {SeccionConfigIAPanelChat} from '../components/configuracion/global/paneles/SeccionConfigIAPanelChat';
import {SeccionConfigScratchpad} from '../components/configuracion/global/paneles/SeccionConfigScratchpad';
import {SeccionConfigGruposFb} from '../components/configuracion/global/SeccionConfigGruposFb';
import {ModalConfiguracionTareas} from '../components/dashboard/ModalConfiguracionTareas';
import {ModalConfiguracionProyectos} from '../components/dashboard/proyectos/ModalConfiguracionProyectos';
import {ModalConfiguracionHabitos} from '../components/dashboard/ModalConfiguracionHabitos';
import {ModalConfiguracionRecordatorios} from '../components/dashboard/ModalConfiguracionRecordatorios';
import {ModalConfiguracionScratchpad} from '../components/dashboard/ModalConfiguracionScratchpad';
import {ModalConfigAgente} from '../plugins/agente/ModalConfigAgente';
import {CONFIG_POR_DEFECTO} from '../hooks/useConfiguracionTareas';
import {CONFIG_PROYECTOS_DEFECTO} from '../hooks/useConfiguracionProyectos';
import {CONFIG_SCRATCHPAD_DEFECTO} from '../hooks/useConfiguracionScratchpad';
import {COLUMNAS_DESKTOP_POR_DEFECTO} from '../hooks/useConfiguracionHabitos';
import type {ConfiguracionHabitos} from '../hooks/useConfiguracionHabitos';
import type {ConfigRecordatorios} from '../types/recordatorios';

/* El index global del dashboard ya cubre estos componentes; el import directo
 * garantiza el CSS aunque el árbol de imports cambie (Vite deduplica). */
import '../styles/dashboard/index.css';
import '../plugins/agente/modalConfigAgente.css';
import './galeriaVisual.css';

const noop = (): void => {
    /* Demo estática de verificación: los cambios los persisten los callbacks reales. */
};

const configHabitos: ConfiguracionHabitos = {
    ocultarCompletadosHoy: false,
    modoCompacto: false,
    mostrarPausados: true,
    columnasVisibles: COLUMNAS_DESKTOP_POR_DEFECTO,
    toleranciaPreset: 'moderado',
    umbralesPersonalizados: {normal: 1, urgente: 3, bloqueante: 5},
};

const configRecordatorios: ConfigRecordatorios = {
    intervalo: 'hora',
    intervaloMs: 900_000,
    tamanoFuente: 'normal',
};

type ModalVerificacion = 'tareas' | 'proyectos' | 'habitos' | 'recordatorios' | 'scratchpad' | 'agente';

const MODALES: ReadonlyArray<{id: ModalVerificacion; nombre: string}> = Object.freeze([
    {id: 'tareas', nombre: 'Tareas (A)'},
    {id: 'proyectos', nombre: 'Proyectos (A)'},
    {id: 'habitos', nombre: 'Hábitos (A)'},
    {id: 'recordatorios', nombre: 'Recordatorios (A)'},
    {id: 'scratchpad', nombre: 'Scratchpad (A)'},
    {id: 'agente', nombre: 'Agente (B)'},
]);

function EntradaSeccion({id, titulo, children}: {id: string; titulo: string; children: React.ReactNode}): JSX.Element {
    return (
        <section className="galeriaEntrada" id={id}>
            <header className="galeriaEntradaCabecera">
                <span className="galeriaEntradaId">{id}</span>
                <h2 className="galeriaEntradaTitulo">{titulo}</h2>
            </header>
            <div className="galeriaEntradaVista">{children}</div>
        </section>
    );
}

export function VerificacionFormularios318A3Island(): JSX.Element {
    const [modalActivo, setModalActivo] = useState<ModalVerificacion | null>(null);

    return (
        <div className="galeriaVisual">
            <header className="galeriaVisualCabecera">
                <div>
                    <h1 className="galeriaVisualTitulo">Verificación visual 318A-3 — formularios centralizados</h1>
                    <p className="galeriaVisualSub">
                        Los 9 formularios del patrón A + el patrón B (ModalConfigAgente) con los MISMOS
                        componentes de producción (FormCampo/FormularioConfiguracion) y fixtures con los
                        defaults de los hooks reales. Los modales se abren uno a uno con su interacción
                        real. Dev only.
                    </p>
                </div>
            </header>

            <main className="galeriaVisualGrid">
                <EntradaSeccion id="ia-panel-chat" titulo="SeccionConfigIAPanelChat (A — FormCampo 1:1)">
                    <SeccionConfigIAPanelChat />
                </EntradaSeccion>

                <EntradaSeccion id="scratchpad-seccion" titulo="SeccionConfigScratchpad (A — FormularioConfiguracion)">
                    <SeccionConfigScratchpad />
                </EntradaSeccion>

                <EntradaSeccion id="grupos-fb" titulo="SeccionConfigGruposFb (A — escape accionesDetalles)">
                    <SeccionConfigGruposFb />
                </EntradaSeccion>

                <EntradaSeccion id="item-toggle" titulo="ItemToggle (A — FormCampo con ToggleSwitch)">
                    <ItemToggle
                        titulo="Notificaciones de tareas"
                        descripcion="Ejemplo 1: avisos al vencer una tarea."
                        checked={true}
                        onChange={noop}
                    />
                    <ItemToggle
                        titulo="Sonido de hábitos"
                        descripcion="Ejemplo 2: tono al completar un hábito."
                        checked={false}
                        onChange={noop}
                    />
                </EntradaSeccion>

                <EntradaSeccion id="modales" titulo="Modales migrados (patrón A + B) — abrir uno a la vez">
                    <div className="galeriaPropuestaAcciones">
                        {MODALES.map(m => (
                            <Boton
                                key={m.id}
                                type="button"
                                variante="ghost"
                                tamano="pequeño"
                                onClick={() => setModalActivo(m.id)}
                            >
                                {m.nombre}
                            </Boton>
                        ))}
                    </div>
                    {modalActivo === 'tareas' && (
                        <ModalConfiguracionTareas
                            estaAbierto={true}
                            onCerrar={() => setModalActivo(null)}
                            configuracion={CONFIG_POR_DEFECTO}
                            onToggleCompletadas={noop}
                            onToggleBadgeProyecto={noop}
                            onToggleEliminarCompletadas={noop}
                            onToggleMostrarHabitos={noop}
                            onToggleModoCompacto={noop}
                            onToggleOcultarSubtareas={noop}
                            onToggleIgnorarUrgencia={noop}
                            onToggleBadgeUrgencia={noop}
                            onToggleBadgeImportancia={noop}
                            onToggleBadgeDificultad={noop}
                        />
                    )}
                    {modalActivo === 'proyectos' && (
                        <ModalConfiguracionProyectos
                            estaAbierto={true}
                            onCerrar={() => setModalActivo(null)}
                            configuracion={CONFIG_PROYECTOS_DEFECTO}
                            onToggleCompletados={noop}
                            onToggleTareasCompletadas={noop}
                            onToggleProgreso={noop}
                            onToggleModoCompacto={noop}
                        />
                    )}
                    {modalActivo === 'habitos' && (
                        <ModalConfiguracionHabitos
                            estaAbierto={true}
                            onCerrar={() => setModalActivo(null)}
                            configuracion={configHabitos}
                            onToggleCompletadosHoy={noop}
                            onToggleModoCompacto={noop}
                            onToggleMostrarPausados={noop}
                            onToggleColumna={noop}
                            onCambiarTolerancia={noop}
                        />
                    )}
                    {modalActivo === 'recordatorios' && (
                        <ModalConfiguracionRecordatorios
                            estaAbierto={true}
                            onCerrar={() => setModalActivo(null)}
                            configuracion={configRecordatorios}
                            onCambiarIntervaloMs={noop}
                            onCambiarTamanoFuente={noop}
                        />
                    )}
                    {modalActivo === 'scratchpad' && (
                        <ModalConfiguracionScratchpad
                            estaAbierto={true}
                            onCerrar={() => setModalActivo(null)}
                            configuracion={CONFIG_SCRATCHPAD_DEFECTO}
                            onCambiarFuente={noop}
                            onCambiarAltura={noop}
                            onCambiarIntervalo={noop}
                        />
                    )}
                    {modalActivo === 'agente' && <ModalConfigAgente activo={true} onCerrar={() => setModalActivo(null)} />}
                </EntradaSeccion>
            </main>
        </div>
    );
}

export default VerificacionFormularios318A3Island;
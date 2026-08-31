import {useMemo} from 'react';
import {devLog} from '../../utils/devLog';
import type {Habito, Tarea, Proyecto} from '../../types/dashboard';
import {useHabitosStore} from '../../stores/habitosStore';
import {useNotasStore} from '../../stores/notasStore';
import {invalidarCache as invalidarCacheActividad} from '../../services/actividadStore';

export interface RefsSincronizacionWebSocket {
    tareas: React.MutableRefObject<Tarea[]>;
    proyectos: React.MutableRefObject<Proyecto[]>;
    notas: React.MutableRefObject<string>;
    cambiosRemotosRecientes: React.MutableRefObject<{
        tareas: Set<number>;
        habitos: Set<number>;
        proyectos: Set<number>;
    }>;
    contadorCambiosRemotos: React.MutableRefObject<number>;
}

interface CallbacksWebSocketProps {
    refs: RefsSincronizacionWebSocket;
    setTareas: (t: Tarea[] | ((prev: Tarea[]) => Tarea[])) => void;
    setProyectos: (p: Proyecto[] | ((prev: Proyecto[]) => Proyecto[])) => void;
    setNotas: (n: string) => void;
}

interface CallbacksWebSocket {
    onTareaRemota: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Tarea>) => void;
    onHabitoRemoto: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Habito>) => void;
    onProyectoRemoto: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Proyecto>) => void;
    onNotaRemota: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: {contenido: string; id?: string; titulo?: string}) => void;
    onSincronizacionCompleta: () => void;
    onCambioRemotoAplicado: () => void;
}

/*
 * Extractor de los callbacks de sincronización en tiempo real (WebSocket).
 * Separados de useDashboardSync para respetar el límite de líneas del hook
 * (300 efectivas). El estado de los datos se lee SOLO vía refs para evitar
 * stale closures; los setters son los que vienen del caller.
 *
 * Nota: onHabitoRemoto lee el store Zustand directamente (no necesita ref)
 * porque useHabitosStore.getState() siempre está fresco.
 */
export function useCallbacksWebSocket({refs, setTareas, setProyectos, setNotas}: CallbacksWebSocketProps): CallbacksWebSocket {
    return useMemo(
        () => ({
            onTareaRemota: (accion, datos) => {
                devLog('[SyncRT] Tarea remota recibida:', accion, datos);
                const tareasActuales = refs.tareas.current;
                /* [28-08-2026] Registrar el cambio como remoto SOLO cuando realmente
                 * altera el estado. Antes se incrementaba el contador en TODO mensaje:
                 * los que no cambian el hash (crear ya existente, editar idéntico,
                 * eliminar de una entidad ausente) dejaban el contador envenenado y
                 * la absorción HTTP del SyncManager se comía el PRÓXIMO cambio LOCAL
                 * sin guardarlo → el pull de 30s lo revertía (clase del bug del
                 * toggle: "se marca y vuelve a aparecer"). */
                const registrarRemoto = () => {
                    if (datos.id) refs.cambiosRemotosRecientes.current.tareas.add(datos.id);
                    refs.contadorCambiosRemotos.current++;
                };
                if (accion === 'eliminar' && datos.id) {
                    if (!tareasActuales.some(t => t.id === datos.id)) return;
                    registrarRemoto();
                    /* [275A-1] Sol.4: update funcional evita race conditions WS */
                    setTareas((prev: Tarea[]) => prev.filter(t => t.id !== datos.id));
                } else if (accion === 'crear' && datos.id) {
                    if (tareasActuales.some(t => t.id === datos.id)) return;
                    registrarRemoto();
                    setTareas([...tareasActuales, datos as Tarea]);
                } else if ((accion === 'editar' || accion === 'toggle') && datos.id) {
                    const existente = tareasActuales.find(t => t.id === datos.id);
                    /* Entidad ausente: el map sería un no-op (nada que editar) */
                    if (!existente) return;
                    /* La fusión {...existente, ...datos} conserva el orden de claves
                     * de `existente`, así que JSON.stringify es un comparador de
                     * contenido exacto y alineado con el hash del change detector. */
                    if (JSON.stringify(existente) === JSON.stringify({...existente, ...datos})) return;
                    registrarRemoto();
                    setTareas((prev: Tarea[]) => prev.map(t => (t.id === datos.id ? {...t, ...datos} : t)));
                }
            },
            onHabitoRemoto: (accion, datos) => {
                devLog('[SyncRT] Hábito remoto recibido:', accion, datos);
                /* [28-08-2026] Mismo criterio que onTareaRemota: registrar SOLO si el
                 * mensaje realmente altera el estado (el dedup de toggle ya evitaba
                 * el eco pero igual sumaba al contador y envenenaba la absorción). */
                const registrarRemoto = () => {
                    if (datos.id) refs.cambiosRemotosRecientes.current.habitos.add(datos.id);
                    refs.contadorCambiosRemotos.current++;
                };
                const storeSetHabitos = useHabitosStore.getState().setHabitos;
                const habitosActuales = useHabitosStore.getState().habitos;

                /* Deduplicación para toggle: verificar que el estado remoto difiere del local. */
                if (accion === 'toggle' && datos.id) {
                    const habitoLocal = habitosActuales.find(h => h.id === datos.id);
                    if (habitoLocal && datos.historialCompletados) {
                        const historialLocalStr = JSON.stringify(habitoLocal.historialCompletados);
                        const historialRemotoStr = JSON.stringify(datos.historialCompletados);
                        if (historialLocalStr === historialRemotoStr) {
                            devLog('[SyncRT] Toggle hábito ignorado (historial idéntico, probable eco)');
                            return;
                        }
                    }
                }

                if (accion === 'eliminar' && datos.id) {
                    if (!habitosActuales.some(h => h.id === datos.id)) return;
                    registrarRemoto();
                    storeSetHabitos(habitosActuales.filter(h => h.id !== datos.id));
                } else if (accion === 'crear' && datos.id) {
                    if (habitosActuales.some(h => h.id === datos.id)) return;
                    registrarRemoto();
                    storeSetHabitos([...habitosActuales, datos as Habito]);
                } else if ((accion === 'editar' || accion === 'toggle') && datos.id) {
                    const existente = habitosActuales.find(h => h.id === datos.id);
                    if (!existente) return;
                    if (JSON.stringify(existente) === JSON.stringify({...existente, ...datos})) return;
                    registrarRemoto();
                    storeSetHabitos(habitosActuales.map(h => (h.id === datos.id ? {...h, ...datos} : h)));
                }
            },
            onProyectoRemoto: (accion, datos) => {
                devLog('[SyncRT] Proyecto remoto recibido:', accion, datos);
                /* [28-08-2026] Mismo criterio que onTareaRemota. */
                const proyectosActuales = refs.proyectos.current;
                const registrarRemoto = () => {
                    if (datos.id) refs.cambiosRemotosRecientes.current.proyectos.add(datos.id);
                    refs.contadorCambiosRemotos.current++;
                };
                if (accion === 'eliminar' && datos.id) {
                    if (!proyectosActuales.some(p => p.id === datos.id)) return;
                    registrarRemoto();
                    /* [275A-1] Sol.4: update funcional evita race conditions WS */
                    setProyectos((prev: Proyecto[]) => prev.filter(p => p.id !== datos.id));
                } else if (accion === 'crear' && datos.id) {
                    if (proyectosActuales.some(p => p.id === datos.id)) return;
                    registrarRemoto();
                    setProyectos((prev: Proyecto[]) => {
                        if (prev.find(p => p.id === datos.id)) return prev;
                        return [...prev, datos as Proyecto];
                    });
                } else if ((accion === 'editar' || accion === 'toggle') && datos.id) {
                    const existente = proyectosActuales.find(p => p.id === datos.id);
                    if (!existente) return;
                    if (JSON.stringify(existente) === JSON.stringify({...existente, ...datos})) return;
                    registrarRemoto();
                    setProyectos((prev: Proyecto[]) => prev.map(p => (p.id === datos.id ? {...p, ...datos} : p)));
                }
            },
            onNotaRemota: (_accion, datos) => {
                devLog('[SyncRT] Nota remota recibida');
                if (datos.contenido === undefined) return;
                /* Si la nota tiene id, es una nota guardada del notasStore. */
                if (datos.id) {
                    const notasState = useNotasStore.getState();
                    const notaExistente = notasState.notas.find(n => n.id === datos.id);
                    /* [28-08-2026] Sin nota local que actualizar el apply es un no-op:
                     * no registrar (envenenaría la absorción, ver onTareaRemota). */
                    if (!notaExistente || notaExistente.contenido === datos.contenido) return;
                    refs.contadorCambiosRemotos.current++;
                    /* Actualizar nota en la lista + todos los paneles que la tengan abierta */
                    useNotasStore.setState(state => {
                        /* [263A-12] Actualizar todos los paneles que tengan esta nota abierta */
                        const nuevasNotasPorPanel: Record<string, import('../../types/notas').NotaActiva> = {};
                        for (const [pid, nota] of Object.entries(state.notasActivaPorPanel)) {
                            nuevasNotasPorPanel[pid] = nota.id === datos.id ? {...nota, contenido: datos.contenido, modificada: false} : nota;
                        }
                        return {
                            notas: state.notas.map(n => (n.id === datos.id ? {...n, contenido: datos.contenido, fechaModificacion: new Date().toISOString()} : n)),
                            notasActivaPorPanel: nuevasNotasPorPanel
                        };
                    });
                } else {
                    /* Scratchpad (nota sin id) */
                    /* [28-08-2026] Contenido idéntico = no-op: no registrar. */
                    if (datos.contenido === refs.notas.current) return;
                    refs.contadorCambiosRemotos.current++;
                    setNotas(datos.contenido);
                }
            },
            onSincronizacionCompleta: () => {
                devLog('[SyncRT] Sincronización WebSocket completa');
            },
            /* [014A-8] Invalidar cache de actividad al recibir cualquier cambio remoto. */
            onCambioRemotoAplicado: () => {
                invalidarCacheActividad();
            }
        }),
        [refs, setTareas, setProyectos, setNotas]
    );
}
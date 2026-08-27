import {useMemo, useCallback, useEffect, useRef} from 'react';
import {devLog, devWarn} from '../../utils/devLog';
import type {Habito, Tarea, Proyecto} from '../../types/dashboard';
import type {DashboardData} from '../useDashboardApi';
import {useHabitosStore, useHabitosInicializado} from '../../stores/habitosStore';
import {useSyncManager} from './useSyncManager';
import {useSuscripcion} from '../useSuscripcion';
import {useSincronizacionTiempoReal} from '../useSincronizacionTiempoReal';
import {useNotificadorCambiosWebSocket} from '../useNotificadorCambiosWebSocket';
import {obtenerUserId} from '../useSincronizacion';
import {useNotasStore, PANEL_SCRATCHPAD} from '../../stores/notasStore';
import {useAyunoStore} from '../../stores/ayunoStore';
import {useDeficitCaloricoStore} from '../../stores/deficitCaloricoStore';
import {invalidarCache as invalidarCacheActividad} from '../../services/actividadStore';
import {aplicarPreferenciasServidor} from '../../utils/preferenciasUsuario';
import {usePreferenciasServidor} from './usePreferenciasServidor';

interface UseDashboardSyncProps {
    habitos: Habito[];
    tareas: Tarea[];
    proyectos: Proyecto[];
    notas: string;
    setTareas: (t: Tarea[] | ((prev: Tarea[]) => Tarea[])) => void;
    setProyectos: (p: Proyecto[] | ((prev: Proyecto[]) => Proyecto[])) => void;
    setNotas: (n: string) => void;
    cargandoDatos: boolean;
    cargandoDatosLocales: boolean;
}

export function useDashboardSync({habitos, tareas, proyectos, notas, setTareas, setProyectos, setNotas, cargandoDatos, cargandoDatosLocales}: UseDashboardSyncProps) {
    const storeSetHabitos = useHabitosStore(state => state.setHabitos);
    /* [275A-1] Solución 3 (revisada): habitosInicializado se consulta como guard
     * DENTRO de esProbableWipeout y antes del auto-save, NO para bloquear
     * isDataReady. Si lo usamos en isDataReady, creamos deadlock circular:
     * isDataReady espera habitosInicializado, pero habitosInicializado solo
     * se marca cuando llegan datos del servidor (que nunca llegan porque
     * isDataReady=false bloquea la sync inicial). El guard esProbableWipeout
     * ya protege contra subir datos vacíos.
     */
    const habitosInicializado = useHabitosInicializado();
    const ayunoEstado = useAyunoStore(state => state.estado);
    const ayunoSesionActiva = useAyunoStore(state => state.sesionActiva);
    const ayunoHistorial = useAyunoStore(state => state.historial);
    const ayunoUltimoCompletado = useAyunoStore(state => state.ultimoAyunoCompletado);
    const ayunoUpdatedAt = useAyunoStore(state => state.updatedAt);
    const sincronizarAyunoDesdeServidor = useAyunoStore(state => state.sincronizarDesdeServidor);
    const deficitDatosUsuario = useDeficitCaloricoStore(state => state.datosUsuario);
    const deficitComidas = useDeficitCaloricoStore(state => state.comidas);
    const deficitHistorial = useDeficitCaloricoStore(state => state.historial);
    const deficitCargandoIA = useDeficitCaloricoStore(state => state.cargandoIA);
    const deficitErrorIA = useDeficitCaloricoStore(state => state.errorIA);
    const deficitUpdatedAt = useDeficitCaloricoStore(state => state.updatedAt);
    const sincronizarDeficitDesdeServidor = useDeficitCaloricoStore(state => state.sincronizarDesdeServidor);
    const {esPremium: _esPremium} = useSuscripcion();

    /*
     * Refs para evitar stale closures en callbacks WebSocket
     * Los callbacks se pasan a useWebSocket pero los datos (tareas, habitos, proyectos)
     * cambian frecuentemente. Usando refs, los callbacks siempre acceden a la versión actual.
     */
    const tareasRef = useRef(tareas);
    const habitosRef = useRef(habitos);
    const proyectosRef = useRef(proyectos);
    const notasRef = useRef(notas);

    /* Actualizar refs en cada render */
    tareasRef.current = tareas;
    habitosRef.current = habitos;
    proyectosRef.current = proyectos;
    notasRef.current = notas;

    /* [014A-19] Tracking de cambios remotos WebSocket para prevención de eco y absorción HTTP.
     * cambiosRemotosRecientesRef: IDs de entidades que llegaron vía WS remoto. El notificador
     *   los consume para NO reenviarlos (corta el ciclo de eco WS→local→WS→servidor→WS...).
     * contadorCambiosRemotosRef: Contador que useSyncManager lee para saber que el cambio
     *   en el hash fue causado por WS (no requiere HTTP auto-save). */
    const cambiosRemotosRecientesRef = useRef<{
        tareas: Set<number>;
        habitos: Set<number>;
        proyectos: Set<number>;
    }>({tareas: new Set(), habitos: new Set(), proyectos: new Set()});
    const contadorCambiosRemotosRef = useRef(0);

    /*
     * 1. Preparar datos actuales unificados
     */
    const datosActuales: DashboardData = useMemo(
        () => ({
            habitos,
            tareas,
            proyectos,
            notas,
            ayuno: {
                estado: ayunoEstado,
                sesionActiva: ayunoSesionActiva,
                historial: ayunoHistorial,
                ultimoAyunoCompletado: ayunoUltimoCompletado,
                updatedAt: ayunoUpdatedAt
            },
            deficitCalorico: {
                datosUsuario: deficitDatosUsuario,
                apiKeyGemini: '',
                comidas: deficitComidas,
                historial: deficitHistorial,
                cargandoIA: deficitCargandoIA,
                errorIA: deficitErrorIA,
                updatedAt: deficitUpdatedAt
            },
            // Valores por defecto para tipos requeridos por DashboardData que no manejamos directamente aquí
            version: '1.0.0',
            ultimaActualizacion: null, // Evitar timestamps dinámicos en useMemo para estabilidad referencial
            configuracion: {
                notificaciones: {
                    email: false,
                    frecuenciaResumen: 'nunca',
                    horaPreferida: '09:00',
                    tareasPorVencer: false,
                    rachaEnPeligro: false
                },
                cifradoE2E: false,
                tema: 'terminal',
                ordenHabitos: 'importancia'
            }
        }),
        [habitos, tareas, proyectos, notas, ayunoEstado, ayunoSesionActiva, ayunoHistorial, ayunoUltimoCompletado, ayunoUpdatedAt, deficitDatosUsuario, deficitComidas, deficitHistorial, deficitCargandoIA, deficitErrorIA, deficitUpdatedAt]
    );

    /*
     * 2. Callback para actualizar estado local al recibir del servidor HTTP
     */
    const handleDatosServidor = useCallback(
        (datos: DashboardData) => {
            if (datos.habitos !== undefined) storeSetHabitos(datos.habitos);
            if (datos.tareas !== undefined) setTareas(datos.tareas);
            if (datos.proyectos !== undefined) setProyectos(datos.proyectos);
            if (datos.notas !== undefined) setNotas(datos.notas);
            if (datos.ayuno !== undefined) sincronizarAyunoDesdeServidor(datos.ayuno);
            if (datos.deficitCalorico !== undefined) sincronizarDeficitDesdeServidor(datos.deficitCalorico);

            /* [18-08-2026] Restaurar preferencias UI/plugins del servidor en las
             * claves ausentes localmente (navegador nuevo / cache limpia). */
            const preferencias = (datos.configuracion as {preferencias?: Record<string, unknown>} | null)
                ?.preferencias;
            aplicarPreferenciasServidor(preferencias);
        },
        [storeSetHabitos, setTareas, setProyectos, setNotas, sincronizarAyunoDesdeServidor, sincronizarDeficitDesdeServidor]
    );

    /*
     * 2.5. Obtener userId para WebSocket
     */
    const userId = obtenerUserId();

    /*
     * 2.6. Callbacks para sincronización en tiempo real (WebSocket)
     * Cuando recibimos cambios de otro dispositivo, actualizamos el estado local
     * IMPORTANTE: Usamos refs para evitar stale closures - los callbacks siempre
     * acceden a la versión más actual de los datos via tareasRef.current, etc.
     */
    const callbacksWebSocket = useMemo(
        () => ({
            onTareaRemota: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Tarea>) => {
                devLog('[SyncRT] Tarea remota recibida:', accion, datos);
                const tareasActuales = tareasRef.current;
                /* [28-08-2026] Registrar el cambio como remoto SOLO cuando realmente
                 * altera el estado. Antes se incrementaba el contador en TODO mensaje:
                 * los que no cambian el hash (crear ya existente, editar idéntico,
                 * eliminar de una entidad ausente) dejaban el contador envenenado y
                 * la absorción HTTP del SyncManager se comía el PRÓXIMO cambio LOCAL
                 * sin guardarlo → el pull de 30s lo revertía (clase del bug del
                 * toggle: "se marca y vuelve a aparecer"). */
                const registrarRemoto = () => {
                    if (datos.id) cambiosRemotosRecientesRef.current.tareas.add(datos.id);
                    contadorCambiosRemotosRef.current++;
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
            onHabitoRemoto: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Habito>) => {
                devLog('[SyncRT] Hábito remoto recibido:', accion, datos);
                /* [28-08-2026] Mismo criterio que onTareaRemota: registrar SOLO si el
                 * mensaje realmente altera el estado (el dedup de toggle ya evitaba
                 * el eco pero igual sumaba al contador y envenenaba la absorción). */
                const registrarRemoto = () => {
                    if (datos.id) cambiosRemotosRecientesRef.current.habitos.add(datos.id);
                    contadorCambiosRemotosRef.current++;
                };
                const habitosActuales = useHabitosStore.getState().habitos;

                /*
                 * Deduplicación para toggle: verificar que el estado remoto difiere del local.
                 * Si el historial ya es idéntico, ignorar (probable eco de nuestro propio cambio).
                 */
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
            onProyectoRemoto: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Proyecto>) => {
                devLog('[SyncRT] Proyecto remoto recibido:', accion, datos);
                /* [28-08-2026] Mismo criterio que onTareaRemota: registrar SOLO si el
                 * mensaje realmente altera el estado (contador envenenado → cambio
                 * local absorbido sin guardar → revertido por el pull). */
                const proyectosActuales = proyectosRef.current;
                const registrarRemoto = () => {
                    if (datos.id) cambiosRemotosRecientesRef.current.proyectos.add(datos.id);
                    contadorCambiosRemotosRef.current++;
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
            onNotaRemota: (_accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: {contenido: string; id?: string; titulo?: string}) => {
                devLog('[SyncRT] Nota remota recibida');
                if (datos.contenido === undefined) return;
                /*
                 * Si la nota tiene id, es una nota guardada del notasStore.
                 * Actualizar tanto el scratchpad como la nota guardada.
                 */
                if (datos.id) {
                    const notasState = useNotasStore.getState();
                    const notaExistente = notasState.notas.find(n => n.id === datos.id);
                    /* [28-08-2026] Sin nota local que actualizar el apply es un no-op:
                     * no registrar (envenenaría la absorción, ver onTareaRemota). */
                    if (!notaExistente || notaExistente.contenido === datos.contenido) return;
                    contadorCambiosRemotosRef.current++;
                    /* Actualizar nota en la lista */
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
                        /* [28-08-2026] Contenido idéntico = no-op: no registrar
                         * (envenenaría la absorción, ver onTareaRemota). */
                        if (datos.contenido === notasRef.current) return;
                        contadorCambiosRemotosRef.current++;
                        setNotas(datos.contenido);
                    }
            },
            onSincronizacionCompleta: () => {
                devLog('[SyncRT] Sincronización WebSocket completa');
            },
            /* [014A-8] Invalidar cache de actividad al recibir cualquier cambio remoto.
             * Esto fuerza recarga del heatmap y panel de actividad en <200ms
             * en vez de esperar TTL del cache (antes 5min, ahora 60s). */
            onCambioRemotoAplicado: () => {
                invalidarCacheActividad();
            }
        }),
        /* Solo dependemos de los setters, no de los datos - usamos refs para acceder a datos actuales */
        [setTareas, setProyectos, setNotas, storeSetHabitos]
    );

    /*
     * 2.7. Hook de sincronización en tiempo real (WebSocket)
     */
    const {estadoConexion, conectado: wsConectado, notificarCambio} = useSincronizacionTiempoReal(userId || null, callbacksWebSocket, userId > 0 /* Solo habilitar si hay usuario */);

    /*
     * 2.8. Hook notificador automático de cambios
     * Detecta cambios en tareas/hábitos/proyectos/notas y notifica via WebSocket
     * para sincronización en tiempo real entre dispositivos
     */
    useNotificadorCambiosWebSocket({
        tareas,
        habitos,
        proyectos,
        notas,
        notificarCambio,
        habilitado: wsConectado && userId > 0,
        cargando: cargandoDatos || cargandoDatosLocales,
        /* [014A-19] Ref de IDs remotos para prevención de eco */
        cambiosRemotosRecientes: cambiosRemotosRecientesRef
    });

    /*
     * 2.9. Sincronización de notas guardadas (notasStore) via WebSocket
     * Detecta cambios en la nota activa y los envía para sync en tiempo real.
     * Usa debounce de 1.5s para no saturar con cada tecla.
     */
    const debounceNotaGuardadaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ultimoContenidoNotaRef = useRef<string>('');

    useEffect(() => {
        if (!wsConectado || userId <= 0) return;

        const unsub = useNotasStore.subscribe(state => {
            /* [263A-12] Sincronizar la nota del panel principal */
            const notaActiva = state.notasActivaPorPanel[PANEL_SCRATCHPAD];
            if (!notaActiva?.id || !notaActiva.modificada) return;

            /* Evitar enviar el mismo contenido */
            if (notaActiva.contenido === ultimoContenidoNotaRef.current) return;
            ultimoContenidoNotaRef.current = notaActiva.contenido;

            /* Debounce para no enviar en cada keystroke */
            if (debounceNotaGuardadaRef.current) {
                clearTimeout(debounceNotaGuardadaRef.current);
            }

            debounceNotaGuardadaRef.current = setTimeout(() => {
                notificarCambio({
                    entidad: 'nota',
                    accion: 'editar',
                    id: notaActiva.id!,
                    datos: {id: notaActiva.id, contenido: notaActiva.contenido}
                });
            }, 1500);
        });

        return () => {
            unsub();
            if (debounceNotaGuardadaRef.current) {
                clearTimeout(debounceNotaGuardadaRef.current);
            }
        };
    }, [wsConectado, userId, notificarCambio]);

    /*
     * 3. Invocar al nuevo Manager
     * Nota: useSyncManager maneja internamente:
     * - Detección de cambios (useChangeDetector)
     * - Transporte y reintentos (useSyncTransport)
     * - Carga inicial inteligente
     * - Debounce
     */
    /* [18-08-2026] Observador de preferencias: cuando el usuario cambia layout,
     * plugins, tema, órdenes... se sube el blob por PUT parcial con debounce,
     * aunque no cambien tareas/hábitos/notas (el SyncManager no lo detectaría). */
    const esSesionActiva = ((window as unknown as {gloryDashboard?: {isLoggedIn?: boolean}}).gloryDashboard?.isLoggedIn ?? false);
    usePreferenciasServidor(esSesionActiva);

    const {syncState, forceSync} = useSyncManager({
        currentData: datosActuales,
        onDataReceived: handleDatosServidor,
        debounceMs: 2000,
        /* [18-08-2026] isDataReady tambien exige sesion: en la landing (sin
         * sesion) el SyncManager no debe inicializarse (no hay datos que
         * sincronizar y el login recarga la pagina, asi que no hay deadlock).
         * Evita logs de subida pendiente/guard en la landing. */
        isDataReady: !cargandoDatosLocales && esSesionActiva
        /* [275A-1] Pasamos habitosInicializado al guard esProbableWipeout.
         * Si Zustand aun no hidrato, el guard es mas agresivo (bloquea con 2 arrays vacios).
         */,
        habitosInicializado /* [014A-19] Contador de cambios remotos WS para absorción HTTP */,
        contadorCambiosRemotosRef,
        onInitComplete: () => {
            /*
             * Safety fallback: Si la sync termina (éxito, error o skip por breaker),
             * asegurarnos de que la UI se desbloquea marcando el store como inicializado.
             * No mostrar warning si el error es de autenticación (usuario no logueado).
             */
            if (!useHabitosStore.getState().inicializado) {
                /* Solo mostrar warning si no es un error de autenticación */
                const esErrorAuth = syncState.error && (syncState.error.includes('No autenticado') || syncState.error.includes('401'));

                if (!esErrorAuth) {
                    devWarn('[useDashboardSync] Forzando inicialización de store post-sync (Degradación Graciosa).');
                }
                useHabitosStore.getState().marcarInicializado();
            }
        }
    });

    return {
        sincronizacion: {
            sincronizado: syncState.isSynced,
            pendiente: syncState.pendingChanges || syncState.isSaving,
            error: syncState.error,
            estaLogueado: true,
            sincronizarAhora: forceSync,
            cargandoDesdeServidor: syncState.isLoading
        },
        /* Sincronización en tiempo real (WebSocket) */
        tiempoReal: {
            estadoConexion,
            conectado: wsConectado,
            notificarCambio
        }
    };
}

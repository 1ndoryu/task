import {useMemo, useCallback, useEffect, useRef} from 'react';
import type {Habito, Tarea, Proyecto} from '../../types/dashboard';
import type {DashboardData} from '../useDashboardApi';
import {useHabitosStore} from '../../stores/habitosStore';
import {useSyncManager} from './useSyncManager';
import {useSuscripcion} from '../useSuscripcion';
import {useSincronizacionTiempoReal} from '../useSincronizacionTiempoReal';
import {useNotificadorCambiosWebSocket} from '../useNotificadorCambiosWebSocket';
import {obtenerUserId} from '../useSincronizacion';

interface UseDashboardSyncProps {
    habitos: Habito[];
    tareas: Tarea[];
    proyectos: Proyecto[];
    notas: string;
    setTareas: (t: Tarea[]) => void;
    setProyectos: (p: Proyecto[]) => void;
    setNotas: (n: string) => void;
    cargandoDatos: boolean;
    cargandoDatosLocales: boolean;
}

export function useDashboardSync({habitos, tareas, proyectos, notas, setTareas, setProyectos, setNotas, cargandoDatos, cargandoDatosLocales}: UseDashboardSyncProps) {
    const storeSetHabitos = useHabitosStore(state => state.setHabitos);
    const {esPremium} = useSuscripcion();

    /*
     * Refs para evitar stale closures en callbacks WebSocket
     * Los callbacks se pasan a useWebSocket pero los datos (tareas, habitos, proyectos)
     * cambian frecuentemente. Usando refs, los callbacks siempre acceden a la versión actual.
     */
    const tareasRef = useRef(tareas);
    const habitosRef = useRef(habitos);
    const proyectosRef = useRef(proyectos);

    /* Actualizar refs en cada render */
    tareasRef.current = tareas;
    habitosRef.current = habitos;
    proyectosRef.current = proyectos;

    /*
     * 1. Preparar datos actuales unificados
     */
    const datosActuales: DashboardData = useMemo(
        () => ({
            habitos,
            tareas,
            proyectos,
            notas,
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
        [habitos, tareas, proyectos, notas]
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
        },
        [storeSetHabitos, setTareas, setProyectos, setNotas]
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
                console.log('[SyncRT] Tarea remota recibida:', accion, datos);
                const tareasActuales = tareasRef.current;
                if (accion === 'eliminar' && datos.id) {
                    setTareas(tareasActuales.filter(t => t.id !== datos.id));
                } else if (accion === 'crear' && datos.id) {
                    /* Verificar que no exista ya */
                    if (!tareasActuales.find(t => t.id === datos.id)) {
                        setTareas([...tareasActuales, datos as Tarea]);
                    }
                } else if ((accion === 'editar' || accion === 'toggle') && datos.id) {
                    setTareas(tareasActuales.map(t => (t.id === datos.id ? {...t, ...datos} : t)));
                }
            },
            onHabitoRemoto: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Habito>) => {
                console.log('[SyncRT] Hábito remoto recibido:', accion, datos);
                const habitosActuales = useHabitosStore.getState().habitos;
                if (accion === 'eliminar' && datos.id) {
                    storeSetHabitos(habitosActuales.filter(h => h.id !== datos.id));
                } else if (accion === 'crear' && datos.id) {
                    if (!habitosActuales.find(h => h.id === datos.id)) {
                        storeSetHabitos([...habitosActuales, datos as Habito]);
                    }
                } else if ((accion === 'editar' || accion === 'toggle') && datos.id) {
                    storeSetHabitos(habitosActuales.map(h => (h.id === datos.id ? {...h, ...datos} : h)));
                }
            },
            onProyectoRemoto: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Proyecto>) => {
                console.log('[SyncRT] Proyecto remoto recibido:', accion, datos);
                const proyectosActuales = proyectosRef.current;
                if (accion === 'eliminar' && datos.id) {
                    setProyectos(proyectosActuales.filter(p => p.id !== datos.id));
                } else if (accion === 'crear' && datos.id) {
                    if (!proyectosActuales.find(p => p.id === datos.id)) {
                        setProyectos([...proyectosActuales, datos as Proyecto]);
                    }
                } else if ((accion === 'editar' || accion === 'toggle') && datos.id) {
                    setProyectos(proyectosActuales.map(p => (p.id === datos.id ? {...p, ...datos} : p)));
                }
            },
            onNotaRemota: (_accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: {contenido: string}) => {
                console.log('[SyncRT] Nota remota recibida');
                if (datos.contenido !== undefined) {
                    setNotas(datos.contenido);
                }
            },
            onSincronizacionCompleta: () => {
                console.log('[SyncRT] Sincronización WebSocket completa');
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
        cargando: cargandoDatos || cargandoDatosLocales
    });

    /*
     * 3. Invocar al nuevo Manager
     * Nota: useSyncManager maneja internamente:
     * - Detección de cambios (useChangeDetector)
     * - Transporte y reintentos (useSyncTransport)
     * - Carga inicial inteligente
     * - Debounce
     */
    const {syncState, forceSync} = useSyncManager({
        currentData: datosActuales,
        onDataReceived: handleDatosServidor,
        debounceMs: 2000,
        isDataReady: !cargandoDatosLocales,
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
                    console.warn('[useDashboardSync] Forzando inicialización de store post-sync (Degradación Graciosa).');
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

import {useMemo, useCallback, useEffect, useRef} from 'react';
import type {Habito, Tarea, Proyecto} from '../../types/dashboard';
import type {DashboardData} from '../useDashboardApi';
import {useHabitosStore} from '../../stores/habitosStore';
import {useSyncManager} from './useSyncManager';
import {useSuscripcion} from '../useSuscripcion';
import {useSincronizacionTiempoReal} from '../useSincronizacionTiempoReal';
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
     */
    const callbacksWebSocket = useMemo(
        () => ({
            onTareaRemota: (accion: 'crear' | 'editar' | 'eliminar' | 'toggle', datos: Partial<Tarea>) => {
                console.log('[SyncRT] Tarea remota recibida:', accion, datos);
                if (accion === 'eliminar' && datos.id) {
                    setTareas(tareas.filter(t => t.id !== datos.id));
                } else if (accion === 'crear' && datos.id) {
                    /* Verificar que no exista ya */
                    if (!tareas.find(t => t.id === datos.id)) {
                        setTareas([...tareas, datos as Tarea]);
                    }
                } else if ((accion === 'editar' || accion === 'toggle') && datos.id) {
                    setTareas(tareas.map(t => (t.id === datos.id ? {...t, ...datos} : t)));
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
                if (accion === 'eliminar' && datos.id) {
                    setProyectos(proyectos.filter(p => p.id !== datos.id));
                } else if (accion === 'crear' && datos.id) {
                    if (!proyectos.find(p => p.id === datos.id)) {
                        setProyectos([...proyectos, datos as Proyecto]);
                    }
                } else if ((accion === 'editar' || accion === 'toggle') && datos.id) {
                    setProyectos(proyectos.map(p => (p.id === datos.id ? {...p, ...datos} : p)));
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
        [tareas, habitos, proyectos, setTareas, setProyectos, setNotas, storeSetHabitos]
    );

    /*
     * 2.7. Hook de sincronización en tiempo real (WebSocket)
     */
    const {estadoConexion, conectado: wsConectado, notificarCambio} = useSincronizacionTiempoReal(userId || null, callbacksWebSocket, userId > 0 /* Solo habilitar si hay usuario */);

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

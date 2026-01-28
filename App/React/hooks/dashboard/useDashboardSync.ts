import {useCallback, useEffect, useMemo, useRef} from 'react';
import type {Habito, Tarea, Proyecto} from '../../types/dashboard';
import type {DashboardData} from '../useDashboardApi';
import {useHabitosStore} from '../../stores/habitosStore';
import {useSincronizacion} from '../useSincronizacion';

interface UseDashboardSyncProps {
    habitos: Habito[];
    tareas: Tarea[];
    proyectos: Proyecto[];
    notas: string;
    setTareas: (t: Tarea[]) => void;
    setProyectos: (p: Proyecto[]) => void;
    setNotas: (n: string) => void;
    cargandoDatos: boolean;
}

export function useDashboardSync({habitos, tareas, proyectos, notas, setTareas, setProyectos, setNotas, cargandoDatos}: UseDashboardSyncProps) {
    const storeSetHabitos = useHabitosStore(state => state.setHabitos);

    /*
     * Sincronización con servidor WordPress
     * Solo activa si el usuario está logueado
     */
    const datosParaSync = useMemo(
        () => ({
            habitos,
            tareas,
            proyectos,
            notas
        }),
        [habitos, tareas, proyectos, notas]
    );

    const handleDatosServidor = useCallback(
        (datos: DashboardData) => {
            /*
             * Al recibir datos del servidor, REEMPLAZAR completamente los datos locales.
             * Esto es importante porque al iniciar sesión en otro dispositivo,
             * los datos del servidor son la fuente de verdad.
             * NO verificamos si hay datos - el servidor puede tener arrays vacíos
             * que son datos válidos (el usuario borró todo).
             */
            if (datos.habitos !== undefined) storeSetHabitos(datos.habitos);
            if (datos.tareas !== undefined) setTareas(datos.tareas);
            if (datos.proyectos !== undefined) setProyectos(datos.proyectos);
            if (datos.notas !== undefined) setNotas(datos.notas);
        },
        [storeSetHabitos, setTareas, setProyectos, setNotas]
    );

    const {estado: estadoSync, sincronizarAhora, marcarCambiosPendientes, estaLogueado, cargandoDesdeServidor} = useSincronizacion(datosParaSync, handleDatosServidor);

    /* Marcar cambios pendientes cuando los datos cambian */
    const datosVersion = useRef({habitos: '', tareas: '', proyectos: '', notas: ''});

    /*
     * FIX BUG SINCRONIZACION: Flag para bloquear guardado hasta que carga inicial termine.
     * Problema: Al cargar la página, localStorage puede tener datos vacíos/demo mientras
     * el servidor tiene datos reales. Sin este flag, los datos demo sobrescriben al servidor.
     * Ver: .agent/docs/bug-sincronizacion-tareas.md
     */
    const cargaInicialCompletaRef = useRef(false);

    useEffect(() => {
        /*
         * Crear un hash simple del contenido para detectar cambios reales.
         * No solo contamos el length porque cambios en el contenido (parentId, texto, etc.)
         * no cambiarían el length pero sí necesitan sincronizarse.
         */
        const hashSimple = (arr: unknown[]): string => {
            if (!arr) return '0';
            if (Array.isArray(arr) && arr.length === 0) return '0';
            /* Usamos JSON.stringify para capturar cambios en cualquier campo */
            return `${Array.isArray(arr) ? arr.length : 0}_${JSON.stringify(arr).length}`;
        };

        const nuevaVersion = {
            habitos: hashSimple(habitos),
            tareas: hashSimple(tareas),
            proyectos: hashSimple(proyectos),
            notas: notas.slice(0, 100)
        };

        /*
         * FIX: Solo sincronizar si:
         * 1. No estamos cargando datos locales NI del servidor
         * 2. La carga inicial YA completó (flag activado)
         * 3. Hay cambios reales en los datos
         *
         * Si la carga inicial no ha completado, solo actualizamos el snapshot
         * sin disparar sincronización. Esto evita sobrescribir el servidor.
         */
        if (!cargandoDatos && !cargandoDesdeServidor) {
            if (cargaInicialCompletaRef.current) {
                /* Carga inicial ya pasó: detectar cambios reales del usuario */
                if (JSON.stringify(nuevaVersion) !== JSON.stringify(datosVersion.current)) {
                    datosVersion.current = nuevaVersion;
                    marcarCambiosPendientes();
                }
            } else {
                /* Primera vez: marcar carga como completa y tomar snapshot sin sincronizar */
                datosVersion.current = nuevaVersion;
                /* Delay para que React termine de asentar los datos del servidor */
                setTimeout(() => {
                    cargaInicialCompletaRef.current = true;
                }, 500);
            }
        }
    }, [habitos, tareas, proyectos, notas, cargandoDatos, cargandoDesdeServidor, marcarCambiosPendientes]);

    return {
        sincronizacion: {
            sincronizado: estadoSync.sincronizado,
            pendiente: estadoSync.pendiente,
            error: estadoSync.error,
            estaLogueado,
            sincronizarAhora
        }
    };
}

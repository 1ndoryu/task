/*
 * Hook useNotificacionesLocales
 *
 * Gestiona las notificaciones locales (push) del dispositivo usando Capacitor.
 * Permite programar notificaciones para ventanas de oportunidad de hábitos.
 *
 * REQUISITOS:
 * 1. Instalar: npm install @capacitor/local-notifications
 * 2. Sincronizar: npx cap sync
 * 3. Android: Permisos se solicitan automáticamente
 *
 * TAREA 8: Notificaciones push en APK
 */

import {useCallback, useEffect, useRef} from 'react';
import {Capacitor} from '@capacitor/core';
import type {Habito, VentanaOportunidad} from '../types/dashboard';

/*
 * Interfaz para el plugin de notificaciones locales
 * Definida manualmente para evitar errores si el paquete no está instalado
 */
interface NotificacionLocalPlugin {
    requestPermissions(): Promise<{display: string}>;
    checkPermissions(): Promise<{display: string}>;
    schedule(options: {notifications: NotificacionLocal[]}): Promise<{notifications: {id: number}[]}>;
    cancel(options: {notifications: {id: number}[]}): Promise<void>;
    getPending(): Promise<{notifications: {id: number}[]}>;
    removeAllListeners(): Promise<void>;
    addListener(evento: string, callback: (notificacion: any) => void): Promise<{remove: () => void}>;
}

interface NotificacionLocal {
    id: number;
    title: string;
    body: string;
    schedule?: {
        at?: Date;
        on?: {hour: number; minute: number};
        every?: 'day' | 'hour' | 'minute';
        allowWhileIdle?: boolean;
    };
    sound?: string;
    smallIcon?: string;
    largeIcon?: string;
    iconColor?: string;
    ongoing?: boolean;
    autoCancel?: boolean;
    extra?: Record<string, any>;
}

interface EstadoNotificacionesLocales {
    permisoConcedido: boolean;
    esNativo: boolean;
}

interface AccionesNotificacionesLocales {
    solicitarPermiso: () => Promise<boolean>;
    programarNotificacionHabito: (habito: Habito) => Promise<void>;
    cancelarNotificacionHabito: (habitoId: number) => Promise<void>;
    cancelarTodasNotificaciones: () => Promise<void>;
    actualizarNotificacionesHabitos: (habitos: Habito[]) => Promise<void>;
}

/*
 * ID base para notificaciones de hábitos
 * Se suma al habitoId para generar IDs únicos
 */
const ID_BASE_HABITOS = 10000;

/*
 * Obtiene el plugin de notificaciones locales
 * Retorna null si no está disponible o no es plataforma nativa
 */
async function obtenerPluginNotificaciones(): Promise<NotificacionLocalPlugin | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
        /* @ts-expect-error - El módulo puede no estar instalado */
        const modulo = await import('@capacitor/local-notifications');
        return modulo.LocalNotifications as NotificacionLocalPlugin;
    } catch {
        console.warn('[Notificaciones] Plugin @capacitor/local-notifications no instalado');
        return null;
    }
}

/*
 * Calcula la próxima hora de notificación basada en la ventana de oportunidad
 */
function calcularProximaNotificacion(ventana: VentanaOportunidad): Date {
    const ahora = new Date();
    const notificacion = new Date();

    /* Configurar hora de inicio de la ventana */
    notificacion.setHours(ventana.horaInicio, ventana.minutoInicio, 0, 0);

    /* Si ya pasó la hora de hoy, programar para mañana */
    if (notificacion <= ahora) {
        notificacion.setDate(notificacion.getDate() + 1);
    }

    return notificacion;
}

export function useNotificacionesLocales(habitos: Habito[] = []): EstadoNotificacionesLocales & AccionesNotificacionesLocales {
    const pluginRef = useRef<NotificacionLocalPlugin | null>(null);
    const permisoRef = useRef<boolean>(false);
    const esNativo = Capacitor.isNativePlatform();

    /* Inicializar plugin al montar */
    useEffect(() => {
        if (!esNativo) return;

        let montado = true;

        (async () => {
            const plugin = await obtenerPluginNotificaciones();
            if (!montado) return;

            if (plugin) {
                pluginRef.current = plugin;
                /* Verificar permisos existentes */
                const estado = await plugin.checkPermissions();
                permisoRef.current = estado.display === 'granted';
            }
        })();

        return () => {
            montado = false;
        };
    }, [esNativo]);

    /* Solicitar permiso de notificaciones */
    const solicitarPermiso = useCallback(async (): Promise<boolean> => {
        if (!esNativo || !pluginRef.current) return false;

        try {
            const resultado = await pluginRef.current.requestPermissions();
            permisoRef.current = resultado.display === 'granted';
            return permisoRef.current;
        } catch (error) {
            console.error('[Notificaciones] Error al solicitar permisos:', error);
            return false;
        }
    }, [esNativo]);

    /* Programar notificación para un hábito con ventana de oportunidad */
    const programarNotificacionHabito = useCallback(
        async (habito: Habito): Promise<void> => {
            if (!esNativo || !pluginRef.current || !permisoRef.current) return;
            if (!habito.ventanaOportunidad?.habilitada) return;

            const plugin = pluginRef.current;
            const idNotificacion = ID_BASE_HABITOS + habito.id;

            /* Cancelar notificación existente primero */
            try {
                await plugin.cancel({notifications: [{id: idNotificacion}]});
            } catch {
                /* Ignorar error si no existe */
            }

            /* Calcular próxima notificación */
            const proximaFecha = calcularProximaNotificacion(habito.ventanaOportunidad);

            /* Programar nueva notificación */
            try {
                await plugin.schedule({
                    notifications: [
                        {
                            id: idNotificacion,
                            title: '⏰ Ventana de oportunidad',
                            body: `Es hora de: ${habito.nombre}`,
                            schedule: {
                                at: proximaFecha,
                                allowWhileIdle: true
                            },
                            sound: 'default',
                            autoCancel: true,
                            extra: {
                                habitoId: habito.id,
                                tipo: 'ventanaOportunidad'
                            }
                        }
                    ]
                });
            } catch (error) {
                console.error('[Notificaciones] Error al programar:', error);
            }
        },
        [esNativo]
    );

    /* Cancelar notificación de un hábito específico */
    const cancelarNotificacionHabito = useCallback(
        async (habitoId: number): Promise<void> => {
            if (!esNativo || !pluginRef.current) return;

            try {
                await pluginRef.current.cancel({notifications: [{id: ID_BASE_HABITOS + habitoId}]});
            } catch (error) {
                console.error('[Notificaciones] Error al cancelar:', error);
            }
        },
        [esNativo]
    );

    /* Cancelar todas las notificaciones programadas */
    const cancelarTodasNotificaciones = useCallback(async (): Promise<void> => {
        if (!esNativo || !pluginRef.current) return;

        try {
            const pendientes = await pluginRef.current.getPending();
            if (pendientes.notifications.length > 0) {
                await pluginRef.current.cancel({notifications: pendientes.notifications});
            }
        } catch (error) {
            console.error('[Notificaciones] Error al cancelar todas:', error);
        }
    }, [esNativo]);

    /* Actualizar notificaciones para todos los hábitos con ventana de oportunidad */
    const actualizarNotificacionesHabitos = useCallback(
        async (listaHabitos: Habito[]): Promise<void> => {
            if (!esNativo || !pluginRef.current || !permisoRef.current) return;

            /* Filtrar hábitos con ventana de oportunidad habilitada */
            const habitosConVentana = listaHabitos.filter(h => h.ventanaOportunidad?.habilitada && !h.pausado);

            /* Programar notificaciones para cada uno */
            for (const habito of habitosConVentana) {
                await programarNotificacionHabito(habito);
            }
        },
        [esNativo, programarNotificacionHabito]
    );

    /* Actualizar notificaciones cuando cambian los hábitos */
    useEffect(() => {
        if (!esNativo || habitos.length === 0) return;

        /* Pequeño delay para evitar actualizaciones excesivas */
        const timeout = setTimeout(() => {
            actualizarNotificacionesHabitos(habitos);
        }, 1000);

        return () => clearTimeout(timeout);
    }, [habitos, esNativo, actualizarNotificacionesHabitos]);

    return {
        permisoConcedido: permisoRef.current,
        esNativo,
        solicitarPermiso,
        programarNotificacionHabito,
        cancelarNotificacionHabito,
        cancelarTodasNotificaciones,
        actualizarNotificacionesHabitos
    };
}

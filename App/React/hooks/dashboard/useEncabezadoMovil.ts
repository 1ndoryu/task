/*
 * useEncabezadoMovil
 * Hook que encapsula la lógica de EncabezadoMenuMovil.
 * Maneja opciones del drawer, navegación y acciones del menú.
 */

import {useMemo, useCallback} from 'react';
import {obtenerOpcionesMenuUsuario, obtenerOpcionCerrarSesion} from '../../utils/opcionesMenuUsuario';
import type {OpcionDrawer} from '../../components/shared/DrawerMovil';
import type {InfoSuscripcion, SincronizacionInfo} from '../../types/dashboard';
import type {PaginaMovil} from '../usePaginaMovil';

export interface UseEncabezadoMovilParams {
    suscripcion?: InfoSuscripcion | null;
    sincronizacion?: SincronizacionInfo;
    onCerrarDrawer: () => void;
    onClickPlan?: () => void;
    onClickSeguridad?: () => void;
    onClickAdmin?: () => void;
    onClickLayout?: () => void;
    onClickVersion?: () => void;
    onClickUsuario?: () => void;
    onClickEquipos?: () => void;
    onClickNotificaciones?: (evento?: React.MouseEvent) => void;
    onClickExperimentos?: () => void;
    onClickTemas?: () => void;
    onClickConfigUsuario?: () => void;
    onClickBackups?: () => void;
    onClickConfigMCP?: () => void;
    onClickPlugins?: () => void;
    onExportarDatos?: () => void;
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    onCambiarPagina?: (pagina: PaginaMovil) => void;
}

export interface UseEncabezadoMovilReturn {
    manejarOpcionDrawer: (opcionId: string) => void;
    opcionesDrawer: OpcionDrawer[];
    opcionesSecundariasDrawer: OpcionDrawer[];
}

export function useEncabezadoMovil({
    suscripcion,
    sincronizacion,
    onCerrarDrawer,
    onClickPlan,
    onClickSeguridad,
    onClickAdmin,
    onClickLayout,
    onClickVersion,
    onClickUsuario,
    onClickEquipos,
    onClickNotificaciones,
    onClickExperimentos,
    onClickTemas,
    onClickConfigUsuario,
    onClickBackups,
    onClickConfigMCP,
    onClickPlugins,
    onExportarDatos,
    onCrearRapido,
    onCambiarPagina
}: UseEncabezadoMovilParams): UseEncabezadoMovilReturn {
    /* Manejar selección de opción en el drawer */
    const manejarOpcionDrawer = useCallback(
        (opcionId: string) => {
            if (opcionId === 'notificaciones' && onClickNotificaciones) return onClickNotificaciones();
            if (opcionId === 'layout') return onClickLayout?.();
            if (opcionId === 'plan') return onClickPlan?.();
            if (opcionId === 'admin') return onClickAdmin?.();
            if (opcionId === 'experimentos') return onClickExperimentos?.();
            if (opcionId === 'equipos') return onClickEquipos?.();
            if (opcionId === 'login') return sincronizacion?.onLogin?.();
            if (opcionId === 'sync') return sincronizacion?.sincronizarAhora();
            if (['tarea', 'habito', 'proyecto'].includes(opcionId)) return onCrearRapido?.(opcionId as 'tarea' | 'habito' | 'proyecto');

            switch (opcionId) {
                case 'perfil':
                    onClickUsuario?.();
                    break;
                case 'seguridad':
                    onClickSeguridad?.();
                    break;
                case 'backups':
                    onClickBackups?.();
                    break;
                case 'configuracion':
                    onClickConfigUsuario?.();
                    break;
                case 'version':
                    onClickVersion?.();
                    break;
                case 'temas':
                    onClickTemas?.();
                    break;
                case 'mcp':
                    onClickConfigMCP?.();
                    break;
                case 'plugins':
                    onClickPlugins?.();
                    break;
                case 'exportar':
                    onExportarDatos?.();
                    break;
                case 'actividad':
                    onCambiarPagina?.('actividad');
                    onCerrarDrawer();
                    break;
                case 'logout':
                    sincronizacion?.onLogout?.();
                    break;
            }
        },
        [onClickNotificaciones, onClickLayout, onClickPlan, onClickAdmin, onClickExperimentos, onClickEquipos, sincronizacion, onCrearRapido, onClickUsuario, onClickSeguridad, onClickBackups, onClickConfigUsuario, onClickVersion, onClickTemas, onClickConfigMCP, onClickPlugins, onExportarDatos, onCambiarPagina, onCerrarDrawer]
    );

    /*
     * Opciones principales del drawer usando configuración centralizada
     * Las opciones de layout, notificaciones, admin y laboratorio no van en móvil
     */
    const opcionesDrawer = useMemo((): OpcionDrawer[] => {
        const opcionesCentralizadas = obtenerOpcionesMenuUsuario({
            esMovil: true,
            esPremium: suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa',
            version: '',
            tamanoIcono: 18
        });

        return opcionesCentralizadas.map(opcion => ({
            id: opcion.id,
            etiqueta: opcion.etiqueta,
            icono: opcion.icono,
            separadorDespues: opcion.separadorDespues,
            peligroso: opcion.peligroso
        }));
    }, [suscripcion]);

    /*
     * Opciones secundarias: solo cerrar sesión al final
     */
    const opcionesSecundariasDrawer = useMemo((): OpcionDrawer[] => {
        const opcionLogout = obtenerOpcionCerrarSesion(18);
        return [
            {
                id: opcionLogout.id,
                etiqueta: opcionLogout.etiqueta,
                icono: opcionLogout.icono,
                peligroso: opcionLogout.peligroso
            }
        ];
    }, []);

    return {
        manejarOpcionDrawer,
        opcionesDrawer,
        opcionesSecundariasDrawer
    };
}

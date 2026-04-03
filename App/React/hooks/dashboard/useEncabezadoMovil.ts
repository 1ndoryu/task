/*
 * useEncabezadoMovil
 * Hook que encapsula la lógica de EncabezadoMenuMovil.
 * Maneja opciones del drawer, navegación y acciones del menú.
 */

import {useMemo, useCallback, createElement} from 'react';
import {SlidersHorizontal} from 'lucide-react';
import {obtenerOpcionesMenuUsuario, obtenerOpcionCerrarSesion} from '../../utils/opcionesMenuUsuario';
import {obtenerTodosPanelesNavegables} from '../../config/registroPaneles';
import {obtenerPluginDePanelId} from '../../config/registroPlugins';
import {usePluginsStore} from '../../stores/pluginsStore';
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
    onPersonalizarBarra?: () => void;
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
    onCambiarPagina,
    onPersonalizarBarra
}: UseEncabezadoMovilParams): UseEncabezadoMovilReturn {
    /* [034A-11] Selector específico de plugins activos para filtrar paneles del drawer */
    const pluginsActivos = usePluginsStore(s => s.pluginsActivos);

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

            /* [014A-12] Personalizar barra inferior */
            if (opcionId === 'personalizar-barra') {
                onPersonalizarBarra?.();
                onCerrarDrawer();
                return;
            }

            /* [014A-12] Navegación directa a panel desde el drawer */
            if (opcionId.startsWith('panel:')) {
                const idPagina = opcionId.replace('panel:', '');
                onCambiarPagina?.(idPagina);
                onCerrarDrawer();
                return;
            }

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
        [onClickNotificaciones, onClickLayout, onClickPlan, onClickAdmin, onClickExperimentos, onClickEquipos, sincronizacion, onCrearRapido, onClickUsuario, onClickSeguridad, onClickBackups, onClickConfigUsuario, onClickVersion, onClickTemas, onClickConfigMCP, onClickPlugins, onExportarDatos, onCambiarPagina, onCerrarDrawer, onPersonalizarBarra]
    );

    /*
     * Opciones principales del drawer usando configuración centralizada
     * [014A-12] Ahora incluye todos los paneles como opciones de navegación
     * + opción "Personalizar barra" para configurar la barra inferior.
     */
    const opcionesDrawer = useMemo((): OpcionDrawer[] => {
        /* Paneles navegables como primera sección del drawer.
         * [034A-11] Filtra paneles de plugins inactivos para que no aparezcan
         * en el drawer páginas de plugins que el usuario no ha activado. */
        const paneles = obtenerTodosPanelesNavegables().filter(panel => {
            const pluginId = obtenerPluginDePanelId(panel.id);
            /* Si no pertenece a ningún plugin, es un panel base → siempre visible */
            if (!pluginId) return true;
            /* Si pertenece a un plugin, solo mostrar si está activo */
            return pluginsActivos.includes(pluginId);
        });
        const opcionesPaneles: OpcionDrawer[] = paneles.map((panel, idx) => ({
            id: `panel:${panel.idPagina}`,
            etiqueta: panel.titulo,
            icono: panel.icono,
            separadorDespues: idx === paneles.length - 1
        }));

        /* Personalizar barra como última opción de la sección de paneles */
        opcionesPaneles.push({
            id: 'personalizar-barra',
            etiqueta: 'Personalizar barra',
            icono: createElement(SlidersHorizontal, {size: 18}),
            separadorDespues: true
        });

        /* Opciones centralizadas (configuración, actividad, plan, etc.) */
        const opcionesCentralizadas = obtenerOpcionesMenuUsuario({
            esMovil: true,
            esPremium: suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa',
            version: '',
            tamanoIcono: 18
        });

        const opcionesConfig = opcionesCentralizadas
            /* [014A-12] Quitar 'actividad' de opciones centralizadas (ahora está en sección paneles) */
            .filter(opcion => opcion.id !== 'actividad')
            .map(opcion => ({
                id: opcion.id,
                etiqueta: opcion.etiqueta,
                icono: opcion.icono,
                separadorDespues: opcion.separadorDespues,
                peligroso: opcion.peligroso
            }));

        return [...opcionesPaneles, ...opcionesConfig];
    }, [suscripcion, pluginsActivos]);

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

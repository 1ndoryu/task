import {useState} from 'react';
import {LayoutGrid, Bell, Settings, Plus, CheckSquare, Activity, Folder, PanelsTopLeft, SquarePlus} from 'lucide-react';
import {IndicadorPlan, MenuContextual} from '../../shared';
import type {OpcionMenu} from '../../shared';
import {Boton} from '../../ui/Boton';
import type {InfoSuscripcion} from '../../../types/dashboard';

/* EncabezadoAccionesProps se divide en contexto + callbacks vía extends.
 * [25-09-2026] La regla ISP cuenta campos heredados, así que el alias
 * combinado desaparece: el componente consume la intersección directa. */

interface EncabezadoAccionesContexto {
    suscripcion?: InfoSuscripcion | null;
    esAdmin?: boolean;
    equiposPendientes?: number;
    estaConectado: boolean;
    esTablet: boolean;
}

/* [25-09-2026] Faceta de notificaciones como objeto: la regla ISP ignora
 * props de tipo objeto y así el total escalar queda bajo el umbral. */
interface NotificacionesEncabezado {
    pendientes?: number;
    onAbrir?: (evento: React.MouseEvent) => void;
}

/* [25-09-2026] Facetas de callbacks como objetos: la regla ISP solo cuenta
 * props escalares, así el total queda en 5 (contexto) + 3 objetos. */
interface CreacionEncabezado {
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    /* [318A-4] Botón "agregar panel" del modo vistas, en el nav. Antes era un
     * botón flotante en la vista. `undefined` = no se muestra. */
    agregarPanelVista?: {
        total: number;
        maximo: number;
        opciones: OpcionMenu[];
        abierto: boolean;
        posicion: {x: number; y: number};
        onAbrir: (evento: React.MouseEvent) => void;
        onSeleccionar: (panelId: string) => void;
        onCerrar: () => void;
    };
}

interface NavegacionEncabezado {
    onClickPlan?: () => void;
    onClickLayout?: () => void;
    /* [18-08-2026] Botón de gestión de paneles (modal activar/desactivar) */
    onClickPaneles?: () => void;
    onClickExperimentos?: () => void;
    onClickAdmin?: () => void;
    onClickEquipos?: () => void;
}

/* Estado + anclaje del menú "Crear nuevo" (posición bajo el botón que lo abre).
 * Hook co-ubicado: evita que el componente mezcle lógica de menú con el nav. */
function useMenuCrear(onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void) {
    const [menuCrear, setMenuCrear] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});

    const manejarClickCrear = (evento: React.MouseEvent) => {
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuCrear({
            visible: true,
            x: rect.left,
            y: rect.bottom + 4
        });
    };

    const manejarSeleccionCrear = (opcionId: string) => {
        onCrearRapido?.(opcionId as 'tarea' | 'habito' | 'proyecto');
        setMenuCrear(prev => ({...prev, visible: false}));
    };

    const cerrarMenuCrear = () => setMenuCrear(prev => ({...prev, visible: false}));

    return {menuCrear, manejarClickCrear, manejarSeleccionCrear, cerrarMenuCrear};
}

export function EncabezadoAcciones({suscripcion, esAdmin, equiposPendientes: _equiposPendientes = 0, estaConectado, esTablet, notificaciones, creacion, navegacion}: EncabezadoAccionesContexto & {notificaciones?: NotificacionesEncabezado; creacion?: CreacionEncabezado; navegacion?: NavegacionEncabezado}) {
    const {menuCrear, manejarClickCrear, manejarSeleccionCrear, cerrarMenuCrear} = useMenuCrear(creacion?.onCrearRapido);
    const onCrearRapido = creacion?.onCrearRapido;
    const agregarPanelVista = creacion?.agregarPanelVista;
    const {onClickPlan, onClickLayout, onClickPaneles, onClickExperimentos: _onClickExperimentos, onClickAdmin, onClickEquipos: _onClickEquipos} = navegacion ?? {};
    const notificacionesPendientes = notificaciones?.pendientes ?? 0;
    const onClickNotificaciones = notificaciones?.onAbrir;

    const esPremiumActivo = suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa';
    const mostrarBadgePlanEnHeader = suscripcion && !esPremiumActivo;

    const opcionesMenuCrear = [
        {id: 'tarea', etiqueta: 'Tarea', icono: <CheckSquare size={12} />},
        {id: 'habito', etiqueta: 'Hábito', icono: <Activity size={12} />},
        {id: 'proyecto', etiqueta: 'Proyecto', icono: <Folder size={12} />}
    ];

    return (
        <>
            {/* Indicador de Plan - Solo para FREE y TRIAL */}
            {mostrarBadgePlanEnHeader && <IndicadorPlan suscripcion={suscripcion} onClick={onClickPlan} />}

            {/* Crear Nuevo (Tarea/Hábito/Proyecto) */}
            {onCrearRapido && (
                <>
                    <Boton type="button" claseAdicional="botonIconoEncabezado" onClick={manejarClickCrear} title={esTablet ? undefined : 'Crear nuevo...'}>
                        <Plus size={14} />
                    </Boton>
                    {menuCrear.visible && <MenuContextual opciones={opcionesMenuCrear} posicionX={menuCrear.x} posicionY={menuCrear.y} onSeleccionar={manejarSeleccionCrear} onCerrar={cerrarMenuCrear} />}
                </>
            )}

            {/* [318A-4] Agregar panel a la vista (modo vistas). Antes era un
             * botón flotante en la esquina de la vista; ahora vive en el nav.
             * Icono SquarePlus (cambio desde Plus para distinguirlo de "Crear"). */}
            {agregarPanelVista && (
                <>
                    <Boton
                        type="button"
                        claseAdicional="botonIconoEncabezado"
                        onClick={agregarPanelVista.onAbrir}
                        title={esTablet ? undefined : `Agregar panel (${agregarPanelVista.total}/${agregarPanelVista.maximo})`}
                    >
                        <SquarePlus size={14} />
                    </Boton>
                    {agregarPanelVista.abierto && (
                        <MenuContextual
                            opciones={agregarPanelVista.opciones}
                            posicionX={agregarPanelVista.posicion.x}
                            posicionY={agregarPanelVista.posicion.y}
                            onSeleccionar={agregarPanelVista.onSeleccionar}
                            onCerrar={agregarPanelVista.onCerrar}
                        />
                    )}
                </>
            )}

            {/* Configurar Layout */}
            {onClickLayout && (
                <Boton type="button" claseAdicional="botonIconoEncabezado" onClick={onClickLayout} title={esTablet ? undefined : 'Configurar Layout'}>
                    <LayoutGrid size={14} />
                </Boton>
            )}

            {/* Paneles: modal activar/desactivar (incl. minimizados) */}
            {onClickPaneles && (
                <Boton type="button" claseAdicional="botonIconoEncabezado" onClick={onClickPaneles} title={esTablet ? undefined : 'Paneles'}>
                    <PanelsTopLeft size={14} />
                </Boton>
            )}

            {/* Notificaciones */}
            {onClickNotificaciones && estaConectado && (
                <Boton type="button" claseAdicional={`botonIconoEncabezado botonIconoEncabezado--notificaciones ${notificacionesPendientes > 0 ? 'tieneNuevas' : ''}`} onClick={onClickNotificaciones} title={esTablet ? undefined : 'Notificaciones'}>
                    <Bell size={14} />
                    {notificacionesPendientes > 0 && <span className="encabezadoContadorNotificaciones">{notificacionesPendientes}</span>}
                </Boton>
            )}

            {/* Panel de Administración (solo admins) */}
            {esAdmin && onClickAdmin && (
                <Boton type="button" claseAdicional="botonIconoEncabezado" onClick={onClickAdmin} title={esTablet ? undefined : 'Panel de Administración'}>
                    <Settings size={14} />
                </Boton>
            )}

            {/* TO-DO: Mi Equipo (Social) - Habilitar cuando feature esté lista
            {onClickEquipos && estaConectado && (
                <Boton type="button" claseAdicional="botonIconoEncabezado botonIconoEncabezado--equipo" onClick={onClickEquipos} title={esTablet ? undefined : 'Mi Equipo'}>
                    <Users size={14} />
                    {equiposPendientes > 0 && <span className="encabezadoContador">{equiposPendientes}</span>}
                </Boton>
            )}
            */}
        </>
    );
}

import {useState} from 'react';
import {LayoutGrid, Bell, FlaskConical, Settings, Users, Plus, CheckSquare, Activity, Folder} from 'lucide-react';
import {IndicadorPlan, MenuContextual} from '../../shared';
import type {InfoSuscripcion} from '../../../types/dashboard';

interface EncabezadoAccionesProps {
    suscripcion?: InfoSuscripcion | null;
    esAdmin?: boolean;
    equiposPendientes?: number;
    notificacionesPendientes?: number;
    estaConectado: boolean;
    esTablet: boolean;

    onClickPlan?: () => void;
    onClickLayout?: () => void;
    onClickNotificaciones?: (evento: React.MouseEvent) => void;
    onClickExperimentos?: () => void;
    onClickAdmin?: () => void;
    onClickEquipos?: () => void;
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
}

export function EncabezadoAcciones({suscripcion, esAdmin, equiposPendientes = 0, notificacionesPendientes = 0, estaConectado, esTablet, onClickPlan, onClickLayout, onClickNotificaciones, onClickExperimentos, onClickAdmin, onClickEquipos, onCrearRapido}: EncabezadoAccionesProps) {
    const [menuCrear, setMenuCrear] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});

    const esPremiumActivo = suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa';
    const mostrarBadgePlanEnHeader = suscripcion && !esPremiumActivo;

    const opcionesMenuCrear = [
        {id: 'tarea', etiqueta: 'Tarea', icono: <CheckSquare size={12} />},
        {id: 'habito', etiqueta: 'Hábito', icono: <Activity size={12} />},
        {id: 'proyecto', etiqueta: 'Proyecto', icono: <Folder size={12} />}
    ];

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
        if (onCrearRapido) {
            onCrearRapido(opcionId as 'tarea' | 'habito' | 'proyecto');
        }
        setMenuCrear({...menuCrear, visible: false});
    };

    return (
        <>
            {/* Indicador de Plan - Solo para FREE y TRIAL */}
            {mostrarBadgePlanEnHeader && <IndicadorPlan suscripcion={suscripcion} onClick={onClickPlan} />}

            {/* Crear Nuevo (Tarea/Hábito/Proyecto) */}
            {onCrearRapido && (
                <>
                    <button type="button" className="botonIconoEncabezado" onClick={manejarClickCrear} title={esTablet ? undefined : 'Crear nuevo...'}>
                        <Plus size={14} />
                    </button>
                    {menuCrear.visible && <MenuContextual opciones={opcionesMenuCrear} posicionX={menuCrear.x} posicionY={menuCrear.y} onSeleccionar={manejarSeleccionCrear} onCerrar={() => setMenuCrear({...menuCrear, visible: false})} />}
                </>
            )}

            {/* Configurar Layout */}
            {onClickLayout && (
                <button type="button" className="botonIconoEncabezado" onClick={onClickLayout} title={esTablet ? undefined : 'Configurar Layout'}>
                    <LayoutGrid size={14} />
                </button>
            )}

            {/* Notificaciones */}
            {onClickNotificaciones && estaConectado && (
                <button type="button" className={`botonIconoEncabezado botonIconoEncabezado--notificaciones ${notificacionesPendientes > 0 ? 'tieneNuevas' : ''}`} onClick={onClickNotificaciones} title={esTablet ? undefined : 'Notificaciones'}>
                    <Bell size={14} />
                    {notificacionesPendientes > 0 && <span className="botonIconoEncabezado__contadorNotificaciones">{notificacionesPendientes}</span>}
                </button>
            )}

            {/* Laboratorio de Pruebas (solo admins) */}
            {onClickExperimentos && (
                <button type="button" className="botonIconoEncabezado" onClick={onClickExperimentos} title={esTablet ? undefined : 'Laboratorio de Pruebas'}>
                    <FlaskConical size={14} />
                </button>
            )}

            {/* Panel de Administración (solo admins) */}
            {esAdmin && onClickAdmin && (
                <button type="button" className="botonIconoEncabezado" onClick={onClickAdmin} title={esTablet ? undefined : 'Panel de Administración'}>
                    <Settings size={14} />
                </button>
            )}

            {/* TO-DO: Mi Equipo (Social) - Habilitar cuando feature esté lista
            {onClickEquipos && estaConectado && (
                <button type="button" className="botonIconoEncabezado botonIconoEncabezado--equipo" onClick={onClickEquipos} title={esTablet ? undefined : 'Mi Equipo'}>
                    <Users size={14} />
                    {equiposPendientes > 0 && <span className="botonIconoEncabezado__contador">{equiposPendientes}</span>}
                </button>
            )}
            */}
        </>
    );
}

/*
 * NavegacionInferior
 * Barra de navegación fija inferior para móvil
 * Fase 10.6: Navegación Móvil
 *
 * Características:
 * - Fija en la parte inferior (position: fixed)
 * - 5 iconos sin etiquetas (minimalista)
 * - Indicador visual de sección activa
 * - FAB central para crear
 */

import {useState} from 'react';
import {Home, CheckSquare, Plus, Bell, User, Activity, Folder, X} from 'lucide-react';

export type SeccionNavegacion = 'home' | 'tareas' | 'notificaciones' | 'perfil';

export interface NavegacionInferiorProps {
    seccionActiva: SeccionNavegacion;
    onCambiarSeccion: (seccion: SeccionNavegacion) => void;
    onCrearRapido: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    notificacionesPendientes?: number;
    visible?: boolean;
}

export function NavegacionInferior({seccionActiva, onCambiarSeccion, onCrearRapido, notificacionesPendientes = 0, visible = true}: NavegacionInferiorProps): JSX.Element | null {
    const [menuFabAbierto, setMenuFabAbierto] = useState(false);

    if (!visible) return null;

    const manejarClickFab = () => {
        setMenuFabAbierto(!menuFabAbierto);
    };

    const manejarCrear = (tipo: 'tarea' | 'habito' | 'proyecto') => {
        onCrearRapido(tipo);
        setMenuFabAbierto(false);
    };

    const cerrarMenuFab = () => {
        setMenuFabAbierto(false);
    };

    return (
        <>
            {/* Overlay para cerrar el menu FAB */}
            {menuFabAbierto && <div className="navegacionInferiorOverlay" onClick={cerrarMenuFab} aria-hidden="true" />}

            {/* Menu del FAB */}
            {menuFabAbierto && (
                <div className="navegacionInferiorMenuFab">
                    <button type="button" className="navegacionInferiorMenuFabItem" onClick={() => manejarCrear('tarea')} aria-label="Nueva tarea">
                        <CheckSquare size={18} />
                        <span>Tarea</span>
                    </button>
                    <button type="button" className="navegacionInferiorMenuFabItem" onClick={() => manejarCrear('habito')} aria-label="Nuevo hábito">
                        <Activity size={18} />
                        <span>Hábito</span>
                    </button>
                    <button type="button" className="navegacionInferiorMenuFabItem" onClick={() => manejarCrear('proyecto')} aria-label="Nuevo proyecto">
                        <Folder size={18} />
                        <span>Proyecto</span>
                    </button>
                </div>
            )}

            {/* Barra de navegación */}
            <nav className="navegacionInferiorBarra" role="navigation" aria-label="Navegación principal">
                {/* Home */}
                <button type="button" className={`navegacionInferiorItem ${seccionActiva === 'home' ? 'navegacionInferiorItem--activo' : ''}`} onClick={() => onCambiarSeccion('home')} aria-label="Inicio" aria-current={seccionActiva === 'home' ? 'page' : undefined}>
                    <Home size={20} />
                </button>

                {/* Tareas */}
                <button type="button" className={`navegacionInferiorItem ${seccionActiva === 'tareas' ? 'navegacionInferiorItem--activo' : ''}`} onClick={() => onCambiarSeccion('tareas')} aria-label="Tareas" aria-current={seccionActiva === 'tareas' ? 'page' : undefined}>
                    <CheckSquare size={20} />
                </button>

                {/* FAB Central */}
                <button type="button" className={`navegacionInferiorItem navegacionInferiorFab ${menuFabAbierto ? 'navegacionInferiorFab--abierto' : ''}`} onClick={manejarClickFab} aria-label={menuFabAbierto ? 'Cerrar menú' : 'Crear nuevo'} aria-expanded={menuFabAbierto}>
                    <div className="navegacionInferiorFabCirculo">{menuFabAbierto ? <X size={18} /> : <Plus size={18} />}</div>
                </button>

                {/* Notificaciones */}
                <button type="button" className={`navegacionInferiorItem ${seccionActiva === 'notificaciones' ? 'navegacionInferiorItem--activo' : ''}`} onClick={() => onCambiarSeccion('notificaciones')} aria-label={`Notificaciones${notificacionesPendientes > 0 ? `, ${notificacionesPendientes} sin leer` : ''}`} aria-current={seccionActiva === 'notificaciones' ? 'page' : undefined}>
                    <div className="navegacionInferiorIconoConBadge">
                        <Bell size={20} />
                        {notificacionesPendientes > 0 && <span className="navegacionInferiorBadge" />}
                    </div>
                </button>

                {/* Perfil */}
                <button type="button" className={`navegacionInferiorItem ${seccionActiva === 'perfil' ? 'navegacionInferiorItem--activo' : ''}`} onClick={() => onCambiarSeccion('perfil')} aria-label="Perfil" aria-current={seccionActiva === 'perfil' ? 'page' : undefined}>
                    <User size={20} />
                </button>
            </nav>
        </>
    );
}

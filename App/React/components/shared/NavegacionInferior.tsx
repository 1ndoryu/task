/*
 * NavegacionInferior
 * Barra de navegación fija inferior para móvil
 * Fase 10.8.1: Sistema de Navegación por Páginas
 *
 * Características:
 * - Fija en la parte inferior (position: fixed)
 * - 5 iconos sin etiquetas (minimalista)
 * - Cada botón navega a un panel específico
 * - FAB central para crear
 *
 * Estructura:
 * [📋 Tareas] [📁 Proyectos] [➕ FAB] [✅ Hábitos] [📊 Actividad]
 */

import {useState} from 'react';
import {CheckSquare, Plus, Folder, Activity, StickyNote, BarChart3, X, Target} from 'lucide-react';
import type {PaginaMovil} from '../../hooks/usePaginaMovil';

export interface NavegacionInferiorProps {
    paginaActiva: PaginaMovil;
    onCambiarPagina: (pagina: PaginaMovil) => void;
    onCrearRapido: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    visible?: boolean;
}

export function NavegacionInferior({paginaActiva, onCambiarPagina, onCrearRapido, visible = true}: NavegacionInferiorProps): JSX.Element | null {
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
                {/* Tareas/Ejecución */}
                <button type="button" className={`navegacionInferiorItem ${paginaActiva === 'ejecucion' ? 'navegacionInferiorItem--activo' : ''}`} onClick={() => onCambiarPagina('ejecucion')} aria-label="Tareas" aria-current={paginaActiva === 'ejecucion' ? 'page' : undefined}>
                    <CheckSquare size={20} />
                </button>

                {/* Proyectos */}
                <button type="button" className={`navegacionInferiorItem ${paginaActiva === 'proyectos' ? 'navegacionInferiorItem--activo' : ''}`} onClick={() => onCambiarPagina('proyectos')} aria-label="Proyectos" aria-current={paginaActiva === 'proyectos' ? 'page' : undefined}>
                    <Folder size={20} />
                </button>

                {/* FAB Central */}
                <button type="button" className={`navegacionInferiorItem navegacionInferiorFab ${menuFabAbierto ? 'navegacionInferiorFab--abierto' : ''}`} onClick={manejarClickFab} aria-label={menuFabAbierto ? 'Cerrar menú' : 'Crear nuevo'} aria-expanded={menuFabAbierto}>
                    <div className="navegacionInferiorFabCirculo">{menuFabAbierto ? <X size={18} /> : <Plus size={18} />}</div>
                </button>

                {/* Hábitos */}
                <button type="button" className={`navegacionInferiorItem ${paginaActiva === 'habitos' ? 'navegacionInferiorItem--activo' : ''}`} onClick={() => onCambiarPagina('habitos')} aria-label="Hábitos" aria-current={paginaActiva === 'habitos' ? 'page' : undefined}>
                    <Target size={20} />
                </button>

                {/* Notas */}
                <button type="button" className={`navegacionInferiorItem ${paginaActiva === 'notas' ? 'navegacionInferiorItem--activo' : ''}`} onClick={() => onCambiarPagina('notas')} aria-label="Notas" aria-current={paginaActiva === 'notas' ? 'page' : undefined}>
                    <StickyNote size={20} />
                </button>
            </nav>
        </>
    );
}

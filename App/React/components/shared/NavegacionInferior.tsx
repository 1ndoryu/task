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
import {CheckSquare, Plus, Folder, Activity, StickyNote, X, Target} from 'lucide-react';
import {Boton} from '../ui';
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
                    <Boton variante="ghost" onClick={() => manejarCrear('tarea')} aria-label="Nueva tarea" icono={<CheckSquare size={18} />} claseAdicional="navegacionInferiorMenuFabItem">
                        Tarea
                    </Boton>
                    <Boton variante="ghost" onClick={() => manejarCrear('habito')} aria-label="Nuevo hábito" icono={<Activity size={18} />} claseAdicional="navegacionInferiorMenuFabItem">
                        Hábito
                    </Boton>
                    <Boton variante="ghost" onClick={() => manejarCrear('proyecto')} aria-label="Nuevo proyecto" icono={<Folder size={18} />} claseAdicional="navegacionInferiorMenuFabItem">
                        Proyecto
                    </Boton>
                </div>
            )}

            {/* Barra de navegación */}
            <nav className="navegacionInferiorBarra" role="navigation" aria-label="Navegación principal">
                {/* [233A-6] Iconos como prop icono, no como children, para que soloIcono los muestre */}
                <Boton variante="navegacion" soloIcono activo={paginaActiva === 'ejecucion'} onClick={() => onCambiarPagina('ejecucion')} aria-label="Tareas" aria-current={paginaActiva === 'ejecucion' ? 'page' : undefined} icono={<CheckSquare size={20} />} />

                <Boton variante="navegacion" soloIcono activo={paginaActiva === 'proyectos'} onClick={() => onCambiarPagina('proyectos')} aria-label="Proyectos" aria-current={paginaActiva === 'proyectos' ? 'page' : undefined} icono={<Folder size={20} />} />

                {/* FAB Central */}
                <Boton variante="navegacion" soloIcono onClick={manejarClickFab} aria-label={menuFabAbierto ? 'Cerrar menú' : 'Crear nuevo'} aria-expanded={menuFabAbierto} claseAdicional={`navegacionInferiorFab ${menuFabAbierto ? 'navegacionInferiorFab--abierto' : ''}`} icono={<div className="navegacionInferiorFabCirculo">{menuFabAbierto ? <X size={18} /> : <Plus size={18} />}</div>} />

                <Boton variante="navegacion" soloIcono activo={paginaActiva === 'habitos'} onClick={() => onCambiarPagina('habitos')} aria-label="Hábitos" aria-current={paginaActiva === 'habitos' ? 'page' : undefined} icono={<Target size={20} />} />

                <Boton variante="navegacion" soloIcono activo={paginaActiva === 'notas'} onClick={() => onCambiarPagina('notas')} aria-label="Notas" aria-current={paginaActiva === 'notas' ? 'page' : undefined} icono={<StickyNote size={20} />} />
            </nav>
        </>
    );
}

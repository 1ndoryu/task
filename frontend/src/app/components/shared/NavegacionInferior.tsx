/*
 * NavegacionInferior
 * Barra de navegación fija inferior para móvil
 * [014A-12] Refactorizado: botones dinámicos desde navegacionMovilStore.
 * El usuario elige qué paneles aparecen aquí desde el drawer.
 * FAB central fijo para creación rápida.
 */

import {useState, useMemo} from 'react';
import {CheckSquare, Plus, Folder, Activity, StickyNote, X, Target} from 'lucide-react';
import {Boton} from '../ui';
import {useNavegacionMovilStore} from '../../stores/navegacionMovilStore';
import {obtenerPanel, paginaMovilAPanelId} from '../../config/registroPaneles';
import type {PaginaMovil} from '../../hooks/usePaginaMovil';
import type {ReactNode} from 'react';

/* [014A-12] Iconos fallback por idPagina, para paneles registrados sin icono */
const ICONOS_FALLBACK: Record<string, ReactNode> = {
    ejecucion: <CheckSquare size={20} />,
    proyectos: <Folder size={20} />,
    habitos: <Target size={20} />,
    notas: <StickyNote size={20} />,
    actividad: <Activity size={20} />
};

export interface NavegacionInferiorProps {
    paginaActiva: PaginaMovil;
    onCambiarPagina: (pagina: PaginaMovil) => void;
    onCrearRapido: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    visible?: boolean;
}

export function NavegacionInferior({paginaActiva, onCambiarPagina, onCrearRapido, visible = true}: NavegacionInferiorProps): JSX.Element | null {
    const [menuFabAbierto, setMenuFabAbierto] = useState(false);
    const botonesIds = useNavegacionMovilStore(s => s.botonesBarraInferior);

    /* [014A-12] Resuelve botones dinámicos desde el registro de paneles */
    const botones = useMemo(() => {
        return botonesIds.map(idPagina => {
            /* Resuelve idPagina → panelId usando el registro (ej: 'habitos' → 'focoPrioritario') */
            const panelId = paginaMovilAPanelId(idPagina) || idPagina;
            const panel = obtenerPanel(panelId);
            const titulo = panel?.tituloMovil || panel?.titulo || idPagina;
            const icono = ICONOS_FALLBACK[idPagina] || panel?.icono || <CheckSquare size={20} />;

            return {idPagina, titulo, icono};
        });
    }, [botonesIds]);

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

    /* [014A-12] Dividir botones: mitad izquierda antes del FAB, mitad derecha después */
    const mitad = Math.ceil(botones.length / 2);
    const botonesIzquierda = botones.slice(0, mitad);
    const botonesDerecha = botones.slice(mitad);

    return (
        <>
            {/* sentinel-disable-next-line componente-artesanal — overlay del menu FAB, parte del componente de navegacion */}
            {menuFabAbierto && <div className="navegacionInferiorOverlay" onClick={cerrarMenuFab} aria-hidden="true" />}

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

            <nav className="navegacionInferiorBarra" role="navigation" aria-label="Navegación principal">
                {botonesIzquierda.map(btn => (
                    <Boton key={btn.idPagina} variante="navegacion" soloIcono activo={paginaActiva === btn.idPagina} onClick={() => onCambiarPagina(btn.idPagina)} aria-label={btn.titulo} aria-current={paginaActiva === btn.idPagina ? 'page' : undefined} icono={btn.icono} />
                ))}

                {/* FAB Central — siempre fijo */}
                <Boton variante="navegacion" soloIcono onClick={manejarClickFab} aria-label={menuFabAbierto ? 'Cerrar menú' : 'Crear nuevo'} aria-expanded={menuFabAbierto} claseAdicional={`navegacionInferiorFab ${menuFabAbierto ? 'navegacionInferiorFab--abierto' : ''}`} icono={<div className="navegacionInferiorFabCirculo">{menuFabAbierto ? <X size={18} /> : <Plus size={18} />}</div>} />

                {botonesDerecha.map(btn => (
                    <Boton key={btn.idPagina} variante="navegacion" soloIcono activo={paginaActiva === btn.idPagina} onClick={() => onCambiarPagina(btn.idPagina)} aria-label={btn.titulo} aria-current={paginaActiva === btn.idPagina ? 'page' : undefined} icono={btn.icono} />
                ))}
            </nav>
        </>
    );
}

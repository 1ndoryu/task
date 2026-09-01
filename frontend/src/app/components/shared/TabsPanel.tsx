/*
 * components/shared/TabsPanel.tsx
 * Barra de tabs agnóstica del design system (318A-14).
 *
 * Extraído del sistema de tabs del panel de IA (antes TabsWorkspace en
 * plugins/agente/componentes.tsx) para que IA, TAREAS (grupos) y NOTAS
 * (notas) compartan UN solo componente sin duplicar markup ni estilos.
 *
 * Es un componente 100% controlado (sin store propio): recibe la lista de
 * tabs, la activa y los callbacks; el dueño (panel) decide el estado y los
 * datos. Solo navegar/seleccionar es el mínimo; renombrar (doble clic) y
 * cerrar (botón X) son opcionales y se activan pasando sus callbacks.
 *
 * Nombres de clase sin "panel" en minúscula a propósito: la regla global
 * `.dashboardPanelView [class*="panel"] { border: none !important }`
 * (dashboardPanelView.css) matchea clases que CONTIENEN "panel" en minúscula
 * (p. ej. la antigua `panelAgenteTab`, gotcha 318A-5). Con `tabCompartida`
 * el borde/fondo se ve sin necesitar `!important` ni selector duplicado.
 */

import {X} from 'lucide-react';

export interface TabPanelVisual {
    id: string;
    titulo: string;
}

interface TabsPanelProps {
    tabs: TabPanelVisual[];
    activaId: string | null;
    onActivar: (id: string) => void;
    /* Opcional: botón de cerrar por tab (solo si se pasa). */
    onCerrar?: (id: string) => void;
    /* Opcional: renombrado inline por doble clic (solo si se pasa). */
    editandoId?: string | null;
    tituloEdicion?: string;
    onIniciarRenombrado?: (id: string, titulo: string) => void;
    onCambiarTituloEdicion?: (titulo: string) => void;
    onConfirmarRenombrado?: (id: string) => void;
    onCancelarRenombrado?: () => void;
    /* Tooltip del botón cerrar (contexto: 'Cerrar conversación', 'Cerrar nota'...). */
    tituloCerrar?: string;
}

export function TabsPanel({
    tabs,
    activaId,
    onActivar,
    onCerrar,
    editandoId,
    tituloEdicion,
    onIniciarRenombrado,
    onCambiarTituloEdicion,
    onConfirmarRenombrado,
    onCancelarRenombrado,
    tituloCerrar = 'Cerrar',
}: TabsPanelProps): JSX.Element {
    return (
        <div className="tabsCompartidas">
            {tabs.map(tab => {
                const activa = tab.id === activaId;
                const editando = editandoId === tab.id;
                return (
                    <div
                        key={tab.id}
                        className={`tabCompartida ${activa ? 'tabCompartida--activa' : ''}`}
                        onClick={() => onActivar(tab.id)}
                        onDoubleClick={onIniciarRenombrado ? () => onIniciarRenombrado(tab.id, tab.titulo) : undefined}
                        title={tab.titulo}
                    >
                        {editando ? (
                            <input
                                className="tabCompartidaInput"
                                value={tituloEdicion ?? ''}
                                autoFocus
                                onChange={e => onCambiarTituloEdicion?.(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') onConfirmarRenombrado?.(tab.id);
                                    if (e.key === 'Escape') onCancelarRenombrado?.();
                                    e.stopPropagation();
                                }}
                            />
                        ) : (
                            <span className="tabCompartidaTitulo">{tab.titulo}</span>
                        )}
                        {onCerrar && (
                            <button
                                type="button"
                                className="tabCompartidaCerrar"
                                title={tituloCerrar}
                                onClick={e => {
                                    e.stopPropagation();
                                    onCerrar(tab.id);
                                }}
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

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
import {Boton} from '../ui/Boton';
import {Input} from '../ui/Input';

export interface TabPanelVisual {
    id: string;
    titulo: string;
}

/* Props divididas por responsabilidad (ISP): navegación, cierre y edición.
 * Se consumen como intersección; la forma resultante no cambia. */
interface TabsPanelNavegacion {
    tabs: TabPanelVisual[];
    activaId: string | null;
    onActivar: (id: string) => void;
    /* [P4-039A-1] Variante visual: 'tabs' (cajas con borde, defecto) o 'pills'
     * (pastillas para filtros/segmentos). Solo cambia la receta CSS. */
    variante?: 'tabs' | 'pills';
}

interface TabsPanelCierre {
    /* Opcional: botón de cerrar por tab (solo si se pasa). */
    onCerrar?: (id: string) => void;
    /* Tooltip del botón cerrar (contexto: 'Cerrar conversación', 'Cerrar nota'...). */
    tituloCerrar?: string;
}

interface TabsPanelEdicion {
    /* Opcional: renombrado inline por doble clic (solo si se pasa). */
    editandoId?: string | null;
    tituloEdicion?: string;
    onIniciarRenombrado?: (id: string, titulo: string) => void;
    onCambiarTituloEdicion?: (titulo: string) => void;
    onConfirmarRenombrado?: (id: string) => void;
    onCancelarRenombrado?: () => void;
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
    variante = 'tabs',
}: TabsPanelNavegacion & TabsPanelCierre & TabsPanelEdicion): JSX.Element {
    return (
        <div className={`tabsCompartidas ${variante === 'pills' ? 'tabsCompartidas--pills' : ''}`}>
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
                            <Input
                                tipo="text"
                                claseAdicional="tabCompartidaInput"
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
                            <Boton
                                type="button"
                                variante="icono"
                                soloIcono
                                claseAdicional="tabCompartidaCerrar"
                                title={tituloCerrar}
                                aria-label={tituloCerrar}
                                onClick={e => {
                                    e.stopPropagation();
                                    onCerrar(tab.id);
                                }}
                            >
                                <X size={10} />
                            </Boton>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

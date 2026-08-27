/*
 * SidebarMenu
 *
 * [300A-2] Barra lateral vertical con iconos de paneles para el modo sidebar.
 * [multi-panel-sidebar] Soporta multi-panel: panelesActivos resalta los que están
 * en la grilla. Click izquierdo = cambiar a 1 solo panel. Click derecho = menú
 * contextual con "Agregar a la vista" para añadir a la grilla multi-panel.
 *
 * Props:
 *  - paneles: lista de paneles con id, titulo e icono
 *  - panelActivo: ID del panel actualmente seleccionado
 *  - onSeleccionarPanel: callback al hacer click izquierdo
 *  - panelesActivos: opcional — IDs de paneles actualmente en la grilla sidebar
 *  - onAgregarPanel: opcional — callback de click derecho "Agregar a la vista"
 *  - onCrearTarea / onCrearHabito: opcionales — abren la creación rápida desde
 *    el botón "+" del header
 */

import {useState, useCallback, useEffect, useRef, Fragment, useMemo} from 'react';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {Settings, Plus, ChevronDown, ChevronRight, Folder, Crown, ClipboardList, Download, Upload, LogOut, MessageSquarePlus, Pencil} from 'lucide-react';
import type {ReactNode} from 'react';
import {Boton, Input} from '../ui';
import {MenuContextual} from '../shared';
import type {OpcionMenu} from '../shared';
import {SubmenuNuevoInline} from './SubmenuNuevoInline';

export interface PanelSidebar {
    id: PanelId;
    titulo: string;
    icono?: ReactNode;
}

interface SidebarMenuProps {
    paneles: PanelSidebar[];
    panelActivo: PanelId;
    onSeleccionarPanel: (panelId: PanelId) => void;
    /** [28-08-2026] Usuario logueado: se muestra en el footer y abre el mismo
     * menú contextual que en modo grid (EncabezadoPerfil). */
    usuario: string;
    /** Avatar del usuario (opcional): si no hay, se muestra la inicial */
    avatarUrl?: string;
    /** Versión actual de la app (se muestra como "Versión X" en el menú) */
    version: string;
    /** Suscripción para mostrar "Plan Premium" en el menú */
    suscripcion?: {plan?: string; estado?: string} | null;
    /** Sincronización con onLogout para "Cerrar Sesión" */
    sincronizacion?: {onLogout?: () => void};
    /** Abre el modal de configuración global (opción "Configuración") */
    onClickConfigUsuario?: () => void;
    /** Abre el modal de versiones */
    onClickVersion?: () => void;
    /** Abre el modal de upgrade (Plan Premium) */
    onClickPlan?: () => void;
    /** Abre el modal de feedback */
    onClickFeedback?: () => void;
    /** Exporta todos los datos (opción "Exportar datos") */
    onExportarDatos?: () => void;
    /** Importa todos los datos desde un archivo (opción "Importar datos") */
    onImportarDatos?: (archivo: File) => void;
    /** [multi-panel-sidebar] IDs de paneles activos en la grilla (opcional) */
    panelesActivos?: PanelId[];
    /** [multi-panel-sidebar] Callback para agregar panel a la grilla (click derecho) */
    onAgregarPanel?: (panelId: PanelId) => void;
    /** Abre la creación rápida de tarea desde el botón "+" del header */
    onCrearTarea?: () => void;
    /** Abre la creación rápida de hábito desde el botón "+" del header */
    onCrearHabito?: () => void;
    /** [28-08-2026] Grupos de ejecución disponibles (sección debajo de Tareas) */
    grupos?: string[];
    /** Grupo activo del panel Tareas (ejecucion) en el sidebar */
    grupoTareasActivo?: string | null;
    /** Al hacer clic en un grupo: va directo al panel Tareas con ese grupo (null = sin grupo) */
    onSeleccionarGrupo?: (grupo: string | null) => void;
    /** [28-08-2026] Agregar un grupo a la vista multi-panel (clic derecho → "Agregar a la vista") */
    onAgregarGrupoVista?: (grupo: string) => void;
    /** [28-08-2026] Renombrar un grupo desde el sidebar (clic derecho → "Cambiar nombre de grupo").
     * Debe propagarse al dueño de los datos (tareas/hábitos) como hace PanelEjecucion. */
    onRenombrarGrupo?: (grupoViejo: string, grupoNuevo: string) => void;
}

/** Anchos mínimo y máximo del sidebar al arrastrar el borde (px) */
const ANCHO_MIN = 56;
const ANCHO_MAX = 320;
/** Umbral: al soltar por debajo de este ancho, encaja en colapsado (solo iconos) */
const UMBRAL_COLAPSAR = 72;

/** Estado del menú contextual de click derecho */
interface ContextMenuState {
    abierto: boolean;
    panelId: PanelId | null;
    x: number;
    y: number;
}

/* [300A-8] Iconos SVG reemplazados por lucide-react: Plus, Settings */

export function SidebarMenu({paneles, panelActivo, onSeleccionarPanel, usuario, avatarUrl, version, suscripcion, sincronizacion, onClickConfigUsuario, onClickVersion, onClickPlan, onClickFeedback, onExportarDatos, onImportarDatos, panelesActivos, onAgregarPanel, onCrearTarea, onCrearHabito, grupos = [], grupoTareasActivo, onSeleccionarGrupo, onAgregarGrupoVista, onRenombrarGrupo}: SidebarMenuProps): JSX.Element | null {
    /* [28-08-2026] El toggle de expandir/contraer se sustituye por arrastre del
     * borde: el ancho es dinámico (px) y se persiste. "expandido" se deriva del
     * ancho (ancho > umbral), de modo que el resto del componente (título,
     * soloIcono, clase --colapsado) sigue funcionando igual. */
    const [ancho, setAncho] = useState<number>(() => {
        try {
            const guardado = Number(localStorage.getItem('glory_sidebar_ancho'));
            return Number.isFinite(guardado) && guardado >= ANCHO_MIN ? guardado : 180;
        } catch {
            return 180;
        }
    });
    const expandido = ancho > UMBRAL_COLAPSAR;

    /* [28-08-2026] Arrastre del borde derecho del sidebar: mousedown sobre el
     * handle captura el ancho inicial y el listener de mousemove en el documento
     * recalcula ancho = inicio + (clientX - inicioX), acotado. Al soltar se
     * persiste; si quedó por debajo del umbral, encaja en colapsado (56px). */
    const [arrastrando, setArrastrando] = useState(false);
    const inicioRef = useRef<{x: number; ancho: number} | null>(null);

    const comenzarArrastre = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        inicioRef.current = {x: e.clientX, ancho};
        setArrastrando(true);
    }, [ancho]);

    useEffect(() => {
        if (!arrastrando) return;
        const manejarMovimiento = (e: MouseEvent) => {
            const inicio = inicioRef.current;
            if (!inicio) return;
            const nuevoAncho = Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, inicio.ancho + (e.clientX - inicio.x)));
            setAncho(nuevoAncho);
        };
        const manejarFin = () => {
            inicioRef.current = null;
            setArrastrando(false);
            setAncho(prev => {
                const final = prev < UMBRAL_COLAPSAR ? ANCHO_MIN : prev;
                try {
                    localStorage.setItem('glory_sidebar_ancho', String(final));
                } catch {
                    /* localStorage no disponible */
                }
                return final;
            });
        };
        /* [28-08-2026] cursor/select del documento durante el arrastre para que
         * no parpadee el cursor de texto al pasar por el contenido */
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', manejarMovimiento);
        document.addEventListener('mouseup', manejarFin);
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', manejarMovimiento);
            document.removeEventListener('mouseup', manejarFin);
        };
    }, [arrastrando]);

    /* [multi-panel-sidebar] Estado del menú contextual de click derecho */
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({abierto: false, panelId: null, x: 0, y: 0});

    /* [28-08-2026] Submenu "+" del header (Tarea/Hábito), anclado al botón.
     * Se porta a body (usarPortal) porque .sidebarMenu tiene overflow:hidden y
     * recortaría el submenu si se renderizara en flujo (mismo caso que el estado
     * vacío de ListaTareas). */
    const [submenuNuevo, setSubmenuNuevo] = useState<{x: number; y: number} | null>(null);
    const botonNuevoRef = useRef<HTMLButtonElement | null>(null);

    const abrirSubmenuNuevo = useCallback(() => {
        if (botonNuevoRef.current) {
            const rect = botonNuevoRef.current.getBoundingClientRect();
            setSubmenuNuevo({x: rect.left, y: rect.bottom});
        }
    }, []);

    const cerrarSubmenuNuevo = useCallback(() => setSubmenuNuevo(null), []);

    const seleccionarSubmenuNuevo = useCallback((tipo: 'tarea' | 'habito') => {
        setSubmenuNuevo(null);
        if (tipo === 'tarea') {
            onCrearTarea?.();
        } else {
            onCrearHabito?.();
        }
    }, [onCrearTarea, onCrearHabito]);

    /* [28-08-2026] Menú de usuario del footer: mismo patrón que EncabezadoPerfil
     * en modo grid. Se abre sobre el botón de usuario (coordenadas del rect).
     * MenuContextual usa position:fixed, así que no lo recorta el overflow
     * del sidebar. */
    const [menuUsuario, setMenuUsuario] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});
    const inputArchivoRef = useRef<HTMLInputElement>(null);

    const esPremiumActivo = suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa';

    const opcionesMenuUsuario: OpcionMenu[] = [
        {id: 'configuracion', etiqueta: 'Configuración', icono: <Settings size={12} />, separadorDespues: true},
        ...(esPremiumActivo
            ? [
                  {id: 'plan', etiqueta: 'Plan Premium', icono: <Crown size={12} />},
                  {id: 'feedback', etiqueta: 'Enviar Comentarios', icono: <MessageSquarePlus size={12} />}
              ]
            : []),
        {id: 'version', etiqueta: `Versión ${version}`, icono: <ClipboardList size={12} />, separadorDespues: true},
        {id: 'exportar', etiqueta: 'Exportar datos', icono: <Download size={12} />},
        {id: 'importar', etiqueta: 'Importar datos', icono: <Upload size={12} />, separadorDespues: true},
        {id: 'logout', etiqueta: 'Cerrar Sesión', icono: <LogOut size={12} />, peligroso: true}
    ];

    const manejarClickUsuario = useCallback((evento: React.MouseEvent) => {
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        /* [28-08-2026] Anclaje al borde izquierdo del botón: el sidebar está a
         * la izquierda de la pantalla, así que rect.right - ancho daría negativo
         * y el clamp del menú lo pegaría a la esquina. Con rect.left el menú
         * aparece justo desde donde se clickeó (el clamp solo lo ajusta si no
         * cabe en pantalla). */
        setMenuUsuario({
            visible: true,
            x: rect.left,
            y: rect.bottom + 4
        });
    }, []);

    const manejarOpcionMenu = useCallback((opcionId: string) => {
        switch (opcionId) {
            case 'configuracion':
                onClickConfigUsuario?.();
                break;
            case 'version':
                onClickVersion?.();
                break;
            case 'plan':
                onClickPlan?.();
                break;
            case 'feedback':
                onClickFeedback?.();
                break;
            case 'exportar':
                onExportarDatos?.();
                break;
            case 'importar':
                inputArchivoRef.current?.click();
                break;
            case 'logout':
                /* [28-08-2026] Confirmación clásica antes de cerrar sesión */
                if (window.confirm('¿Cerrar sesión?')) {
                    sincronizacion?.onLogout?.();
                }
                break;
        }
        setMenuUsuario(prev => ({...prev, visible: false}));
    }, [onClickConfigUsuario, onClickVersion, onClickPlan, onClickFeedback, onExportarDatos, sincronizacion]);

    const manejarCambioArchivo = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = evento.target.files?.[0];
        if (archivo && onImportarDatos) {
            onImportarDatos(archivo);
            if (inputArchivoRef.current) {
                inputArchivoRef.current.value = '';
            }
        }
    }, [onImportarDatos]);

    /* [28-08-2026] Orden de los botones del menú: drag & drop con persistencia
     * en localStorage (glory_sidebar_orden_paneles). Si no hay orden guardado
     * se usa el orden por defecto de los paneles; los paneles nuevos (no
     * guardados) se añaden al final. */
    const [ordenIds, setOrdenIds] = useState<string[] | null>(() => {
        try {
            const raw = localStorage.getItem('glory_sidebar_orden_paneles');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string');
            }
        } catch {
            /* localStorage no disponible */
        }
        return null;
    });
    const [arrastrandoPanelId, setArrastrandoPanelId] = useState<string | null>(null);
    /* [28-08-2026] Zona de inserción del drag: botón destino + posición
     * (antes/después según la mitad del puntero) para pintar la línea de guía. */
    const [zonaDrop, setZonaDrop] = useState<{id: string; posicion: 'antes' | 'despues'} | null>(null);

    const panelesOrdenados = useMemo(() => {
        if (!ordenIds) return paneles;
        const porId = new Map(paneles.map(p => [p.id, p]));
        const ordenados: PanelSidebar[] = [];
        ordenIds.forEach(id => {
            const panel = porId.get(id);
            if (panel) {
                ordenados.push(panel);
                porId.delete(id);
            }
        });
        porId.forEach(panel => ordenados.push(panel));
        return ordenados;
    }, [paneles, ordenIds]);

    const guardarOrden = useCallback((ids: string[]) => {
        setOrdenIds(ids);
        try {
            localStorage.setItem('glory_sidebar_orden_paneles', JSON.stringify(ids));
        } catch {
            /* localStorage no disponible */
        }
    }, []);

    /* [28-08-2026] Drag & drop para reordenar los botones del menú. El clic
     * normal sigue seleccionando (el navegador suprime el click tras un drag
     * real); el clic derecho del menú contextual no se ve afectado. Se oculta
     * el fantasma nativo del navegador: el botón origen queda con transparencia
     * (--arrastrando) y una línea de guía marca el punto de inserción
     * (antes/después del botón destino según la mitad del puntero). */
    const iniciarArrastre = useCallback((e: React.DragEvent, panelId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', panelId);
        /* Ocultar la imagen fantasma genérica del navegador (drag nativo feo):
         * se sustituye por la transparencia del botón origen + línea de guía. */
        const lienzo = document.createElement('canvas');
        lienzo.width = lienzo.height = 1;
        e.dataTransfer.setDragImage(lienzo, 0, 0);
        setArrastrandoPanelId(panelId);
    }, []);

    const marcarDestino = useCallback((e: React.DragEvent, panelId: string) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const posicion = e.clientY < rect.top + rect.height / 2 ? 'antes' : 'despues';
        setZonaDrop({id: panelId, posicion});
    }, []);

    const soltarEn = useCallback((e: React.DragEvent, panelId: string) => {
        e.preventDefault();
        const origen = arrastrandoPanelId || e.dataTransfer.getData('text/plain');
        const posicion = zonaDrop?.id === panelId ? zonaDrop.posicion : 'antes';
        setArrastrandoPanelId(null);
        setZonaDrop(null);
        if (!origen || origen === panelId) return;
        const ids = panelesOrdenados.map(p => p.id);
        const iOrigen = ids.indexOf(origen);
        if (iOrigen === -1) return;
        ids.splice(iOrigen, 1);
        const iDestino = ids.indexOf(panelId);
        if (iDestino === -1) return;
        ids.splice(posicion === 'despues' ? iDestino + 1 : iDestino, 0, origen);
        guardarOrden(ids);
    }, [arrastrandoPanelId, zonaDrop, panelesOrdenados, guardarOrden]);

    const terminarArrastre = useCallback(() => {
        setArrastrandoPanelId(null);
        setZonaDrop(null);
    }, []);

    /* [28-08-2026] Sección de grupos minimizable/maximizable, persistida en
     * localStorage (glory_sidebar_grupos_colapsado). */
    const [gruposColapsados, setGruposColapsados] = useState<boolean>(() => {
        try {
            return localStorage.getItem('glory_sidebar_grupos_colapsado') === 'true';
        } catch {
            return false;
        }
    });

    const toggleGruposColapsados = useCallback(() => {
        setGruposColapsados(prev => {
            const nuevo = !prev;
            try {
                localStorage.setItem('glory_sidebar_grupos_colapsado', String(nuevo));
            } catch {
                /* localStorage no disponible */
            }
            return nuevo;
        });
    }, []);

    /* [28-08-2026] Menú contextual de los grupos (clic derecho): "Agregar a la
     * vista" (añade el grupo a la grilla multi-panel) y "Cambiar nombre de
     * grupo" (abre un input inline para renombrar, propagado al dueño de los
     * datos como hace PanelEjecucion). */
    const [contextMenuGrupo, setContextMenuGrupo] = useState<{abierto: boolean; grupo: string | null; x: number; y: number}>({abierto: false, grupo: null, x: 0, y: 0});
    const [renombrandoGrupo, setRenombrandoGrupo] = useState<string | null>(null);
    const [nuevoNombreGrupo, setNuevoNombreGrupo] = useState('');

    const handleContextMenuGrupo = useCallback((e: React.MouseEvent, grupo: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuGrupo({abierto: true, grupo, x: e.clientX, y: e.clientY});
    }, []);

    const opcionesContextualGrupo: OpcionMenu[] = [
        {id: 'agregar-vista', etiqueta: 'Agregar a la vista', icono: <Plus size={14} />},
        {id: 'renombrar', etiqueta: 'Cambiar nombre de grupo', icono: <Pencil size={14} />}
    ];

    const handleSeleccionContextualGrupo = useCallback((opcionId: string) => {
        const grupo = contextMenuGrupo.grupo;
        if (opcionId === 'agregar-vista' && grupo) {
            onAgregarGrupoVista?.(grupo);
        } else if (opcionId === 'renombrar' && grupo) {
            setNuevoNombreGrupo(grupo);
            setRenombrandoGrupo(grupo);
        }
        setContextMenuGrupo(prev => ({...prev, abierto: false}));
    }, [contextMenuGrupo.grupo, onAgregarGrupoVista]);

    const confirmarRenombrarGrupo = useCallback(() => {
        const nombre = nuevoNombreGrupo.trim();
        const viejo = renombrandoGrupo;
        if (viejo && nombre && nombre !== viejo) {
            onRenombrarGrupo?.(viejo, nombre);
        }
        setRenombrandoGrupo(null);
        setNuevoNombreGrupo('');
    }, [nuevoNombreGrupo, renombrandoGrupo, onRenombrarGrupo]);

    const cancelarRenombrarGrupo = useCallback(() => {
        setRenombrandoGrupo(null);
        setNuevoNombreGrupo('');
    }, []);

    /* Handler de click derecho en un botón del menú */
    const handleContextMenu = useCallback((e: React.MouseEvent, panelId: PanelId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            abierto: true,
            panelId,
            x: e.clientX,
            y: e.clientY
        });
    }, []);

    /* Handler de selección del MenuContextual */
    const handleSeleccionContextual = useCallback((opcionId: string) => {
        if (opcionId === 'agregar-vista' && contextMenu.panelId && onAgregarPanel) {
            onAgregarPanel(contextMenu.panelId);
        }
        setContextMenu(prev => ({...prev, abierto: false}));
    }, [contextMenu.panelId, onAgregarPanel]);

    const opcionesContextual: OpcionMenu[] = [
        {
            id: 'agregar-vista',
            etiqueta: 'Agregar a la vista',
            icono: <Plus size={14} />
        }
    ];

    if (paneles.length === 0) return null;

    return (
        <nav
            className={`sidebarMenu ${expandido ? 'sidebarMenu--expandido' : 'sidebarMenu--colapsado'} ${arrastrando ? 'sidebarMenu--arrastrando' : ''}`}
            aria-label="Menú de paneles"
            style={{/* sentinel-disable inline-style-prohibido */ width: `${ancho}px`}}
        >
            {/* [multi-panel-sidebar] Menú contextual con MenuContextual */}
            {contextMenu.abierto && contextMenu.panelId && (
                <MenuContextual
                    opciones={opcionesContextual}
                    posicionX={contextMenu.x}
                    posicionY={contextMenu.y}
                    onSeleccionar={handleSeleccionContextual}
                    onCerrar={() => setContextMenu(prev => ({...prev, abierto: false}))}
                />
            )}
            {/* [28-08-2026] Menú contextual de los grupos (clic derecho): agregar
             * a la vista o cambiar nombre de grupo. */}
            {contextMenuGrupo.abierto && contextMenuGrupo.grupo && (
                <MenuContextual
                    opciones={opcionesContextualGrupo}
                    posicionX={contextMenuGrupo.x}
                    posicionY={contextMenuGrupo.y}
                    onSeleccionar={handleSeleccionContextualGrupo}
                    onCerrar={() => setContextMenuGrupo(prev => ({...prev, abierto: false}))}
                />
            )}
            {/* [28-08-2026] Header: nombre de app + botón "+" para crear
             * Tarea/Hábito. Se retira el toggle de expandir/contraer: ahora el
             * tamaño se ajusta arrastrando el borde derecho del sidebar. */}
            <div className="sidebarMenuHeader">
                {expandido && <span className="sidebarMenuHeaderTitulo">Catask</span>}
                <Boton
                    ref={botonNuevoRef}
                    variante="ghost"
                    soloIcono
                    claseAdicional="sidebarMenuNuevoBoton"
                    onClick={abrirSubmenuNuevo}
                    icono={<Plus size={18} />}
                    title="Nueva tarea o hábito"
                />
            </div>

            {/* [28-08-2026] Submenu Tarea/Hábito anclado al botón "+" del header
             * (portado a body, ver abrirSubmenuNuevo) */}
            {submenuNuevo && (
                <SubmenuNuevoInline
                    direccion="abajo"
                    claseAdicional="submenuNuevoInline--fijado"
                    estiloPosicion={{left: submenuNuevo.x, top: submenuNuevo.y}}
                    usarPortal={true}
                    onSeleccionar={seleccionarSubmenuNuevo}
                    onCerrar={cerrarSubmenuNuevo}
                />
            )}

            <div className="sidebarMenuItems">
                {panelesOrdenados.map(panel => {
                    /* [multi-panel-sidebar] En modo multi-panel, un panel puede estar activo
                     * en la grilla aunque no sea el panelActivo (foco actual) */
                    const enGrilla = panelesActivos?.includes(panel.id);
                    return (
                        <Fragment key={panel.id}>
                            <div className={`sidebarMenuFilaBoton ${panel.id === 'ejecucion' && expandido && grupos.length > 0 ? 'sidebarMenuFilaBoton--conGrupos' : ''}`}>
                                <Boton
                                    draggable={expandido}
                                    onDragStart={(e) => iniciarArrastre(e, panel.id)}
                                    onDragOver={(e) => marcarDestino(e, panel.id)}
                                    onDrop={(e) => soltarEn(e, panel.id)}
                                    onDragEnd={terminarArrastre}
                                    variante="ghost"
                                    soloIcono={!expandido}
                                    claseAdicional={`sidebarMenuBoton ${panelActivo === panel.id ? 'sidebarMenuBoton--activo' : ''} ${enGrilla ? 'sidebarMenuBoton--enGrilla' : ''} ${arrastrandoPanelId === panel.id ? 'sidebarMenuBoton--arrastrando' : ''} ${zonaDrop?.id === panel.id ? (zonaDrop.posicion === 'antes' ? 'sidebarMenuBoton--guiaAntes' : 'sidebarMenuBoton--guiaDespues') : ''}`}
                                    onClick={() => onSeleccionarPanel(panel.id)}
                                    onContextMenu={(e) => handleContextMenu(e, panel.id)}
                                    title={panel.titulo}
                                    icono={panel.icono}
                                >
                                    {panel.titulo}
                                </Boton>
                                {/* [28-08-2026] Flecha de minimizar/maximizar los
                                 * grupos: al lado del botón Tareas (en su fila, sin
                                 * separador). Solo con grupos existentes y sidebar
                                 * expandido. */}
                                {panel.id === 'ejecucion' && expandido && grupos.length > 0 && (
                                    <button
                                        type="button"
                                        className="sidebarMenuGruposToggle"
                                        onClick={toggleGruposColapsados}
                                        onDragOver={(e) => marcarDestino(e, panel.id)}
                                        onDrop={(e) => soltarEn(e, panel.id)}
                                        title={gruposColapsados ? 'Mostrar grupos' : 'Minimizar grupos'}
                                    >
                                        {gruposColapsados ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                )}
                            </div>
                            {/* [28-08-2026] Lista de grupos debajo del botón Tareas:
                             * clic en un grupo → onSeleccionarGrupo (va directo a ese
                             * grupo). Solo con el sidebar expandido y sin minimizar. */}
                            {panel.id === 'ejecucion' && expandido && grupos.length > 0 && !gruposColapsados && (
                                <div className="sidebarMenuGruposLista">
                                    {grupos.map(grupo => (
                                        renombrandoGrupo === grupo ? (
                                            /* [28-08-2026] Renombrar solo con teclado (Enter acepta,
                                             * Escape cancela, sin botones) manteniendo el icono de
                                             * carpeta del grupo para no perder el contexto visual. */
                                            <div key={grupo} className="sidebarMenuGrupoRenombrar">
                                                <Folder size={12} className="sidebarMenuGrupoRenombrarIcono" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={nuevoNombreGrupo}
                                                    onChange={e => setNuevoNombreGrupo(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            confirmarRenombrarGrupo();
                                                        }
                                                        if (e.key === 'Escape') {
                                                            e.stopPropagation();
                                                            cancelarRenombrarGrupo();
                                                        }
                                                    }}
                                                    placeholder="Nuevo nombre"
                                                    className="selectorGrupoInput"
                                                />
                                            </div>
                                        ) : (
                                            <Boton
                                                key={grupo}
                                                variante="ghost"
                                                claseAdicional={`sidebarMenuBoton sidebarMenuGrupoBoton ${grupoTareasActivo === grupo ? 'sidebarMenuBoton--activo sidebarMenuGrupoBoton--activo' : ''}`}
                                                onClick={() => onSeleccionarGrupo?.(grupo)}
                                                onContextMenu={(e) => handleContextMenuGrupo(e, grupo)}
                                                icono={<Folder size={12} />}
                                                title={`${grupo} (clic derecho: opciones)`}
                                            >
                                                {grupo}
                                            </Boton>
                                        )
                                    ))}
                                </div>
                            )}
                        </Fragment>
                    );
                })}
            </div>
            {/* [28-08-2026] Footer: botón de usuario (nombre/avatar) que abre el
             * mismo menú contextual que en modo grid. En colapsado solo se
             * muestra el avatar (soloIcono). */}
            <div className="sidebarMenuFooter">
                <Boton
                    variante="ghost"
                    soloIcono={!expandido}
                    claseAdicional="sidebarMenuBoton sidebarMenuUsuarioBoton"
                    onClick={manejarClickUsuario}
                    title="Opciones de usuario"
                    icono={
                        avatarUrl ? (
                            <img src={avatarUrl} alt="" className="sidebarMenuAvatar" />
                        ) : (
                            <span className="sidebarMenuAvatarInicial">{usuario.charAt(0).toUpperCase()}</span>
                        )
                    }
                >
                    {usuario}
                </Boton>

                {menuUsuario.visible && (
                    <MenuContextual
                        opciones={opcionesMenuUsuario}
                        posicionX={menuUsuario.x}
                        posicionY={menuUsuario.y}
                        onSeleccionar={manejarOpcionMenu}
                        onCerrar={() => setMenuUsuario(prev => ({...prev, visible: false}))}
                    />
                )}

                {/* [28-08-2026] Input de archivo oculto para "Importar datos"
                 * (mismo patrón que EncabezadoPerfil en grid) */}
                <div className="inputOculto">
                    <Input ref={inputArchivoRef} tipo="file" accept=".json" onChange={manejarCambioArchivo} />
                </div>
            </div>
            {/* [28-08-2026] Handle de resize: franja vertical en el borde derecho
             * del sidebar. Con mousedown comienza el arrastre (ver state ancho). */}
            <div
                className="sidebarMenuResizeHandle"
                onMouseDown={comenzarArrastre}
                title="Arrastrar para cambiar el tamaño"
            />
        </nav>
    );
}
/*
 * SidebarMenu
 *
 * [300A-2] Barra lateral vertical con iconos de paneles para el modo sidebar.
 * [multi-panel-sidebar] Soporta multi-panel: panelesActivos resalta los que
 * están en la grilla. Click izquierdo = cambiar a 1 solo panel. Click derecho
 * = menú contextual con "Agregar a la vista".
 *
 * La lógica de estado vive en módulos de hooks separados (orden, ancho,
 * submenús, menú de usuario, menús contextuales y grupos), cada uno bajo el
 * límite de useState, y el render de la lista de grupos en GruposLista.tsx,
 * para mantener este archivo bajo el límite de líneas.
 */

import {useCallback, Fragment} from 'react';
import type {ReactNode} from 'react';
import {Plus, ChevronDown, ChevronRight} from 'lucide-react';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {Boton, Input} from '../ui';
import {MenuContextual} from '../shared';
import {SubmenuNuevoInline} from './SubmenuNuevoInline';
import {useOrdenPaneles} from './useOrdenPaneles';
import {useAnchoSidebar, useGruposColapsados} from './useAnchoSidebar';
import {useSubmenuNuevo, useMenuUsuario, useContextMenuPanel} from './sidebarMenus';
import {useContextMenuGrupo} from './sidebarMenuGrupos';
import {GruposLista} from './GruposLista';

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
    /** [28-08-2026] Renombrar un grupo en el sidebar (se propaga al dueño de los datos). */
    onRenombrarGrupo?: (grupoViejo: string, grupoNuevo: string) => void;
}

export function SidebarMenu({
    paneles,
    panelActivo,
    onSeleccionarPanel,
    onAgregarPanel,
    panelesActivos,
    onCrearTarea,
    onCrearHabito,
    grupos = [],
    grupoTareasActivo,
    onSeleccionarGrupo,
    onAgregarGrupoVista,
    onRenombrarGrupo,
    ...usuarioProps
}: SidebarMenuProps): JSX.Element | null {
    const {ancho, arrastrando, comenzarArrastre, expandido} = useAnchoSidebar();

    const {
        arrastrandoPanelId,
        zonaDrop,
        panelesOrdenados,
        iniciarArrastre,
        marcarDestino,
        soltarEn,
        terminarArrastre
    } = useOrdenPaneles(paneles);

    const {submenuNuevo, botonNuevoRef, abrirSubmenuNuevo, cerrarSubmenuNuevo} = useSubmenuNuevo();

    const {
        menuUsuario,
        inputArchivoRef,
        opcionesMenuUsuario,
        usuariosInicial,
        avatarUrl,
        manejarClickUsuario,
        manejarOpcionMenu,
        manejarCambioArchivo,
        cerrarMenuUsuario
    } = useMenuUsuario(usuarioProps);

    const {gruposColapsados, toggleGruposColapsados} = useGruposColapsados();

    const {
        contextMenuGrupo,
        renombrandoGrupo,
        nuevoNombreGrupo,
        opcionesContextualGrupo,
        handleContextMenuGrupo,
        handleSeleccionContextualGrupo,
        confirmarRenombrarGrupo,
        cancelarRenombrarGrupo,
        setNuevoNombreGrupo,
        setContextMenuGrupo
    } = useContextMenuGrupo(onAgregarGrupoVista, onRenombrarGrupo);

    const {
        contextMenu,
        handleContextMenu,
        handleSeleccionContextual,
        cerrarContextMenu,
        opcionesContextual
    } = useContextMenuPanel(onAgregarPanel);

    const seleccionarSubmenuNuevo = useCallback(
        (tipo: 'tarea' | 'habito') => {
            cerrarSubmenuNuevo();
            if (tipo === 'tarea') {
                onCrearTarea?.();
            } else {
                onCrearHabito?.();
            }
        },
        [cerrarSubmenuNuevo, onCrearTarea, onCrearHabito]
    );

    if (paneles.length === 0) return null;

    return (
        <nav
            className={`sidebarMenu ${expandido ? 'sidebarMenu--expandido' : 'sidebarMenu--colapsado'} ${arrastrando ? 'sidebarMenu--arrastrando' : ''}`}
            aria-label="Menú de paneles"
            style={{/* sentinel-disable inline-style-prohibido */ width: `${ancho}px`}}
        >
            {contextMenu.abierto && contextMenu.panelId && (
                <MenuContextual
                    opciones={opcionesContextual}
                    posicionX={contextMenu.x}
                    posicionY={contextMenu.y}
                    onSeleccionar={handleSeleccionContextual}
                    onCerrar={cerrarContextMenu}
                />
            )}
            {contextMenuGrupo.abierto && contextMenuGrupo.grupo && (
                <MenuContextual
                    opciones={opcionesContextualGrupo}
                    posicionX={contextMenuGrupo.x}
                    posicionY={contextMenuGrupo.y}
                    onSeleccionar={handleSeleccionContextualGrupo}
                    onCerrar={() => setContextMenuGrupo(prev => ({...prev, abierto: false}))}
                />
            )}

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
                    const enGrilla = panelesActivos?.includes(panel.id);
                    const conGrupos = panel.id === 'ejecucion' && expandido && grupos.length > 0;
                    return (
                        <Fragment key={panel.id}>
                            <div className={`sidebarMenuFilaBoton ${conGrupos ? 'sidebarMenuFilaBoton--conGrupos' : ''}`}>
                                <Boton
                                    draggable={expandido}
                                    onDragStart={e => iniciarArrastre(e, panel.id)}
                                    onDragOver={e => marcarDestino(e, panel.id)}
                                    onDrop={e => soltarEn(e, panel.id)}
                                    onDragEnd={terminarArrastre}
                                    variante="ghost"
                                      soloIcono={!expandido}
                                    claseAdicional={`sidebarMenuBoton ${panelActivo === panel.id ? 'sidebarMenuBoton--activo' : ''} ${enGrilla ? 'sidebarMenuBoton--enGrilla' : ''} ${arrastrandoPanelId === panel.id ? 'sidebarMenuBoton--arrastrando' : ''} ${zonaDrop && zonaDrop.id === panel.id ? (zonaDrop.posicion === 'antes' ? 'sidebarMenuBoton--guiaAntes' : 'sidebarMenuBoton--guiaDespues') : ''}`}
                                    onClick={() => onSeleccionarPanel(panel.id)}
                                    onContextMenu={e => handleContextMenu(e, panel.id)}
                                    title={panel.titulo}
                                    icono={panel.icono}
                                >
                                    {panel.titulo}
                                </Boton>
                                {conGrupos && (
                                    <button
                                        type="button"
                                        className="sidebarMenuGruposToggle"
                                        onClick={toggleGruposColapsados}
                                        onDragOver={e => marcarDestino(e, panel.id)}
                                        onDrop={e => soltarEn(e, panel.id)}
                                        title={gruposColapsados ? 'Mostrar grupos' : 'Minimizar grupos'}
                                    >
                                        {gruposColapsados ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                )}
                            </div>
                            {conGrupos && !gruposColapsados && (
                                <GruposLista
                                    grupos={grupos}
                                    grupoTareasActivo={grupoTareasActivo}
                                    renombrandoGrupo={renombrandoGrupo}
                                    nuevoNombreGrupo={nuevoNombreGrupo}
                                    onSeleccionarGrupo={onSeleccionarGrupo}
                                    onContextMenuGrupo={handleContextMenuGrupo}
                                    onCambiarNombre={setNuevoNombreGrupo}
                                    onConfirmarRenombrar={confirmarRenombrarGrupo}
                                    onCancelarRenombrar={cancelarRenombrarGrupo}
                                />
                            )}
                        </Fragment>
                    );
                })}
            </div>

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
                            <span className="sidebarMenuAvatarInicial">{usuariosInicial}</span>
                        )
                    }
                >
                    {usuarioProps.usuario}
                </Boton>

                {menuUsuario.visible && (
                    <MenuContextual
                        opciones={opcionesMenuUsuario}
                        posicionX={menuUsuario.x}
                        posicionY={menuUsuario.y}
                        onSeleccionar={manejarOpcionMenu}
                        onCerrar={cerrarMenuUsuario}
                    />
                )}

                <div className="inputOculto">
                    <Input ref={inputArchivoRef} tipo="file" accept=".json" onChange={manejarCambioArchivo} />
                </div>
            </div>

            <div
                className="sidebarMenuResizeHandle"
                onMouseDown={comenzarArrastre}
                title="Arrastrar para cambiar el tamaño"
            />
        </nav>
    );
}
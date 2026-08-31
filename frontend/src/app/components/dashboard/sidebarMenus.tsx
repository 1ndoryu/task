/*
 * useMenuUsuario / useSubmenuNuevo / useContextMenuPanel
 *
 * [300A-3] Menús y submenús del sidebar, sin exceder el límite de useState por
 * archivo: el menú de usuario del footer (mismo patrón que EncabezadoPerfil en
 * modo grid), el submenú "+" del header (Tarea/Hábito) y el menú contextual de
 * click derecho de los paneles ("Agregar a la vista").
 */
import {useState, useCallback, useRef} from 'react';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import type {OpcionMenu} from '../shared';
import {Settings, Plus, Crown, ClipboardList, Download, Upload, LogOut, MessageSquarePlus} from 'lucide-react';
import type {UsuarioSidebar, ContextMenuState} from './sidebarShared';

export function useMenuUsuario(props: UsuarioSidebar) {
    const {usuario, avatarUrl, version, suscripcion, sincronizacion, onClickConfigUsuario, onClickVersion, onClickPlan, onClickFeedback, onExportarDatos, onImportarDatos} = props;
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
        /* Anclaje al borde izquierdo: el sidebar está a la izquierda de la pantalla. */
        setMenuUsuario({visible: true, x: rect.left, y: rect.bottom + 4});
    }, []);

    const manejarOpcionMenu = useCallback((opcionId: string) => {
        switch (opcionId) {
            case 'configuracion': onClickConfigUsuario?.(); break;
            case 'version': onClickVersion?.(); break;
            case 'plan': onClickPlan?.(); break;
            case 'feedback': onClickFeedback?.(); break;
            case 'exportar': onExportarDatos?.(); break;
            case 'importar': inputArchivoRef.current?.click(); break;
            case 'logout': if (window.confirm('¿Cerrar sesión?')) sincronizacion?.onLogout?.(); break;
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

    const cerrarMenuUsuario = useCallback(() => setMenuUsuario(prev => ({...prev, visible: false})), []);

    return {menuUsuario, inputArchivoRef, esPremiumActivo, opcionesMenuUsuario, usuariosInicial: usuario.charAt(0).toUpperCase(), avatarUrl, manejarClickUsuario, manejarOpcionMenu, manejarCambioArchivo, cerrarMenuUsuario};
}

export function useSubmenuNuevo() {
    const [submenuNuevo, setSubmenuNuevo] = useState<{x: number; y: number} | null>(null);
    const botonNuevoRef = useRef<HTMLButtonElement | null>(null);

    const abrirSubmenuNuevo = useCallback(() => {
        if (botonNuevoRef.current) {
            const rect = botonNuevoRef.current.getBoundingClientRect();
            setSubmenuNuevo({x: rect.left, y: rect.bottom});
        }
    }, []);
    const cerrarSubmenuNuevo = useCallback(() => setSubmenuNuevo(null), []);
    return {submenuNuevo, botonNuevoRef, abrirSubmenuNuevo, cerrarSubmenuNuevo};
}

export function useContextMenuPanel(onAgregarPanel?: (panelId: PanelId) => void) {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({abierto: false, panelId: null, x: 0, y: 0});

    const handleContextMenu = useCallback((e: React.MouseEvent, panelId: PanelId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({abierto: true, panelId, x: e.clientX, y: e.clientY});
    }, []);

    const handleSeleccionContextual = useCallback((opcionId: string) => {
        if (opcionId === 'agregar-vista' && contextMenu.panelId && onAgregarPanel) {
            onAgregarPanel(contextMenu.panelId);
        }
        setContextMenu(prev => ({...prev, abierto: false}));
    }, [contextMenu.panelId, onAgregarPanel]);

    const cerrarContextMenu = useCallback(() => setContextMenu(prev => ({...prev, abierto: false})), []);

    const opcionesContextual: OpcionMenu[] = [{id: 'agregar-vista', etiqueta: 'Agregar a la vista', icono: <Plus size={14} />}];

    return {contextMenu, handleContextMenu, handleSeleccionContextual, cerrarContextMenu, opcionesContextual};
}
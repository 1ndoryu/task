import {useState, useRef} from 'react';
import {User, Settings, Shield, Database, Palette, Plug, Crown, ClipboardList, Download, Upload, LogOut} from 'lucide-react';
import {MenuContextual} from '../../shared';
import type {InfoSuscripcion} from '../../../types/dashboard';

interface SincronizacionInfo {
    onLogout?: () => void;
}

interface EncabezadoPerfilProps {
    usuario: string;
    version: string;
    avatarUrl?: string;
    suscripcion?: InfoSuscripcion | null;
    estaConectado: boolean;
    esTablet: boolean;
    sincronizacion?: SincronizacionInfo;

    onClickUsuario?: () => void;
    onClickSeguridad?: () => void;
    onClickBackups?: () => void;
    onClickConfigUsuario?: () => void;
    onClickVersion?: () => void;
    onClickPlan?: () => void;
    onClickTemas?: () => void;
    onClickConfigMCP?: () => void;
    onExportarDatos?: () => void;
    onImportarDatos?: (archivo: File) => void;
}

export function EncabezadoPerfil({usuario, version, avatarUrl, suscripcion, estaConectado, esTablet, sincronizacion, onClickUsuario, onClickSeguridad, onClickBackups, onClickConfigUsuario, onClickVersion, onClickPlan, onClickTemas, onClickConfigMCP, onExportarDatos, onImportarDatos}: EncabezadoPerfilProps) {
    const [menuUsuario, setMenuUsuario] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});
    const inputArchivoRef = useRef<HTMLInputElement>(null);

    const esPremiumActivo = suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa';

    /* Opciones del menu contextual del usuario */
    const opcionesMenuUsuario = [{id: 'perfil', etiqueta: 'Mi Perfil', icono: <User size={12} />}, {id: 'configuracion', etiqueta: 'Configuración', icono: <Settings size={12} />}, {id: 'seguridad', etiqueta: 'Seguridad', icono: <Shield size={12} />}, {id: 'backups', etiqueta: 'Copias de Seguridad', icono: <Database size={12} />}, {id: 'temas', etiqueta: 'Temas', icono: <Palette size={12} />}, {id: 'mcp', etiqueta: 'Conectar con IA', icono: <Plug size={12} />}, ...(esPremiumActivo ? [{id: 'plan', etiqueta: 'Plan Premium', icono: <Crown size={12} />}] : []), {id: 'version', etiqueta: `Versión ${version}`, icono: <ClipboardList size={12} />, separadorDespues: true}, {id: 'exportar', etiqueta: 'Exportar datos', icono: <Download size={12} />}, {id: 'importar', etiqueta: 'Importar datos', icono: <Upload size={12} />, separadorDespues: true}, {id: 'logout', etiqueta: 'Cerrar Sesión', icono: <LogOut size={12} />, peligroso: true}];

    const manejarClickUsuario = (evento: React.MouseEvent) => {
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuUsuario({
            visible: true,
            x: rect.right - 160,
            y: rect.bottom + 4
        });
    };

    const manejarOpcionMenu = (opcionId: string) => {
        switch (opcionId) {
            case 'perfil':
                onClickUsuario?.();
                break;
            case 'seguridad':
                onClickSeguridad?.();
                break;
            case 'backups':
                onClickBackups?.();
                break;
            case 'configuracion':
                onClickConfigUsuario?.();
                break;
            case 'version':
                onClickVersion?.();
                break;
            case 'plan':
                onClickPlan?.();
                break;
            case 'temas':
                onClickTemas?.();
                break;
            case 'mcp':
                onClickConfigMCP?.();
                break;
            case 'exportar':
                onExportarDatos?.();
                break;
            case 'importar':
                inputArchivoRef.current?.click();
                break;
            case 'logout':
                sincronizacion?.onLogout?.();
                break;
        }
        setMenuUsuario({...menuUsuario, visible: false});
    };

    const manejarCambioArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = evento.target.files?.[0];
        if (archivo && onImportarDatos) {
            onImportarDatos(archivo);
            if (inputArchivoRef.current) {
                inputArchivoRef.current.value = '';
            }
        }
    };

    if (!estaConectado) return null;

    return (
        <>
            <button type="button" className="badgeEncabezado badgeEncabezado--usuario" onClick={manejarClickUsuario} title={esTablet ? undefined : 'Opciones de usuario'}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="avatarEncabezado" /> : <span className="avatarEncabezadoInicial">{usuario.charAt(0).toUpperCase()}</span>}
                <span className="nombreUsuarioEncabezado">{usuario}</span>
            </button>

            {menuUsuario.visible && <MenuContextual opciones={opcionesMenuUsuario} posicionX={menuUsuario.x} posicionY={menuUsuario.y} onSeleccionar={manejarOpcionMenu} onCerrar={() => setMenuUsuario({...menuUsuario, visible: false})} />}

            <input ref={inputArchivoRef} type="file" accept=".json" onChange={manejarCambioArchivo} style={{display: 'none'}} />
        </>
    );
}

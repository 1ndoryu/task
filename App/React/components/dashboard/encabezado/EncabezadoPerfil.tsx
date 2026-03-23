import {useState, useRef} from 'react';
import {Settings, Crown, ClipboardList, Download, Upload, LogOut, MessageSquarePlus} from 'lucide-react';
import {MenuContextual} from '../../shared';
import {Boton} from '../../ui/Boton';
import {Input} from '../../ui/Input';
import type {InfoSuscripcion, SincronizacionInfo} from '../../../types/dashboard';

/* [233A-43] Props simplificadas: perfil, seguridad, backups, temas, mcp, plugins
 * ahora están en el modal de configuración global, no en el menú contextual */
interface EncabezadoPerfilProps {
    usuario: string;
    version: string;
    avatarUrl?: string;
    suscripcion?: InfoSuscripcion | null;
    estaConectado: boolean;
    esTablet: boolean;
    sincronizacion?: SincronizacionInfo;

    onClickConfigUsuario?: () => void;
    onClickVersion?: () => void;
    onClickPlan?: () => void;
    onClickFeedback?: () => void;
    onExportarDatos?: () => void;
    onImportarDatos?: (archivo: File) => void;
}

export function EncabezadoPerfil({usuario, version, avatarUrl, suscripcion, estaConectado, esTablet, sincronizacion, onClickConfigUsuario, onClickVersion, onClickPlan, onClickFeedback, onExportarDatos, onImportarDatos}: EncabezadoPerfilProps) {
    const [menuUsuario, setMenuUsuario] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});
    const inputArchivoRef = useRef<HTMLInputElement>(null);

    const esPremiumActivo = suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa';

    /* [233A-43] Solo opciones que NO están en el modal de configuración global */
    const opcionesMenuUsuario = [
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
            <Boton type="button" claseAdicional="badgeEncabezado badgeEncabezado--usuario" onClick={manejarClickUsuario} title={esTablet ? undefined : 'Opciones de usuario'}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="avatarEncabezado" /> : <span className="avatarEncabezadoInicial">{usuario.charAt(0).toUpperCase()}</span>}
                <span className="nombreUsuarioEncabezado">{usuario}</span>
            </Boton>

            {menuUsuario.visible && <MenuContextual opciones={opcionesMenuUsuario} posicionX={menuUsuario.x} posicionY={menuUsuario.y} onSeleccionar={manejarOpcionMenu} onCerrar={() => setMenuUsuario({...menuUsuario, visible: false})} />}

            <div style={{display: 'none'}}>
                <Input ref={inputArchivoRef} tipo="file" accept=".json" onChange={manejarCambioArchivo} />
            </div>
        </>
    );
}

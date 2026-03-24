/* [233A-27] Modal de Configuración Global
 * Centraliza todas las configuraciones del dashboard en un modal con sidebar.
 * Cada sección usa sus propios hooks — no depende de props del padre.
 * [233A-54] En móvil se renderiza como BottomSheet con dos fases:
 *   1. Lista de secciones como botones (BottomSheet compacto)
 *   2. Al seleccionar sección, expande a 80% mostrando el contenido con botón volver */

import {useState, useEffect} from 'react';
import {ListTodo, Target, Folder, FileText, Activity, Layout, User, Settings, Palette, Shield, Plug, Database, ChevronLeft, Puzzle} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {BottomSheet} from '../shared/BottomSheet';
import {Boton} from '../ui';
import {useEsMovil} from '../../hooks/useEsMovil';
import type {SeccionConfigGlobal} from '../../hooks/useModalesDashboard';

/* Secciones de paneles */
import {SeccionConfigTareas, SeccionConfigHabitos, SeccionConfigProyectos, SeccionConfigScratchpad, SeccionConfigActividad} from './global/SeccionesConfigPaneles';
/* Secciones generales */
import {SeccionConfigLayout, SeccionConfigPreferencias, SeccionConfigTemas, SeccionConfigPerfil, SeccionConfigSeguridad, SeccionConfigMCP, SeccionConfigBackups} from './global/SeccionesConfigGeneral';
import {SeccionConfigPlugins} from './global/SeccionConfigPlugins';

/* Definición de secciones para sidebar */
interface ItemSidebar {
    id: SeccionConfigGlobal;
    nombre: string;
    icono: JSX.Element;
    grupo: string;
}

const SECCIONES_SIDEBAR: ItemSidebar[] = [
    /* Grupo: Paneles */
    {id: 'tareas', nombre: 'Tareas', icono: <ListTodo size={14} />, grupo: 'Paneles'},
    {id: 'habitos', nombre: 'Hábitos', icono: <Target size={14} />, grupo: 'Paneles'},
    {id: 'proyectos', nombre: 'Proyectos', icono: <Folder size={14} />, grupo: 'Paneles'},
    {id: 'notas', nombre: 'Notas', icono: <FileText size={14} />, grupo: 'Paneles'},
    {id: 'actividad', nombre: 'Actividad', icono: <Activity size={14} />, grupo: 'Paneles'},
    /* Grupo: Apariencia */
    {id: 'layout', nombre: 'Layout', icono: <Layout size={14} />, grupo: 'Apariencia'},
    {id: 'temas', nombre: 'Temas', icono: <Palette size={14} />, grupo: 'Apariencia'},
    /* Grupo: Cuenta */
    {id: 'perfil', nombre: 'Perfil', icono: <User size={14} />, grupo: 'Cuenta'},
    {id: 'preferencias', nombre: 'Preferencias', icono: <Settings size={14} />, grupo: 'Cuenta'},
    /* Grupo: Avanzado */
    {id: 'seguridad', nombre: 'Seguridad', icono: <Shield size={14} />, grupo: 'Avanzado'},
    {id: 'ia', nombre: 'Conectar IA', icono: <Plug size={14} />, grupo: 'Avanzado'},
    {id: 'plugins', nombre: 'Plugins', icono: <Puzzle size={14} />, grupo: 'Avanzado'},
    {id: 'backups', nombre: 'Copias', icono: <Database size={14} />, grupo: 'Avanzado'}
];

/* Obtener grupos únicos en orden */
const GRUPOS = [...new Set(SECCIONES_SIDEBAR.map(s => s.grupo))];

/* Título visible para cada sección */
const TITULOS_SECCION: Record<SeccionConfigGlobal, string> = {
    tareas: 'Configuración de Tareas',
    habitos: 'Configuración de Hábitos',
    proyectos: 'Configuración de Proyectos',
    notas: 'Configuración de Notas',
    actividad: 'Configuración de Actividad',
    layout: 'Configuración de Layout',
    perfil: 'Mi Perfil',
    preferencias: 'Preferencias de Usuario',
    temas: 'Tema Visual',
    seguridad: 'Seguridad y Privacidad',
    ia: 'Conectar con IA',
    backups: 'Copias de Seguridad',
    plugins: 'Plugins'
};

interface ModalConfiguracionGlobalProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    seccionInicial: SeccionConfigGlobal;
    onAbrirUpgrade?: () => void;
}

/* Renderiza el contenido de la sección activa */
function ContenidoSeccion({seccion, onCerrar, onAbrirUpgrade}: {seccion: SeccionConfigGlobal; onCerrar: () => void; onAbrirUpgrade?: () => void}): JSX.Element {
    return (
        <>
            {seccion === 'tareas' && <SeccionConfigTareas />}
            {seccion === 'habitos' && <SeccionConfigHabitos />}
            {seccion === 'proyectos' && <SeccionConfigProyectos />}
            {seccion === 'notas' && <SeccionConfigScratchpad />}
            {seccion === 'actividad' && <SeccionConfigActividad />}
            {seccion === 'layout' && <SeccionConfigLayout />}
            {seccion === 'perfil' && <SeccionConfigPerfil onCerrar={onCerrar} />}
            {seccion === 'preferencias' && <SeccionConfigPreferencias />}
            {seccion === 'temas' && <SeccionConfigTemas />}
            {seccion === 'seguridad' && <SeccionConfigSeguridad />}
            {seccion === 'ia' && <SeccionConfigMCP onAbrirUpgrade={onAbrirUpgrade} />}
            {seccion === 'plugins' && <SeccionConfigPlugins />}
            {seccion === 'backups' && <SeccionConfigBackups onAbrirUpgrade={onAbrirUpgrade} />}
        </>
    );
}

export function ModalConfiguracionGlobal({estaAbierto, onCerrar, seccionInicial, onAbrirUpgrade}: ModalConfiguracionGlobalProps): JSX.Element | null {
    const [seccion, setSeccion] = useState<SeccionConfigGlobal>(seccionInicial);
    const {esMovil} = useEsMovil();
    /* En móvil: null = mostrar tabs, string = mostrar contenido expandido */
    const [seccionMovil, setSeccionMovil] = useState<SeccionConfigGlobal | null>(null);

    /* Sincronizar sección cuando se abre con una diferente */
    useEffect(() => {
        if (estaAbierto) {
            setSeccion(seccionInicial);
            setSeccionMovil(null);
        }
    }, [estaAbierto, seccionInicial]);

    if (!estaAbierto) return null;

    /* === VERSIÓN MÓVIL: BottomSheet === */
    if (esMovil) {
        return (
            <BottomSheet estaAbierto={estaAbierto} onCerrar={() => { setSeccionMovil(null); onCerrar(); }}>
                <div className={`configMovilContenedor ${seccionMovil ? 'configMovilContenedor--expandido' : ''}`}>
                    {seccionMovil ? (
                        /* Fase 2: Contenido de la sección seleccionada */
                        <>
                            <div className="configMovilEncabezado">
                                <Boton type="button" variante="ghost" soloIcono icono={<ChevronLeft size={18} />} onClick={() => setSeccionMovil(null)} />
                                <span className="configMovilTitulo">{TITULOS_SECCION[seccionMovil]}</span>
                            </div>
                            <div className="configMovilContenido">
                                <ContenidoSeccion seccion={seccionMovil} onCerrar={onCerrar} onAbrirUpgrade={onAbrirUpgrade} />
                            </div>
                        </>
                    ) : (
                        /* Fase 1: Lista de secciones como botones */
                        <div className="configMovilSecciones">
                            {GRUPOS.map(grupo => (
                                <div key={grupo} className="configMovilGrupo">
                                    <div className="configMovilGrupoTitulo">{grupo}</div>
                                    {SECCIONES_SIDEBAR.filter(s => s.grupo === grupo).map(s => (
                                        <Boton key={s.id} type="button" variante="ghost" claseAdicional="configMovilItem" onClick={() => setSeccionMovil(s.id)}>
                                            <span className="configMovilItemIcono">{s.icono}</span>
                                            <span className="configMovilItemTexto">{s.nombre}</span>
                                        </Boton>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </BottomSheet>
        );
    }

    /* === VERSIÓN ESCRITORIO: Modal con sidebar === */
    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo={TITULOS_SECCION[seccion]} claseExtra="modalConfigGlobal">
            <div className="configGlobalLayout">
                <nav className="configGlobalSidebar">
                    {GRUPOS.map(grupo => (
                        <div key={grupo}>
                            <div className="configGlobalNavGrupo">{grupo}</div>
                            {SECCIONES_SIDEBAR.filter(s => s.grupo === grupo).map(s => (
                                <Boton key={s.id} type="button" variante="ghost" claseAdicional={`configGlobalNavItem ${seccion === s.id ? 'activo' : ''}`} onClick={() => setSeccion(s.id)}>
                                    {s.icono}
                                    <span>{s.nombre}</span>
                                </Boton>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="configGlobalContenido">
                    <ContenidoSeccion seccion={seccion} onCerrar={onCerrar} onAbrirUpgrade={onAbrirUpgrade} />
                </div>
            </div>
        </Modal>
    );
}

/*
 * ModalCreacionRapida
 * Modal minimalista para creación rápida de Tareas, Hábitos y Proyectos.
 * Diseño estilo "Spotlight" / "Command Palette" con efecto glass.
 */

import {useState, useEffect, useRef} from 'react';
import {X, CheckSquare, Activity, Folder, Calendar, Flag, Hash, ArrowRight, Layers, AlertCircle, Clock, Repeat, ChevronDown, Paperclip, Loader2} from 'lucide-react';
import {MenuContextual} from '../shared';
import type {Proyecto, Adjunto} from '../../types/dashboard';
import {useAdjuntos} from '../../hooks/useAdjuntos';
import '../../styles/dashboard/componentes/modalCreacionRapida.css';

interface ModalCreacionRapidaProps {
    tipo: 'tarea' | 'habito' | 'proyecto';
    proyectos?: Proyecto[];
    onCerrar: () => void;
    onGuardar: (datos: any) => Promise<void>;
    onCambiarTipo: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
}

interface EstadoOpciones {
    proyectoId?: number;
    prioridad?: string;
    urgencia?: string;
    frecuencia?: string;
    fecha?: string;
    importancia?: string;
}

export function ModalCreacionRapida({tipo, proyectos = [], onCerrar, onGuardar, onCambiarTipo}: ModalCreacionRapidaProps): JSX.Element {
    const [texto, setTexto] = useState('');
    const [opciones, setOpciones] = useState<EstadoOpciones>({});
    const [cargando, setCargando] = useState(false);
    const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* Hook para adjuntos */
    const {subirArchivo, estado: estadoSubida} = useAdjuntos();

    /* Estados para menús contextuales de opciones */
    const [menuTipo, setMenuTipo] = useState({visible: false, x: 0, y: 0});
    const [menuProyecto, setMenuProyecto] = useState({visible: false, x: 0, y: 0});
    const [menuPrioridad, setMenuPrioridad] = useState({visible: false, x: 0, y: 0});
    const [menuUrgencia, setMenuUrgencia] = useState({visible: false, x: 0, y: 0});
    const [menuFrecuencia, setMenuFrecuencia] = useState({visible: false, x: 0, y: 0});
    const [menuFecha, setMenuFecha] = useState({visible: false, x: 0, y: 0});
    const [menuImportancia, setMenuImportancia] = useState({visible: false, x: 0, y: 0});

    useEffect(() => {
        /* Auto-foco al abrir */
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [tipo]); // Re-enfocar al cambiar tipo

    const manejarSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!texto.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                texto: texto,
                tipo: tipo,
                ...opciones,
                adjuntos: adjuntos
            });
            setTexto('');
            setOpciones({});
            setAdjuntos([]);
            onCerrar();
        } catch (error) {
            console.error(error);
        } finally {
            setCargando(false);
        }
    };

    const manejarKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCerrar();
        }
    };

    const manejarArchivoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const nuevoAdjunto = await subirArchivo(file);
            if (nuevoAdjunto) {
                setAdjuntos(prev => [...prev, nuevoAdjunto]);
            }
        } catch (error) {
            console.error('Error subiendo archivo:', error);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const cerrarOtrosMenus = () => {
        setMenuTipo(prev => ({...prev, visible: false}));
        setMenuProyecto(prev => ({...prev, visible: false}));
        setMenuPrioridad(prev => ({...prev, visible: false}));
        setMenuUrgencia(prev => ({...prev, visible: false}));
        setMenuFrecuencia(prev => ({...prev, visible: false}));
        setMenuFecha(prev => ({...prev, visible: false}));
        setMenuImportancia(prev => ({...prev, visible: false}));
    };

    const obtenerPlaceholder = () => {
        switch (tipo) {
            case 'tarea':
                return 'Escribe una nueva tarea...';
            case 'habito':
                return 'Nombre del nuevo hábito...';
            case 'proyecto':
                return 'Nombre del nuevo proyecto...';
            default:
                return 'Escribir...';
        }
    };

    const obtenerIconoPrincipal = () => {
        switch (tipo) {
            case 'tarea':
                return <CheckSquare size={18} />;
            case 'habito':
                return <Activity size={18} />;
            case 'proyecto':
                return <Folder size={18} />;
        }
    };

    const obtenerEtiquetaFecha = (val?: string) => {
        if (!val) return 'Fecha';
        if (val === 'hoy') return 'Hoy';
        if (val === 'manana') return 'Mañana';
        if (val === 'semana') return 'Esta Semana';
        return val;
    };

    /* Cerrar modal solo si no hay menús abiertos */
    const manejarClickOverlay = (e: React.MouseEvent) => {
        if (menuTipo.visible || menuProyecto.visible || menuPrioridad.visible || menuUrgencia.visible || menuFrecuencia.visible || menuFecha.visible || menuImportancia.visible) {
            cerrarOtrosMenus();
            return;
        }
        onCerrar();
    };

    const manejarClickContenedor = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (menuTipo.visible || menuProyecto.visible || menuPrioridad.visible || menuUrgencia.visible || menuFrecuencia.visible || menuFecha.visible || menuImportancia.visible) {
            cerrarOtrosMenus();
        }
    };

    return (
        <div className="creacionRapidaOverlay" onClick={manejarClickOverlay}>
            <div className="creacionRapidaContenedor" onClick={manejarClickContenedor}>
                <form onSubmit={manejarSubmit}>
                    <div className="creacionRapidaInputWrapper">

                        <input ref={inputRef} type="text" value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={manejarKeyDown} placeholder={obtenerPlaceholder()} className="creacionRapidaInput" autoFocus />
                        <button type="submit" className="creacionRapidaBotonEnviar" disabled={!texto.trim() || cargando}>
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    {renderOpcionesValores()}

                    {/* Input de archivo oculto */}
                    <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={manejarArchivoSeleccionado} />
                </form>
            </div>

            {/* Menús Contextuales */}

            {/* Menú de Tipo */}
            {menuTipo.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'tarea', etiqueta: 'Tarea', icono: <CheckSquare size={14} className="textoInfo" />},
                            {id: 'habito', etiqueta: 'Hábito', icono: <Activity size={14} className="textoExito" />},
                            {id: 'proyecto', etiqueta: 'Proyecto', icono: <Folder size={14} className="textoAdvertencia" />}
                        ]}
                        posicionX={menuTipo.x}
                        posicionY={menuTipo.y}
                        onSeleccionar={id => {
                            onCambiarTipo(id as any);
                            setMenuTipo({...menuTipo, visible: false});
                        }}
                        onCerrar={() => setMenuTipo({...menuTipo, visible: false})}
                    />
                </div>
            )}

            {menuProyecto.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'ninguno', etiqueta: 'Ninguno', icono: <Folder size={12} className="textoApagado" />},
                            ...proyectos.map(p => ({
                                id: p.id.toString(),
                                etiqueta: p.nombre,
                                icono: <Folder size={12} />
                            }))
                        ]}
                        posicionX={menuProyecto.x}
                        posicionY={menuProyecto.y}
                        onSeleccionar={id => {
                            setOpciones({...opciones, proyectoId: id === 'ninguno' ? undefined : Number(id)});
                            setMenuProyecto({...menuProyecto, visible: false});
                        }}
                        onCerrar={() => setMenuProyecto({...menuProyecto, visible: false})}
                    />
                </div>
            )}

            {menuPrioridad.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'alta', etiqueta: 'Alta', icono: <Flag size={12} color="var(--dashboard-estadoAlta)" />},
                            {id: 'media', etiqueta: 'Media', icono: <Flag size={12} color="var(--dashboard-estadoMedia)" />},
                            {id: 'baja', etiqueta: 'Baja', icono: <Flag size={12} color="var(--dashboard-estadoBaja)" />}
                        ]}
                        posicionX={menuPrioridad.x}
                        posicionY={menuPrioridad.y}
                        onSeleccionar={id => {
                            setOpciones({...opciones, prioridad: id});
                            setMenuPrioridad({...menuPrioridad, visible: false});
                        }}
                        onCerrar={() => setMenuPrioridad({...menuPrioridad, visible: false})}
                    />
                </div>
            )}

            {menuUrgencia.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'bloqueante', etiqueta: 'Bloqueante', icono: <AlertCircle size={12} color="var(--dashboard-estadoAlta)" />},
                            {id: 'urgente', etiqueta: 'Urgente', icono: <Clock size={12} color="var(--dashboard-estadoAlta)" />},
                            {id: 'normal', etiqueta: 'Normal', icono: <Clock size={12} color="var(--dashboard-textoSecundario)" />},
                            {id: 'chill', etiqueta: 'Chill', icono: <Clock size={12} color="var(--dashboard-estadoExito)" />}
                        ]}
                        posicionX={menuUrgencia.x}
                        posicionY={menuUrgencia.y}
                        onSeleccionar={id => {
                            setOpciones({...opciones, urgencia: id});
                            setMenuUrgencia({...menuUrgencia, visible: false});
                        }}
                        onCerrar={() => setMenuUrgencia({...menuUrgencia, visible: false})}
                    />
                </div>
            )}

            {menuFrecuencia.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'diario', etiqueta: 'Diario', icono: <Repeat size={12} />},
                            {id: 'semanal', etiqueta: 'Semanal', icono: <Repeat size={12} />},
                            {id: 'mensual', etiqueta: 'Mensual', icono: <Repeat size={12} />}
                        ]}
                        posicionX={menuFrecuencia.x}
                        posicionY={menuFrecuencia.y}
                        onSeleccionar={id => {
                            setOpciones({...opciones, frecuencia: id});
                            setMenuFrecuencia({...menuFrecuencia, visible: false});
                        }}
                        onCerrar={() => setMenuFrecuencia({...menuFrecuencia, visible: false})}
                    />
                </div>
            )}

            {/* Menú Fecha */}
            {menuFecha.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'hoy', etiqueta: 'Hoy', icono: <Calendar size={12} className="textoAdvertencia" />},
                            {id: 'manana', etiqueta: 'Mañana', icono: <Calendar size={12} />},
                            {id: 'semana', etiqueta: 'Esta Semana', icono: <Calendar size={12} />}
                        ]}
                        posicionX={menuFecha.x}
                        posicionY={menuFecha.y}
                        onSeleccionar={id => {
                            setOpciones({...opciones, fecha: id});
                            setMenuFecha({...menuFecha, visible: false});
                        }}
                        onCerrar={() => setMenuFecha({...menuFecha, visible: false})}
                    />
                </div>
            )}

            {/* Menú Importancia (Hábitos) */}
            {menuImportancia.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'Alta', etiqueta: 'Alta', icono: <Flag size={12} color="var(--dashboard-estadoAlta)" />},
                            {id: 'Media', etiqueta: 'Media', icono: <Flag size={12} color="var(--dashboard-estadoMedia)" />},
                            {id: 'Baja', etiqueta: 'Baja', icono: <Flag size={12} color="var(--dashboard-estadoBaja)" />}
                        ]}
                        posicionX={menuImportancia.x}
                        posicionY={menuImportancia.y}
                        onSeleccionar={id => {
                            setOpciones({...opciones, importancia: id});
                            setMenuImportancia({...menuImportancia, visible: false});
                        }}
                        onCerrar={() => setMenuImportancia({...menuImportancia, visible: false})}
                    />
                </div>
            )}
        </div>
    );

    function renderOpcionesValores() {
        if (tipo === 'tarea') {
            const proyectoSeleccionado = proyectos.find(p => p.id === opciones.proyectoId);

            return (
                <div className="creacionRapidaOpciones">
                    {/* Selector de Proyecto */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuProyecto({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Layers size={14} />
                        <span>{proyectoSeleccionado?.nombre || 'Sin Proyecto'}</span>
                    </button>

                    {/* Selector de Fecha */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuFecha({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Calendar size={14} className={opciones.fecha === 'hoy' ? 'textoAdvertencia' : ''} />
                        <span>{obtenerEtiquetaFecha(opciones.fecha)}</span>
                    </button>

                    {/* Selector de Prioridad */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuPrioridad({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Flag size={14} className={opciones.prioridad === 'alta' ? 'textoRojo' : opciones.prioridad === 'media' ? 'textoAmarillo' : ''} />
                        <span>{opciones.prioridad ? `Prioridad ${opciones.prioridad}` : 'Prioridad'}</span>
                    </button>

                    {/* Selector de Urgencia */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuUrgencia({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Clock size={14} className={opciones.urgencia === 'bloqueante' || opciones.urgencia === 'urgente' ? 'textoRojo' : ''} />
                        <span>{opciones.urgencia ? opciones.urgencia.charAt(0).toUpperCase() + opciones.urgencia.slice(1) : 'Urgencia'}</span>
                    </button>

                    {/* Botón Adjuntar */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            if (fileInputRef.current && !estadoSubida.subiendo) {
                                fileInputRef.current.click();
                            }
                        }}
                        disabled={estadoSubida.subiendo}>
                        {estadoSubida.subiendo ? <Loader2 size={14} className="iconoGirando" /> : <Paperclip size={14} className={adjuntos.length > 0 ? 'textoExito' : ''} />}
                        <span>{adjuntos.length > 0 ? `${adjuntos.length} Adjunto${adjuntos.length !== 1 ? 's' : ''}` : 'Adjuntar'}</span>
                    </button>
                </div>
            );
        } else if (tipo === 'habito') {
            return (
                <div className="creacionRapidaOpciones">
                    {/* Selector de Frecuencia */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuFrecuencia({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Repeat size={14} />
                        <span>{opciones.frecuencia ? opciones.frecuencia.charAt(0).toUpperCase() + opciones.frecuencia.slice(1) : 'Diario'}</span>
                    </button>

                    {/* Selector de Importancia */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuImportancia({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Flag size={14} className={opciones.importancia === 'Alta' ? 'textoRojo' : opciones.importancia === 'Media' ? 'textoAmarillo' : ''} />
                        <span>{opciones.importancia ? `Importancia ${opciones.importancia}` : 'Importancia Media'}</span>
                    </button>
                </div>
            );
        } else if (tipo === 'proyecto') {
            return (
                <div className="creacionRapidaOpciones">
                    {/* Selector de Prioridad (Proyecto) */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuPrioridad({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Flag size={14} className={opciones.prioridad === 'alta' ? 'textoRojo' : opciones.prioridad === 'media' ? 'textoAmarillo' : ''} />
                        <span>{opciones.prioridad ? `Prioridad ${opciones.prioridad}` : 'Prioridad'}</span>
                    </button>

                    {/* Selector de Urgencia (Proyecto) */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuUrgencia({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Clock size={14} className={opciones.urgencia === 'bloqueante' || opciones.urgencia === 'urgente' ? 'textoRojo' : ''} />
                        <span>{opciones.urgencia ? opciones.urgencia.charAt(0).toUpperCase() + opciones.urgencia.slice(1) : 'Urgencia'}</span>
                    </button>

                    {/* Selector de Fecha Limite (Proyecto) */}
                    <button
                        type="button"
                        className="creacionRapidaBotonOpcion"
                        onClick={e => {
                            e.preventDefault();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            cerrarOtrosMenus();
                            setMenuFecha({visible: true, x: rect.left, y: rect.bottom + 4});
                        }}>
                        <Calendar size={14} className={opciones.fecha === 'hoy' ? 'textoAdvertencia' : ''} />
                        <span>{obtenerEtiquetaFecha(opciones.fecha) || 'Fecha Limite'}</span>
                    </button>
                </div>
            );
        }
        return null;
    }
}

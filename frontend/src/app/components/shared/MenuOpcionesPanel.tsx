/*
 * MenuOpcionesPanel
 * Componente que unifica las opciones de un panel en móvil
 * Fase 10.8.3: Menú de Opciones Unificado
 *
 * En móvil: muestra un único botón que abre un BottomSheet con todas las opciones
 * En desktop: muestra los children normalmente
 */

import {useState, useCallback} from 'react';
import {MoreVertical, ArrowUpDown, Filter, Settings, RefreshCw} from 'lucide-react';
import {BottomSheet} from './BottomSheet';
import {Boton} from '../ui';
import {useEsMovil} from '../../hooks/useEsMovil';

/* Opción genérica del menú */
export interface OpcionMenuPanel {
    id: string;
    etiqueta: string;
    icono?: React.ReactNode;
    onClick: () => void;
    activo?: boolean;
    descripcion?: string;
}

/* Grupo de opciones (para separadores visuales) */
export interface GrupoOpciones {
    titulo: string;
    opciones: OpcionMenuPanel[];
}

export interface MenuOpcionesPanelProps {
    /* Título que se muestra en el BottomSheet */
    titulo: string;

    /* Grupos de opciones a mostrar */
    grupos?: GrupoOpciones[];

    /* Opciones sueltas (sin agrupar) */
    opciones?: OpcionMenuPanel[];

    /* Children a mostrar en desktop */
    children: React.ReactNode;

    /* Indicador de filtros activos */
    tieneFiltrosActivos?: boolean;

    /* Callback opcional para refrescar */
    onRefrescar?: () => void;

    /* Clase CSS adicional para el botón */
    claseBoton?: string;
}

export function MenuOpcionesPanel({titulo: _titulo, grupos = [], opciones = [], children, tieneFiltrosActivos = false, onRefrescar, claseBoton = ''}: MenuOpcionesPanelProps): JSX.Element {
    const {esMovil} = useEsMovil();
    const [menuAbierto, setMenuAbierto] = useState(false);

    const abrirMenu = useCallback(() => {
        setMenuAbierto(true);
    }, []);

    const cerrarMenu = useCallback(() => {
        setMenuAbierto(false);
    }, []);

    /* Handler para opciones que cierra el menú después de ejecutar */
    const manejarOpcion = useCallback(
        (onClick: () => void) => {
            onClick();
            cerrarMenu();
        },
        [cerrarMenu]
    );

    /* En desktop, mostrar children normalmente */
    if (!esMovil) {
        return <>{children}</>;
    }

    /* En móvil, mostrar botón único que abre el menú */
    return (
        <>
            <Boton variante="badge" soloIcono claseAdicional={`menuOpcionesPanelBoton ${tieneFiltrosActivos ? 'menuOpcionesPanelBoton--activo' : ''} ${claseBoton}`} onClick={abrirMenu} title="Opciones" aria-label="Abrir menú de opciones" icono={<MoreVertical size={14} />}>
                {tieneFiltrosActivos && <span className="menuOpcionesPanelBadge" aria-label="Filtros activos" />}
            </Boton>

            <BottomSheet estaAbierto={menuAbierto} onCerrar={cerrarMenu}>
                <div className="menuOpcionesPanelContenido">
                    {/* Opciones sueltas primero */}
                    {opciones.length > 0 && (
                        <div className="menuOpcionesPanelGrupo">
                            {opciones.map(opcion => (
                                <Boton key={opcion.id} variante="ghost" claseAdicional={`menuOpcionesPanelItem ${opcion.activo ? 'menuOpcionesPanelItem--activo' : ''}`} onClick={() => manejarOpcion(opcion.onClick)}>
                                    <span className="menuOpcionesPanelItemTexto">
                                        <span className="menuOpcionesPanelItemEtiqueta">{opcion.etiqueta}</span>
                                        {opcion.descripcion && <span className="menuOpcionesPanelItemDescripcion">{opcion.descripcion}</span>}
                                    </span>
                                    {opcion.icono && <span className="menuOpcionesPanelItemIcono">{opcion.icono}</span>}
                                </Boton>
                            ))}
                        </div>
                    )}

                    {/* Grupos de opciones */}
                    {grupos.map((grupo, idx) => (
                        <div key={grupo.titulo} className="menuOpcionesPanelGrupo">
                            {idx > 0 || opciones.length > 0 ? <div className="menuOpcionesPanelSeparador" /> : null}
                            <div className="menuOpcionesPanelGrupoTitulo">{grupo.titulo}</div>
                            {grupo.opciones.map(opcion => (
                                <Boton key={opcion.id} variante="ghost" claseAdicional={`menuOpcionesPanelItem ${opcion.activo ? 'menuOpcionesPanelItem--activo' : ''}`} onClick={() => manejarOpcion(opcion.onClick)}>
                                    <span className="menuOpcionesPanelItemTexto">
                                        <span className="menuOpcionesPanelItemEtiqueta">{opcion.etiqueta}</span>
                                        {opcion.descripcion && <span className="menuOpcionesPanelItemDescripcion">{opcion.descripcion}</span>}
                                    </span>
                                    {opcion.icono && <span className="menuOpcionesPanelItemIcono">{opcion.icono}</span>}
                                </Boton>
                            ))}
                        </div>
                    ))}

                    {/* Botón refrescar si está disponible */}
                    {onRefrescar && (
                        <>
                            <div className="menuOpcionesPanelSeparador" />
                            <Boton variante="ghost" claseAdicional="menuOpcionesPanelItem menuOpcionesPanelItem--accion" onClick={() => manejarOpcion(onRefrescar)}>
                                <span className="menuOpcionesPanelItemIcono">
                                    <RefreshCw size={14} />
                                </span>
                                <span className="menuOpcionesPanelItemTexto">
                                    <span className="menuOpcionesPanelItemEtiqueta">Actualizar</span>
                                </span>
                            </Boton>
                        </>
                    )}
                </div>
            </BottomSheet>
        </>
    );
}

/*
 * Helpers para crear opciones comunes
 * Facilita la creación de opciones de ordenamiento y filtro
 */
export function crearOpcionesOrdenamiento(opciones: Array<{id: string; etiqueta: string; descripcion?: string}>, valorActual: string, onChange: (id: string) => void): OpcionMenuPanel[] {
    return opciones.map(op => ({
        id: op.id,
        etiqueta: op.etiqueta,
        descripcion: op.descripcion,
        icono: <ArrowUpDown size={14} />,
        onClick: () => onChange(op.id),
        activo: valorActual === op.id
    }));
}

export function crearOpcionesFiltro(opciones: Array<{id: string; etiqueta: string; descripcion?: string}>, valorActual: string, onChange: (id: string) => void): OpcionMenuPanel[] {
    return opciones.map(op => ({
        id: op.id,
        etiqueta: op.etiqueta,
        descripcion: op.descripcion,
        icono: <Filter size={14} />,
        onClick: () => onChange(op.id),
        activo: valorActual === op.id
    }));
}

export function crearOpcionConfiguracion(onClick: () => void): OpcionMenuPanel {
    return {
        id: 'configuracion',
        etiqueta: 'Configuración',
        icono: <Settings size={14} />,
        onClick
    };
}

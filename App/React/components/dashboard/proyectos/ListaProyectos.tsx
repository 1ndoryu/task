/*
 * ListaProyectos
 * Componente para mostrar y gestionar la lista de proyectos
 * Cuando un proyecto está seleccionado, muestra sus tareas debajo
 */

import {useState} from 'react';
import {ChevronDown, ChevronRight, Calendar, Zap, FolderOpen, Users} from 'lucide-react';
import {DashboardPanel} from '../../shared/DashboardPanel';
import {EstadoVacio} from '../../shared/EstadoVacio';
import {ListaTareas} from '../ListaTareas';
import {MenuContextualAdaptivo} from '../../shared/MenuContextualAdaptivo';
import {BadgeInfo, BadgeGroup} from '../../shared/BadgeInfo';
import {AccionesItem} from '../../shared/AccionesItem';
import type {Proyecto, Tarea, DatosEdicionTarea, NivelUrgencia} from '../../../types/dashboard';
import {obtenerTextoFechaLimite, obtenerVarianteFechaLimite, formatearFechaCorta} from '../../../utils/fechaUI';
import {obtenerTextoPrioridad} from '../../../utils/constantes';
import {useListaProyectos} from '../../../hooks/dashboard/useListaProyectos';

/* Mapa de prioridad a valor numérico para ordenamiento (menor = más prioritario) */
const MAPA_VALOR_PRIORIDAD: Record<string, number> = {muy_alta: 0, alta: 1, media: 2, baja: 3};

/* Obtener variante CSS para badge de prioridad de proyecto */
function obtenerClasePrioridad(prioridad: string): string {
    switch (prioridad) {
        case 'muy_alta': return 'etiquetaMuyAlta';
        case 'alta': return 'etiquetaAlta';
        case 'media': return 'etiquetaMedia';
        case 'baja': return 'etiquetaBaja';
        default: return 'etiquetaMedia';
    }
}

interface ListaProyectosProps {
    proyectos: Proyecto[];
    tareas: Tarea[];
    onCrearProyecto: () => void;
    onSeleccionarProyecto?: (id: number | null) => void;
    proyectoSeleccionadoId?: number | null;
    onEditarProyecto?: (proyecto: Proyecto) => void;
    onEliminarProyecto?: (id: number) => void;
    onCambiarEstadoProyecto?: (id: number, estado: 'activo' | 'completado' | 'pausado') => void;
    onCompartirProyecto?: (proyecto: Proyecto) => void;
    estaCompartido?: (proyectoId: number) => boolean;
    onToggleTarea: (id: number) => void;
    onCrearTarea: (datos: DatosEdicionTarea) => void;
    onEditarTarea: (id: number, datos: DatosEdicionTarea) => void;
    onEliminarTarea: (id: number) => void;
    onReordenarTareas: (tareas: Tarea[]) => void;
    ocultarCompletados?: boolean;
    ocultarTareasCompletadas?: boolean;
    ordenDefecto?: 'nombre' | 'fecha' | 'prioridad';
    mostrarProgreso?: boolean;
    modoCompacto?: boolean;
    /* Callback para abrir modal de creación rápida con proyecto preseleccionado */
    onAbrirModalCrear?: (proyectoId: number) => void;
}

interface ProyectoItemProps {
    proyecto: Proyecto;
    activo: boolean;
    tareasProyecto: Tarea[];
    estaCompartido?: boolean;
    onToggle: () => void;
    onEditar?: () => void;
    onEliminar?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onToggleTarea: (id: number) => void;
    onCrearTarea: (datos: DatosEdicionTarea) => void;
    onEditarTarea: (id: number, datos: DatosEdicionTarea) => void;
    onEliminarTarea: (id: number) => void;
    onReordenarTareas: (tareas: Tarea[]) => void;
    mostrarProgreso?: boolean;
    ocultarTareasCompletadas?: boolean;
    ordenDefecto?: 'nombre' | 'fecha' | 'prioridad';
    modoCompacto?: boolean;
    /* Callback para abrir modal de creación rápida con proyecto preseleccionado */
    onAbrirModalCrear?: () => void;
}

function ProyectoItem({proyecto, activo, tareasProyecto, estaCompartido = false, onToggle, onEditar, onEliminar, onContextMenu, onToggleTarea, onCrearTarea, onEditarTarea, onEliminarTarea, onReordenarTareas, mostrarProgreso = true, ocultarTareasCompletadas = false, ordenDefecto = 'fecha', modoCompacto = false, onAbrirModalCrear}: ProyectoItemProps): JSX.Element {
    const [mostrarAcciones, setMostrarAcciones] = useState(false);
    const tareasCompletadas = tareasProyecto.filter(t => t.completado).length;
    const totalTareas = tareasProyecto.length;

    // Ordenar tareas segun el ordenDefecto
    const tareasOrdenadas = [...tareasProyecto].sort((a, b) => {
        if (ordenDefecto === 'prioridad') {
            const pA = MAPA_VALOR_PRIORIDAD[a.prioridad || ''] ?? 4;
            const pB = MAPA_VALOR_PRIORIDAD[b.prioridad || ''] ?? 4;
            if (pA !== pB) return pA - pB;
        } else if (ordenDefecto === 'fecha') {
            // Si tiene fecha, va antes que si no tiene
            if (a.configuracion?.fechaMaxima && !b.configuracion?.fechaMaxima) return -1;
            if (!a.configuracion?.fechaMaxima && b.configuracion?.fechaMaxima) return 1;
            if (a.configuracion?.fechaMaxima && b.configuracion?.fechaMaxima) {
                return new Date(a.configuracion.fechaMaxima).getTime() - new Date(b.configuracion.fechaMaxima).getTime();
            }
        }
        // Fallback al orden manual
        return (a.orden || 0) - (b.orden || 0);
    });

    const tareasVisibles = ocultarTareasCompletadas ? tareasOrdenadas.filter(t => !t.completado) : tareasOrdenadas;

    /* Usar funciones centralizadas para fecha */
    const textoFecha = obtenerTextoFechaLimite(proyecto.fechaLimite);
    const varianteFecha = obtenerVarianteFechaLimite(proyecto.fechaLimite);

    /*
     * Wrapper para crear tareas heredando prioridad y urgencia del proyecto
     * Las tareas creadas dentro de un proyecto heredan sus propiedades
     */
    const crearTareaConHerencia = (datos: DatosEdicionTarea) => {
        onCrearTarea({
            ...datos,
            prioridad: datos.prioridad ?? proyecto.prioridad,
            urgencia: datos.urgencia ?? proyecto.urgencia
        });
    };

    /* Obtener variante de urgencia para badge */
    const obtenerVarianteUrgencia = (urgencia: NivelUrgencia): 'urgenciaBloqueante' | 'urgenciaUrgente' | 'urgenciaChill' | 'normal' => {
        switch (urgencia) {
            case 'bloqueante':
                return 'urgenciaBloqueante';
            case 'urgente':
                return 'urgenciaUrgente';
            case 'chill':
                return 'urgenciaChill';
            default:
                return 'normal';
        }
    };

    return (
        <div className={`proyectoItemWrapper ${activo ? 'proyectoItemWrapperActivo' : ''} ${modoCompacto ? 'proyectoItemWrapper--compacto' : ''}`}>
            <div className={`proyectoItem ${activo ? 'proyectoItemActivo' : ''} ${modoCompacto ? 'proyectoItem--compacto' : ''}`} onClick={onToggle} onContextMenu={onContextMenu} onMouseEnter={() => setMostrarAcciones(true)} onMouseLeave={() => setMostrarAcciones(false)}>
                <div className="proyectoItemChevron">{activo ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>

                <div className="proyectoItemContenido">
                    <span className={`proyectoNombre ${modoCompacto ? 'proyectoNombre--compacto' : ''}`}>{proyecto.nombre}</span>
                    <div className="proyectoMeta">
                        <span className={`etiquetaPrioridad ${obtenerClasePrioridad(proyecto.prioridad)}`}>{obtenerTextoPrioridad(proyecto.prioridad)?.toUpperCase() || proyecto.prioridad.toUpperCase()}</span>
                        {/* Badge de urgencia (si no es normal) */}
                        {proyecto.urgencia && proyecto.urgencia !== 'normal' && <BadgeInfo tipo="personalizado" icono={<Zap size={10} />} texto={proyecto.urgencia.toUpperCase()} variante={obtenerVarianteUrgencia(proyecto.urgencia)} titulo={`Urgencia: ${proyecto.urgencia}`} />}
                        <span>•</span>
                        <span>{totalTareas > 0 ? `${tareasCompletadas}/${totalTareas}` : 'Sin tareas'}</span>

                        {/* Badge de compartido o propietario */}
                        {proyecto.esCompartido && proyecto.propietarioNombre ? (
                            <>
                                <span>•</span>
                                <span className="badgePropietario" title={`De: ${proyecto.propietarioNombre}`}>
                                    {proyecto.propietarioAvatar && <img src={proyecto.propietarioAvatar} alt={proyecto.propietarioNombre} className="badgePropietarioAvatar" />}
                                    <span className="badgePropietarioNombre">{proyecto.propietarioNombre}</span>
                                </span>
                            </>
                        ) : (
                            estaCompartido && (
                                <>
                                    <span>•</span>
                                    <span className="badgeCompartido" title="Proyecto compartido">
                                        <Users size={10} />
                                    </span>
                                </>
                            )
                        )}

                        {/* Badge de fecha limite con urgencia */}
                        {proyecto.fechaLimite && (
                            <>
                                <span>•</span>
                                <BadgeGroup>
                                    <BadgeInfo tipo="fecha" icono={<Calendar size={10} />} texto={textoFecha} variante={varianteFecha} titulo={`Fecha limite: ${proyecto.fechaLimite ? formatearFechaCorta(proyecto.fechaLimite) : ''}`} />
                                </BadgeGroup>
                            </>
                        )}
                    </div>
                </div>

                {mostrarProgreso && (
                    <div className="proyectoProgreso" data-estado={proyecto.estado}>
                        <div className="barraProgresoFondo">
                            <div className="barraProgresoRelleno" style={{width: totalTareas > 0 ? `${(tareasCompletadas / totalTareas) * 100}%` : '0%'}} /> {/* sentinel-disable inline-style-prohibido */}
                        </div>
                    </div>
                )}

                {/* Acciones inline usando componente reutilizable */}
                {mostrarAcciones && <AccionesItem mostrarConfigurar={true} mostrarEliminar={true} onConfigurar={onEditar} onEliminar={onEliminar} />}
            </div>

            {/* Tareas del proyecto (solo cuando está activo) */}
            {activo && (
                <div className="proyectoTareas">
                    <ListaTareas tareas={tareasVisibles} proyectoId={proyecto.id} onToggleTarea={onToggleTarea} onCrearTarea={crearTareaConHerencia} onEditarTarea={onEditarTarea} onEliminarTarea={onEliminarTarea} onReordenarTareas={onReordenarTareas} modoCompacto={modoCompacto} onAbrirModalCrear={onAbrirModalCrear} ocultarPlaceholderVacio={true} />
                </div>
            )}
        </div>
    );
}

export function ListaProyectos({proyectos, tareas, onCrearProyecto, onSeleccionarProyecto, proyectoSeleccionadoId, onEditarProyecto, onEliminarProyecto, onCambiarEstadoProyecto, onCompartirProyecto, estaCompartido, onToggleTarea, onCrearTarea, onEditarTarea, onEliminarTarea, onReordenarTareas, ocultarCompletados = false, ocultarTareasCompletadas = false, ordenDefecto = 'fecha', mostrarProgreso = true, modoCompacto = false, onAbrirModalCrear}: ListaProyectosProps): JSX.Element {
    const {menuContexto, toggleProyecto, manejarContextMenu, cerrarMenuContexto, obtenerOpcionesMenu, manejarSeleccionMenu} = useListaProyectos({proyectos, proyectoSeleccionadoId, onSeleccionarProyecto, onEditarProyecto, onEliminarProyecto, onCambiarEstadoProyecto, onCompartirProyecto});

    return (
        <>
            <DashboardPanel>
                <div className="listaProyectos">
                    {proyectos
                        .filter(p => !ocultarCompletados || p.estado !== 'completado')
                        .sort((a, b) => {
                            if (ordenDefecto === 'nombre') return a.nombre.localeCompare(b.nombre);
                            if (ordenDefecto === 'fecha') {
                                if (!a.fechaLimite) return 1;
                                if (!b.fechaLimite) return -1;
                                return new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime();
                            }
                            if (ordenDefecto === 'prioridad') {
                                return (MAPA_VALOR_PRIORIDAD[a.prioridad] ?? 99) - (MAPA_VALOR_PRIORIDAD[b.prioridad] ?? 99);
                            }
                            return 0;
                        })
                        .map(proyecto => {
                            const tareasProyecto = tareas.filter(t => t.proyectoId === proyecto.id);
                            const proyectoCompartido = estaCompartido?.(proyecto.id) ?? false;
                            return <ProyectoItem key={proyecto.id} proyecto={proyecto} activo={proyecto.id === proyectoSeleccionadoId} tareasProyecto={tareasProyecto} estaCompartido={proyectoCompartido} onToggle={() => toggleProyecto(proyecto.id)} onEditar={() => onEditarProyecto?.(proyecto)} onEliminar={() => onEliminarProyecto?.(proyecto.id)} onContextMenu={e => manejarContextMenu(e, proyecto.id)} onToggleTarea={onToggleTarea} onCrearTarea={onCrearTarea} onEditarTarea={onEditarTarea} onEliminarTarea={onEliminarTarea} onReordenarTareas={onReordenarTareas} mostrarProgreso={mostrarProgreso} ocultarTareasCompletadas={ocultarTareasCompletadas} ordenDefecto={ordenDefecto} modoCompacto={modoCompacto} onAbrirModalCrear={onAbrirModalCrear ? () => onAbrirModalCrear(proyecto.id) : undefined} />;
                        })}

                    {proyectos.length === 0 && <EstadoVacio icono={<FolderOpen size={32} />} mensaje="No hay proyectos activos" textoBoton="+ Crear proyecto" onAccion={onCrearProyecto} />}

                    {/* Botón añadir proyecto al final de la lista */}
                    {proyectos.length > 0 && (
                        <div className="añadirProyecto" onClick={onCrearProyecto}>
                            + Añadir
                        </div>
                    )}
                </div>
            </DashboardPanel>

            {/* Menu contextual adaptivo (Desktop/Mobile) */}
            {menuContexto.visible && <MenuContextualAdaptivo opciones={obtenerOpcionesMenu()} posicionX={menuContexto.x} posicionY={menuContexto.y} onSeleccionar={manejarSeleccionMenu} onCerrar={cerrarMenuContexto} titulo="Opciones de proyecto" />}
        </>
    );
}

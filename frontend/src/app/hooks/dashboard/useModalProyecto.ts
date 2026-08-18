/*
 * useModalProyecto
 * Hook que encapsula toda la lógica del modal de crear/editar proyecto
 * Maneja: estado del formulario, validación, auto-guardado, sincronización,
 * pestañas, visibilidad del chat y estadísticas
 */

import {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import type {NivelPrioridad, NivelUrgencia, Proyecto, Participante, Adjunto, Tarea, Hito} from '../../types/dashboard';
import type {DatosNuevoProyecto} from '../useProyectos';
import {useMensajesNoLeidos} from '../useMensajesNoLeidos';

/* Tipo local para evitar dependencia circular con componentes */
type EstadoProyecto = 'activo' | 'pausado' | 'completado';

export type PestanaModal = 'configuracion' | 'chat';

export interface UseModalProyectoParams {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosNuevoProyecto) => void;
    proyecto?: Proyecto;
    participantes?: Participante[];
    tareas?: Tarea[];
}

export function useModalProyecto({
    estaAbierto,
    onCerrar,
    onGuardar,
    proyecto,
    participantes = [],
    tareas = []
}: UseModalProyectoParams) {
    const modoEdicion = !!proyecto;

    /* Estado local para edición */
    const [nombre, setNombre] = useState(proyecto?.nombre || '');
    const [descripcion, setDescripcion] = useState(proyecto?.descripcion || '');
    const [icono, setIcono] = useState(proyecto?.icono || 'folder');
    const [colorIcono, setColorIcono] = useState(proyecto?.colorIcono || '#888888');
    const [prioridad, setPrioridad] = useState<NivelPrioridad>(proyecto?.prioridad || 'media');
    const [urgencia, setUrgencia] = useState<NivelUrgencia | null>(proyecto?.urgencia || null);
    const [fechaLimite, setFechaLimite] = useState(proyecto?.fechaLimite || '');
    const [adjuntos, setAdjuntos] = useState<Adjunto[]>(proyecto?.adjuntos || []);
    const [hitos, setHitos] = useState<Hito[]>(proyecto?.hitos || []);
    const [estado, setEstado] = useState<EstadoProyecto>(proyecto?.estado || 'activo');
    const [errores, setErrores] = useState<{nombre?: string}>({});

    /* Estado para pestañas responsive */
    const [pestanaActiva, setPestanaActiva] = useState<PestanaModal>('configuracion');

    /* Estado para visibilidad del panel de chat (persistido) */
    const [chatVisible, setChatVisible] = useState<boolean>(() => {
        const guardado = localStorage.getItem('glory_chat_panel_visible');
        return guardado !== 'false';
    });

    /* Referencia al estado inicial para detectar cambios */
    const estadoInicialRef = useRef<{
        nombre: string;
        descripcion: string;
        icono: string;
        colorIcono: string;
        prioridad: NivelPrioridad;
        urgencia: NivelUrgencia | null;
        fechaLimite: string;
        adjuntos: Adjunto[];
        hitos: Hito[];
        estado: EstadoProyecto;
    } | null>(null);

    /* Sincronizar estado cuando cambia el proyecto */
    useEffect(() => {
        if (proyecto) {
            setNombre(proyecto.nombre);
            setDescripcion(proyecto.descripcion || '');
            setIcono(proyecto.icono || 'folder');
            setColorIcono(proyecto.colorIcono || '#888888');
            setPrioridad(proyecto.prioridad);
            setUrgencia(proyecto.urgencia || null);
            setFechaLimite(proyecto.fechaLimite || '');
            setAdjuntos(proyecto.adjuntos || []);
            setHitos(Array.isArray(proyecto.hitos) ? proyecto.hitos : []);
            setEstado(proyecto.estado || 'activo');

            /* Guardar estado inicial para detección de cambios */
            estadoInicialRef.current = {
                nombre: proyecto.nombre,
                descripcion: proyecto.descripcion || '',
                icono: proyecto.icono || 'folder',
                colorIcono: proyecto.colorIcono || '#888888',
                prioridad: proyecto.prioridad,
                urgencia: proyecto.urgencia || null,
                fechaLimite: proyecto.fechaLimite || '',
                adjuntos: proyecto.adjuntos || [],
                hitos: Array.isArray(proyecto.hitos) ? proyecto.hitos : [],
                estado: proyecto.estado || 'activo'
            };
        } else {
            /* Resetear si no hay proyecto (modo creación) */
            setNombre('');
            setDescripcion('');
            setIcono('folder');
            setColorIcono('#888888');
            setPrioridad('media');
            setUrgencia(null);
            setFechaLimite('');
            setAdjuntos([]);
            setHitos([]);
            setEstado('activo');
            estadoInicialRef.current = null;
        }
        setErrores({});
    }, [proyecto?.id, estaAbierto]);

    /* Detectar si hubo cambios respecto al estado inicial */
    const hayCambios = useCallback((): boolean => {
        const inicial = estadoInicialRef.current;
        if (!inicial) {
            return nombre.trim().length >= 3;
        }
        if (nombre.trim() !== inicial.nombre) return true;
        if (descripcion.trim() !== inicial.descripcion) return true;
        if (icono !== inicial.icono) return true;
        if (colorIcono !== inicial.colorIcono) return true;
        if (prioridad !== inicial.prioridad) return true;
        if (urgencia !== inicial.urgencia) return true;
        if (fechaLimite !== inicial.fechaLimite) return true;
        if (JSON.stringify(adjuntos) !== JSON.stringify(inicial.adjuntos)) return true;
        if (JSON.stringify(hitos) !== JSON.stringify(inicial.hitos)) return true;
        if (estado !== inicial.estado) return true;
        return false;
    }, [nombre, descripcion, icono, colorIcono, prioridad, urgencia, fechaLimite, adjuntos, hitos, estado]);

    const validarFormulario = useCallback((): boolean => {
        const nuevosErrores: {nombre?: string} = {};
        if (!nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es obligatorio';
        } else if (nombre.trim().length < 3) {
            nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
        }
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    }, [nombre]);

    const manejarGuardar = useCallback(() => {
        if (!validarFormulario()) return;

        onGuardar({
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            icono,
            colorIcono,
            prioridad,
            urgencia: urgencia || undefined,
            fechaLimite: fechaLimite || undefined,
            adjuntos,
            hitos,
            estado
        });
        onCerrar();
    }, [nombre, descripcion, icono, colorIcono, prioridad, urgencia, fechaLimite, adjuntos, hitos, estado, validarFormulario, onGuardar, onCerrar]);

    /* Auto-guardado: al cerrar el modal, guardar solo si hay cambios */
    const manejarCerrarConGuardado = useCallback(() => {
        if (hayCambios() && nombre.trim().length >= 3) {
            manejarGuardar();
        } else {
            onCerrar();
        }
    }, [hayCambios, nombre, manejarGuardar, onCerrar]);

    /* Cancelar: cerrar sin guardar (descartar cambios) */
    const manejarCancelar = useCallback(() => {
        onCerrar();
    }, [onCerrar]);

    /* Toggle visibilidad del panel de chat */
    const toggleChatVisible = useCallback(() => {
        setChatVisible(prev => {
            const nuevoValor = !prev;
            localStorage.setItem('glory_chat_panel_visible', String(nuevoValor));
            return nuevoValor;
        });
    }, []);

    /* Mensajes no leídos */
    const proyectoIdParaMensajes = proyecto?.id && proyecto.id > 0 ? [proyecto.id] : [];
    const {noLeidos: mensajesNoLeidos} = useMensajesNoLeidos('proyecto', proyectoIdParaMensajes);
    const tieneMensajesSinLeer = proyecto?.id ? (mensajesNoLeidos[proyecto.id] || 0) > 0 : false;

    /* Participantes para el panel de chat */
    const participantesChat = participantes.map(p => ({
        id: p.usuarioId,
        nombre: p.nombre,
        avatar: p.avatar
    }));

    const mostrarChat = modoEdicion;
    const mostrarChatColumna = mostrarChat && chatVisible;

    /* Estadísticas de tareas del proyecto */
    const tareasProyecto = useMemo(() => {
        if (!proyecto || !tareas.length) return [];
        return tareas.filter(t => t.proyectoId === proyecto.id);
    }, [proyecto?.id, tareas]);

    const {tareasCompletadas, tareasPendientes} = useMemo(() => ({
        tareasCompletadas: tareasProyecto.filter(t => t.completado).length,
        tareasPendientes: tareasProyecto.filter(t => !t.completado).length
    }), [tareasProyecto]);

    const claseModal = mostrarChat ? 'panelConfiguracionContenedor modalContenedor--expandido' : 'modalContenedor--moderno';

    return {
        modoEdicion,
        nombre, setNombre,
        descripcion, setDescripcion,
        icono, setIcono,
        colorIcono, setColorIcono,
        prioridad, setPrioridad,
        urgencia, setUrgencia,
        fechaLimite, setFechaLimite,
        adjuntos, setAdjuntos,
        hitos, setHitos,
        estado, setEstado,
        errores,
        pestanaActiva, setPestanaActiva,
        chatVisible, toggleChatVisible,
        tieneMensajesSinLeer,
        participantesChat,
        mostrarChat, mostrarChatColumna,
        claseModal,
        tareasProyecto,
        tareasCompletadas, tareasPendientes,
        manejarGuardar, manejarCerrarConGuardado, manejarCancelar
    };
}

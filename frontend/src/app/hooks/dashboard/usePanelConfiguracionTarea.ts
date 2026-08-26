/*
 * usePanelConfiguracionTarea
 * Hook que gestiona toda la lógica del panel de configuración de tareas.
 * Incluye: estado del formulario, sincronización con tarea, autoguardado,
 * panel de chat y handlers de cambios.
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import type {Tarea, TareaConfiguracion, NivelPrioridad, NivelUrgencia, Participante, FrecuenciaHabito, Adjunto, ReferenciaDependencia} from '../../types/dashboard';
import {usePanelChat} from '../usePanelChat';
import {useAutoguardado} from '../useAutoguardado';
import {useEsDispositivoMovil} from '../useEsMovil';
import {useExpStore} from '../../plugins/exp/store';
import {estimarDificultad} from '../../plugins/exp/service';
import type {Dificultad} from '../../plugins/exp/types';
import {prioridadANivelImportancia} from '../../plugins/exp/useExpPlugin';

interface UsePanelConfiguracionTareaParams {
    tarea?: Tarea;
    onCerrar: () => void;
    onGuardar: (configuracion: TareaConfiguracion, prioridad: NivelPrioridad | null, texto?: string, asignacion?: {asignadoA: number | null; asignadoANombre: string; asignadoAAvatar: string}, urgencia?: NivelUrgencia | null, tags?: string[], dependencias?: ReferenciaDependencia[], grupoEjecucion?: string | null) => void;
    participantes?: Participante[];
    onCambiarProyecto?: (proyectoId: number | undefined) => void;
    onToggleCompletado?: (completado: boolean) => void;
}

export function usePanelConfiguracionTarea({tarea, onCerrar, onGuardar, participantes = [], onCambiarProyecto, onToggleCompletado}: UsePanelConfiguracionTareaParams) {
    const modoEdicion = !!tarea;
    const esMovil = useEsDispositivoMovil();

    /* Estado del formulario */
    const [texto, setTexto] = useState(tarea?.texto || '');
    const [descripcion, setDescripcion] = useState(tarea?.configuracion?.descripcion || '');
    const [prioridad, setPrioridad] = useState<NivelPrioridad | null>(tarea?.prioridad || null);
    const [urgencia, setUrgencia] = useState<NivelUrgencia | null>(tarea?.urgencia || null);
    const [fechaMaxima, setFechaMaxima] = useState<string>(tarea?.configuracion?.fechaMaxima || '');
    const [tieneRepeticion, setTieneRepeticion] = useState<boolean>(!!tarea?.configuracion?.repeticion);
    const [frecuencia, setFrecuencia] = useState<FrecuenciaHabito>({tipo: 'diario'});
    const [adjuntos, setAdjuntos] = useState<Adjunto[]>(tarea?.configuracion?.adjuntos || []);
    const [tags, setTags] = useState<string[]>(tarea?.tags || []);
    const [dependencias, setDependencias] = useState<ReferenciaDependencia[]>(tarea?.dependencias || []);
    const [grupoEjecucion, setGrupoEjecucion] = useState<string | null>(tarea?.grupoEjecucion || null);

    /* [28-08-2026] Dificultad del plugin EXP para esta tarea. Se lee del store
     * (dificultades[id]) y se asigna automáticamente al abrir si no existe. */
    const dificultades = useExpStore(s => s.dificultades);
    const asignarDificultad = useExpStore(s => s.asignarDificultad);
    const [dificultad, setDificultad] = useState<Dificultad>('Media');

    /* [28-08-2026] Badges que el usuario oculta en la fila de la tarea
     * (urgencia, importancia, dificultad). true = ocultar. */
    const [badgesOcultos, setBadgesOcultos] = useState<NonNullable<Tarea['configuracion']>['badgesOcultos']>(tarea?.configuracion?.badgesOcultos || {});

    /* Estado de asignación */
    const [asignadoA, setAsignadoA] = useState<number | null>(tarea?.asignadoA || null);
    const [asignadoANombre, setAsignadoANombre] = useState<string>(tarea?.asignadoANombre || '');
    const [asignadoAAvatar, setAsignadoAAvatar] = useState<string>(tarea?.asignadoAAvatar || '');

    /* Estado local para proyecto y completado */
    const [proyectoIdLocal, setProyectoIdLocal] = useState<number | undefined>(tarea?.proyectoId);
    const [completadoLocal, setCompletadoLocal] = useState<boolean>(tarea?.completado ?? false);

    /* Hook para panel de chat */
    const panelChat = usePanelChat({
        elementoId: tarea?.id,
        elementoTipo: 'tarea',
        participantes,
        habilitado: modoEdicion
    });

    /* Campos actuales para detección de cambios */
    const camposActuales = {
        texto, descripcion, prioridad, urgencia, fechaMaxima,
        tieneRepeticion, frecuencia, adjuntos, asignadoA, tags, dependencias
    };

    /* Guardar tarea */
    const manejarGuardar = useCallback(() => {
        const configuracion: TareaConfiguracion = {};

        if (fechaMaxima) {
            configuracion.fechaMaxima = fechaMaxima;
        } else {
            configuracion.fechaMaxima = null as unknown as string;
        }

        if (descripcion.trim()) {
            configuracion.descripcion = descripcion.trim();
        } else {
            configuracion.descripcion = null as unknown as string;
        }

        if (tieneRepeticion) {
            const repeticion: import('../../types/dashboard').RepeticionTarea = {tipo: 'despuesCompletar', intervalo: 1};

            switch (frecuencia.tipo) {
                case 'diario':
                    repeticion.intervalo = 1;
                    break;
                case 'cadaXDias':
                    repeticion.intervalo = frecuencia.cadaDias || 2;
                    break;
                case 'semanal':
                    repeticion.intervalo = 7;
                    break;
                case 'diasEspecificos':
                    repeticion.intervalo = 1;
                    repeticion.diasSemana = frecuencia.diasSemana || [];
                    break;
                case 'mensual':
                    repeticion.intervalo = Math.floor(30 / (frecuencia.vecesAlMes || 1));
                    break;
            }

            configuracion.repeticion = repeticion;
        } else {
            configuracion.repeticion = undefined;
        }

        configuracion.adjuntos = adjuntos;
        /* [28-08-2026] Persistir la visibilidad de badges (urgencia, importancia,
         * dificultad) en la configuración de la tarea. Solo se incluye si hay
         * algún flag, para no guardar objetos vacíos en cada tarea. */
        const ocultos = Object.entries(badgesOcultos || {}).some(([, v]) => !!v);
        if (ocultos) {
            configuracion.badgesOcultos = badgesOcultos;
        }
        const asignacion = {asignadoA, asignadoANombre, asignadoAAvatar};
        /* [28-08-2026] Persistir la dificultad (manual o auto-estimada) en el
         * store EXP al guardar: si el usuario la cambió con la pill, se escribe,
         * y al reabrir ya no se sobreescribe (el guard del auto-asigner lo ve). */
        if (tarea && typeof tarea.id === 'number') {
            asignarDificultad(tarea.id, dificultad);
        }
        onGuardar(configuracion, prioridad, texto.trim(), asignacion, urgencia, tags, dependencias, grupoEjecucion);
        onCerrar();
    }, [fechaMaxima, descripcion, tieneRepeticion, frecuencia, adjuntos, badgesOcultos, asignadoA, asignadoANombre, asignadoAAvatar, prioridad, texto, urgencia, tags, dependencias, grupoEjecucion, onGuardar, onCerrar, tarea, dificultad, asignarDificultad]);

    /* Hook de autoguardado */
    const {guardarEstadoInicial, manejarCerrarConGuardado} = useAutoguardado({
        camposActuales,
        onGuardar: manejarGuardar,
        onCerrar,
        validar: () => texto.trim().length > 0
    });

    /* Ref para evitar loops infinitos en useEffect */
    const lastTareaIdRef = useRef<number | undefined>(undefined);
    /* [28-08-2026] Cuando el usuario cambia la dificultad manualmente con la pill
     * se marca un override para que una estimación automática aún en vuelo no
     * pise su elección al resolver. */
    const overrideManualRef = useRef(false);

    /* Wrapper del setter: cancela la auto-estimación pendiente si el usuario
     * elige manualmente (la pill usa onDificultadChange = setDificultad). */
    const manejarCambioDificultad = useCallback((valor: Dificultad) => {
        overrideManualRef.current = true;
        setDificultad(valor);
    }, []);

    /* [28-08-2026] Asignación automática de dificultad al abrir la config de una
     * tarea SIN dificultad en el store EXP: se estima (IA para admin, heurística
     * en caso contrario/fallo) y se persiste en el store (glory-exp). No se
     * sobreescribe si la tarea ya tenía dificultad ni si el usuario eligió manual. */
    useEffect(() => {
        if (!tarea || tipoID(tarea.id) == null) return;
        if (dificultades[String(tarea.id)]) return;
        const dificultadEstimada = estimarDificultad({
            nombre: tarea.texto,
            importancia: prioridadANivelImportancia((tarea.prioridad ?? 'media') as never),
            frecuenciaDesc: tarea.configuracion?.repeticion ? 'repetida' : 'una vez',
            extras: tarea.configuracion?.descripcion
        });
        let cancelado = false;
        dificultadEstimada.then(d => {
            if (cancelado) return;
            /* No pisar una elección manual del usuario. */
            if (overrideManualRef.current) return;
            asignarDificultad(tarea.id, d);
            setDificultad(d);
        });
        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tarea?.id]);

    /* [28-08-2026] Helper: el id de tarea debe ser número válido para el store. */
    function tipoID(id: number): number | null {
        return typeof id === 'number' && Number.isFinite(id) ? id : null;
    }

    /* Sincronizar estado cuando cambia la tarea */
    useEffect(() => {
        if (tarea?.id === lastTareaIdRef.current) return;
        lastTareaIdRef.current = tarea?.id;

        if (tarea) {
            setTexto(tarea.texto);
            setDescripcion(tarea.configuracion?.descripcion || '');
            setPrioridad(tarea.prioridad || null);
            setUrgencia(tarea.urgencia || null);
            /* Sincronizar la dificultad desde el store EXP (si ya estaba). */
            setDificultad(dificultades[String(tarea.id)] ?? 'Media');
            setFechaMaxima(tarea.configuracion?.fechaMaxima || '');
            setTieneRepeticion(!!tarea.configuracion?.repeticion);

            let nuevaFrecuencia: FrecuenciaHabito = {tipo: 'diario'};
            if (tarea.configuracion?.repeticion) {
                const {intervalo, diasSemana} = tarea.configuracion.repeticion;
                if (diasSemana && diasSemana.length > 0) {
                    nuevaFrecuencia = {tipo: 'diasEspecificos', diasSemana};
                } else if (intervalo === 1) {
                    nuevaFrecuencia = {tipo: 'diario'};
                } else if (intervalo === 7) {
                    nuevaFrecuencia = {tipo: 'semanal'};
                } else {
                    nuevaFrecuencia = {tipo: 'cadaXDias', cadaDias: intervalo};
                }
            }
            setFrecuencia(nuevaFrecuencia);
            setAdjuntos(tarea.configuracion?.adjuntos || []);
            setBadgesOcultos(tarea.configuracion?.badgesOcultos || {});
            setAsignadoA(tarea.asignadoA || null);
            setAsignadoANombre(tarea.asignadoANombre || '');
            setAsignadoAAvatar(tarea.asignadoAAvatar || '');
            setProyectoIdLocal(tarea.proyectoId);
            setCompletadoLocal(tarea.completado);
            setTags(tarea.tags || []);
            setDependencias(tarea.dependencias || []);
            setGrupoEjecucion(tarea.grupoEjecucion || null);

            guardarEstadoInicial({
                texto: tarea.texto,
                descripcion: tarea.configuracion?.descripcion || '',
                prioridad: tarea.prioridad || null,
                urgencia: tarea.urgencia || null,
                fechaMaxima: tarea.configuracion?.fechaMaxima || '',
                tieneRepeticion: !!tarea.configuracion?.repeticion,
                frecuencia: nuevaFrecuencia,
                adjuntos: tarea.configuracion?.adjuntos || [],
                asignadoA: tarea.asignadoA || null,
                tags: tarea.tags || [],
                dependencias: tarea.dependencias || []
            });
        } else {
            setTexto('');
            setDescripcion('');
            setPrioridad(null);
            setUrgencia(null);
            setFechaMaxima('');
            setTieneRepeticion(false);
            setFrecuencia({tipo: 'diario'});
            setAdjuntos([]);
            setAsignadoA(null);
            setAsignadoANombre('');
            setAsignadoAAvatar('');
            setTags([]);
            setDependencias([]);
        }
    }, [tarea?.id]);

    const manejarAsignacion = useCallback((usuarioId: number | null, nombre: string, avatar: string) => {
        setAsignadoA(usuarioId);
        setAsignadoANombre(nombre);
        setAsignadoAAvatar(avatar);
    }, []);

    const manejarCambioProyecto = useCallback(
        (nuevoProyectoId: number | undefined) => {
            setProyectoIdLocal(nuevoProyectoId);
            onCambiarProyecto?.(nuevoProyectoId);
        },
        [onCambiarProyecto]
    );

    const manejarCambioCompletado = useCallback(
        (nuevoCompletado: boolean) => {
            setCompletadoLocal(nuevoCompletado);
            onToggleCompletado?.(nuevoCompletado);
        },
        [onToggleCompletado]
    );

    const claseModal = modoEdicion ? 'panelConfiguracionContenedor modalContenedor--expandido' : 'modalContenedor--moderno';

    return {
        texto, setTexto, descripcion, setDescripcion,
        prioridad, setPrioridad, urgencia, setUrgencia,
        fechaMaxima, setFechaMaxima, tieneRepeticion, setTieneRepeticion,
        frecuencia, setFrecuencia, adjuntos, setAdjuntos, tags, setTags,
        dependencias, setDependencias, grupoEjecucion, setGrupoEjecucion,
        dificultad, setDificultad: manejarCambioDificultad,
        badgesOcultos, setBadgesOcultos,
        asignadoA, asignadoANombre, asignadoAAvatar,
        proyectoIdLocal, completadoLocal,
        modoEdicion, esMovil, claseModal,
        panelChat,
        manejarGuardar, manejarCerrarConGuardado,
        manejarAsignacion, manejarCambioProyecto, manejarCambioCompletado
    };
}

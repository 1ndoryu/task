import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {calcularCostoEstimado, extraerEstado, extraerImagenGenerada, extraerTaskId, magnificService, type ModoMagnific, type OpcionesMagnific} from '../../services/magnificService';

const STORAGE_KEY = 'magnific_last_task';
const ESTADOS_EN_PROGRESO = new Set(['pending', 'IN_PROGRESS', 'processing']);

interface TareaGuardada {
    taskId: string;
    resultadoUrl: string;
    estado: string;
    mode: ModoMagnific;
}

function guardarTarea(data: TareaGuardada): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage lleno */ }
}

function leerTareaGuardada(): TareaGuardada | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as TareaGuardada) : null;
    } catch { return null; }
}

function borrarTareaGuardada(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/* Defaults ajustados al uso real: modo precision V2, valores bajos para evitar artefactos */
const OPCIONES_BASE: Omit<OpcionesMagnific, 'image'> = {
    mode: 'precision',
    scale_factor: 2,
    optimized_for: 'standard',
    engine: 'automatic',
    prompt: '',
    creativity: 0,
    hdr: 0,
    resemblance: 0,
    fractality: 0,
    sharpen: 7,
    smart_grain: 7,
    ultra_detail: 30,
    filter_nsfw: true,
    flavor: 'photo'
};

export function usePanelEscaladorImagen() {
    const guardada = leerTareaGuardada();

    const [imagen, setImagen] = useState('');
    const [opciones, setOpciones] = useState<Omit<OpcionesMagnific, 'image'>>({
        ...OPCIONES_BASE,
        ...(guardada ? {mode: guardada.mode} : {})
    });
    const [taskId, setTaskId] = useState(guardada?.taskId ?? '');
    const [estado, setEstado] = useState(guardada?.estado ?? 'idle');
    const [resultadoUrl, setResultadoUrl] = useState(guardada?.resultadoUrl ?? '');
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [dimensionesImagen, setDimensionesImagen] = useState<{ancho: number; alto: number} | null>(null);
    /* Ref para el interval de polling — evita stale closures y permite limpiar al desmontar */
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const detenerPolling = useCallback(() => {
        if (pollingRef.current !== null) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const puedeIniciar = useMemo(() => Boolean(imagen && !cargando), [imagen, cargando]);

    const costoEstimado = useMemo(() => {
        if (!dimensionesImagen || opciones.mode !== 'precision') return null;
        const sf = typeof opciones.scale_factor === 'number' ? opciones.scale_factor : parseInt(String(opciones.scale_factor), 10);
        if (isNaN(sf) || sf <= 0) return null;
        return calcularCostoEstimado(dimensionesImagen.ancho, dimensionesImagen.alto, sf);
    }, [dimensionesImagen, opciones.mode, opciones.scale_factor]);

    const actualizarOpcion = useCallback(<K extends keyof typeof OPCIONES_BASE>(campo: K, valor: (typeof OPCIONES_BASE)[K]) => {
        setOpciones(prev => ({...prev, [campo]: valor}));
    }, []);

    const cargarArchivo = useCallback((archivo: File | null) => {
        setError(null);
        setResultadoUrl('');
        setTaskId('');
        setEstado('idle');
        if (!archivo) {
            setImagen('');
            setDimensionesImagen(null);
            return;
        }
        if (!archivo.type.startsWith('image/')) {
            setError('Selecciona una imagen válida.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            setImagen(dataUrl);
            /* Detectar dimensiones para el estimador de costo */
            const img = new Image();
            img.onload = () => setDimensionesImagen({ancho: img.naturalWidth, alto: img.naturalHeight});
            img.src = dataUrl;
        };
        reader.onerror = () => setError('No se pudo leer la imagen.');
        reader.readAsDataURL(archivo);
    }, []);

    const consultarEstado = useCallback(async (id = taskId, mode: ModoMagnific = opciones.mode) => {
        if (!id) return;
        setCargando(true);
        setError(null);
        try {
            const respuesta = await magnificService.estado(id, mode);
            const nuevoEstado = extraerEstado(respuesta);
            const generada = extraerImagenGenerada(respuesta);
            setEstado(nuevoEstado);
            if (generada) setResultadoUrl(generada);
            /* Persistir siempre para sobrevivir recargas */
            guardarTarea({taskId: id, resultadoUrl: generada, estado: nuevoEstado, mode});
            /* Si ya terminó (con o sin error), detener polling */
            if (!ESTADOS_EN_PROGRESO.has(nuevoEstado)) {
                detenerPolling();
                if (nuevoEstado === 'failed' || nuevoEstado === 'error') borrarTareaGuardada();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error consultando Magnific.');
            detenerPolling();
        } finally {
            setCargando(false);
        }
    }, [taskId, opciones.mode, detenerPolling]);

    const iniciar = useCallback(async () => {
        if (!imagen) return;
        detenerPolling();
        setCargando(true);
        setError(null);
        setResultadoUrl('');
        try {
            const respuesta = await magnificService.iniciar({...opciones, image: imagen});
            const id = extraerTaskId(respuesta);
            const estadoInicial = extraerEstado(respuesta);
            setTaskId(id);
            setEstado(estadoInicial);
            /* Guardar taskId inmediatamente — si el usuario recarga ahora no lo pierde */
            guardarTarea({taskId: id, resultadoUrl: '', estado: estadoInicial, mode: opciones.mode});
            /* Arrancar polling automático cada 5s si la tarea sigue procesando */
            if (id && ESTADOS_EN_PROGRESO.has(estadoInicial)) {
                void consultarEstado(id, opciones.mode);
                pollingRef.current = setInterval(() => void consultarEstado(id, opciones.mode), 5000);
            } else if (id) {
                void consultarEstado(id, opciones.mode);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error iniciando Magnific.');
        } finally {
            setCargando(false);
        }
    }, [imagen, opciones, consultarEstado, detenerPolling]);

    /* Limpiar polling al desmontar el panel */
    useEffect(() => detenerPolling, [detenerPolling]);

    /* Al montar: si había una tarea en progreso guardada, reanudar polling automáticamente */
    useEffect(() => {
        if (guardada?.taskId && ESTADOS_EN_PROGRESO.has(guardada.estado)) {
            void consultarEstado(guardada.taskId, guardada.mode);
            pollingRef.current = setInterval(() => void consultarEstado(guardada.taskId, guardada.mode), 5000);
        }
        // Solo al montar — deps vacías intencionadas
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {imagen, opciones, taskId, estado, resultadoUrl, error, cargando, puedeIniciar, costoEstimado, dimensionesImagen, actualizarOpcion, cargarArchivo, iniciar, consultarEstado, limpiarTarea: borrarTareaGuardada};
}
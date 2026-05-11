import {useCallback, useMemo, useState} from 'react';
import {extraerEstado, extraerImagenGenerada, extraerTaskId, magnificService, type ModoMagnific, type OpcionesMagnific} from '../../services/magnificService';

const OPCIONES_BASE: Omit<OpcionesMagnific, 'image'> = {
    mode: 'creative',
    scale_factor: '2x',
    optimized_for: 'standard',
    engine: 'automatic',
    prompt: '',
    creativity: 0,
    hdr: 0,
    resemblance: 0,
    fractality: 0,
    sharpen: 50,
    smart_grain: 7,
    ultra_detail: 30,
    filter_nsfw: true
};

export function usePanelEscaladorImagen() {
    const [imagen, setImagen] = useState('');
    const [opciones, setOpciones] = useState(OPCIONES_BASE);
    const [taskId, setTaskId] = useState('');
    const [estado, setEstado] = useState('idle');
    const [resultadoUrl, setResultadoUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const puedeIniciar = useMemo(() => Boolean(imagen && !cargando), [imagen, cargando]);

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
            return;
        }
        if (!archivo.type.startsWith('image/')) {
            setError('Selecciona una imagen válida.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setImagen(String(reader.result || ''));
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
            setEstado(nuevoEstado);
            const generada = extraerImagenGenerada(respuesta);
            if (generada) setResultadoUrl(generada);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error consultando Magnific.');
        } finally {
            setCargando(false);
        }
    }, [taskId, opciones.mode]);

    const iniciar = useCallback(async () => {
        if (!imagen) return;
        setCargando(true);
        setError(null);
        setResultadoUrl('');
        try {
            const respuesta = await magnificService.iniciar({...opciones, image: imagen});
            const id = extraerTaskId(respuesta);
            setTaskId(id);
            setEstado(extraerEstado(respuesta));
            if (id) void consultarEstado(id, opciones.mode);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error iniciando Magnific.');
        } finally {
            setCargando(false);
        }
    }, [imagen, opciones, consultarEstado]);

    return {imagen, opciones, taskId, estado, resultadoUrl, error, cargando, puedeIniciar, actualizarOpcion, cargarArchivo, iniciar, consultarEstado};
}
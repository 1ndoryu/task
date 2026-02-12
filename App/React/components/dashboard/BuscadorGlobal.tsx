/*
 * BuscadorGlobal
 * Componente de busqueda global en el header
 * Permite buscar tareas, habitos y proyectos
 */

import {useState, useEffect, useRef, useMemo} from 'react';
import {Search, CheckCircle2, Repeat, Folder, X, FileText} from 'lucide-react';
import {Boton} from '../ui';
import type {Tarea, Habito, Proyecto} from '../../types/dashboard';
import {useNotasStore} from '../../stores/notasStore';
import type {Nota} from '../../types/notas';

interface BuscadorGlobalProps {
    tareas: Tarea[];
    habitos: Habito[];
    proyectos: Proyecto[];
    onSeleccionarTarea: (tarea: Tarea) => void;
    onSeleccionarHabito: (habito: Habito) => void;
    onSeleccionarProyecto: (proyecto: Proyecto) => void;
}

type ResultadoBusqueda = {
    tipo: 'tarea' | 'habito' | 'proyecto' | 'nota';
    id: number;
    titulo: string;
    original: Tarea | Habito | Proyecto | Nota;
};

export function BuscadorGlobal({tareas, habitos, proyectos, onSeleccionarTarea, onSeleccionarHabito, onSeleccionarProyecto}: BuscadorGlobalProps): JSX.Element {
    const [busqueda, setBusqueda] = useState('');
    const [resultadosNotas, setResultadosNotas] = useState<ResultadoBusqueda[]>([]);
    const [mostrarResultados, setMostrarResultados] = useState(false);

    const contenedorRef = useRef<HTMLDivElement>(null);
    const requestIdRef = useRef(0);

    // FIX BUG-001: Eliminar suscripción al store para evitar loops de renderizado.
    // Accedemos a las acciones directamente via getState().

    /* 1. Filtrado de datos locales (Tareas, Habitos, Proyectos) - SIN EFFECT */
    const resultadosLocales = useMemo(() => {
        if (!busqueda.trim()) return [];

        const termino = busqueda.toLowerCase();
        const nuevosResultados: ResultadoBusqueda[] = [];

        tareas.forEach(tarea => {
            if (tarea.texto.toLowerCase().includes(termino)) {
                nuevosResultados.push({
                    tipo: 'tarea',
                    id: tarea.id,
                    titulo: tarea.texto,
                    original: tarea
                });
            }
        });

        habitos.forEach(habito => {
            if (habito.nombre.toLowerCase().includes(termino)) {
                nuevosResultados.push({
                    tipo: 'habito',
                    id: habito.id,
                    titulo: habito.nombre,
                    original: habito
                });
            }
        });

        proyectos.forEach(proyecto => {
            if (proyecto.nombre.toLowerCase().includes(termino)) {
                nuevosResultados.push({
                    tipo: 'proyecto',
                    id: proyecto.id,
                    titulo: proyecto.nombre,
                    original: proyecto
                });
            }
        });

        return nuevosResultados;
    }, [busqueda, tareas, habitos, proyectos]);

    /* 2. Busqueda asincrona de notas - CON EFFECT */
    /* useEffect(() => {
        if (busqueda.trim() === '') {
            setResultadosNotas(prev => (prev.length === 0 ? prev : []));
            return;
        }

        const requestId = ++requestIdRef.current;

        const timeout = setTimeout(async () => {
            // Usar getState() evita dependencias en el Effect
            const notasEncontradas = await useNotasStore.getState().buscarNotas(busqueda);
            if (requestIdRef.current !== requestId) return;

            const resultadosMapeados = notasEncontradas.map(nota => ({
                tipo: 'nota' as const,
                id: nota.id,
                titulo: nota.titulo,
                original: nota
            }));

            setResultadosNotas(resultadosMapeados);
        }, 300);

        return () => clearTimeout(timeout);
    }, [busqueda]); */

    /* 3. Combinar resultados finales */
    const resultados = useMemo(() => {
        return [...resultadosLocales, ...resultadosNotas].slice(0, 10);
    }, [resultadosLocales, resultadosNotas]);

    /* Manejo de clicks fuera */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
                setMostrarResultados(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const manejarSeleccion = (resultado: ResultadoBusqueda) => {
        if (resultado.tipo === 'tarea') {
            onSeleccionarTarea(resultado.original as Tarea);
        } else if (resultado.tipo === 'habito') {
            onSeleccionarHabito(resultado.original as Habito);
        } else if (resultado.tipo === 'proyecto') {
            onSeleccionarProyecto(resultado.original as Proyecto);
        } else if (resultado.tipo === 'nota') {
            useNotasStore.getState().seleccionarNota(resultado.original as Nota);
        }
        setBusqueda('');
        setMostrarResultados(false);
    };

    const getIcono = (tipo: 'tarea' | 'habito' | 'proyecto' | 'nota') => {
        switch (tipo) {
            case 'tarea':
                return <CheckCircle2 size={14} className="iconoResultado iconoResultado--tarea" />;
            case 'habito':
                return <Repeat size={14} className="iconoResultado iconoResultado--habito" />;
            case 'proyecto':
                return <Folder size={14} className="iconoResultado iconoResultado--proyecto" />;
            case 'nota':
                return <FileText size={14} className="iconoResultado iconoResultado--nota" />;
        }
    };

    return (
        <div className="buscadorGlobal" ref={contenedorRef}>
            <div className={`buscadorInputWrapper ${mostrarResultados && resultados.length > 0 ? 'activo' : ''}`}>
                <Search size={14} className="buscadorIcono" />
                <input
                    type="text"
                    className="buscadorInput"
                    placeholder="Buscar..."
                    value={busqueda}
                    onChange={e => {
                        setBusqueda(e.target.value);
                        setMostrarResultados(true);
                    }}
                    onFocus={() => setMostrarResultados(true)}
                />
                {busqueda && (
                    <Boton
                        variante="icono"
                        onClick={() => setBusqueda('')}
                        icono={<X size={12} />}
                        claseAdicional="buscadorLimpiar"
                    />
                )}
            </div>

            {mostrarResultados && busqueda && resultados.length > 0 && (
                <div className="buscadorResultados">
                    {resultados.map((resultado, index) => (
                        <div key={`${resultado.tipo}-${resultado.id}-${index}`} className="buscadorItem" onClick={() => manejarSeleccion(resultado)}>
                            {getIcono(resultado.tipo)}
                            <span className="buscadorItemTitulo">{resultado.titulo}</span>
                            <span className="buscadorItemTipo">{resultado.tipo}</span>
                        </div>
                    ))}
                </div>
            )}

            {mostrarResultados && busqueda && resultados.length === 0 && (
                <div className="buscadorResultados">
                    <div className="buscadorSinResultados">No se encontraron resultados</div>
                </div>
            )}
        </div>
    );
}

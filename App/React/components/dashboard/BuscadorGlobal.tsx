/*
 * BuscadorGlobal
 * Componente de busqueda global en el header
 * Permite buscar tareas, habitos y proyectos
 */

import {Search, CheckCircle2, Repeat, Folder, X, FileText} from 'lucide-react';
import {Boton, Input} from '../ui';
import {useBuscadorGlobal} from '../../hooks/dashboard/useBuscadorGlobal';
import type {Tarea, Habito, Proyecto} from '../../types/dashboard';

interface BuscadorGlobalProps {
    tareas: Tarea[];
    habitos: Habito[];
    proyectos: Proyecto[];
    onSeleccionarTarea: (tarea: Tarea) => void;
    onSeleccionarHabito: (habito: Habito) => void;
    onSeleccionarProyecto: (proyecto: Proyecto) => void;
}

export function BuscadorGlobal({tareas, habitos, proyectos, onSeleccionarTarea, onSeleccionarHabito, onSeleccionarProyecto}: BuscadorGlobalProps): JSX.Element {
    const {busqueda, setBusqueda, mostrarResultados, setMostrarResultados, contenedorRef, resultados, manejarSeleccion} = useBuscadorGlobal({tareas, habitos, proyectos, onSeleccionarTarea, onSeleccionarHabito, onSeleccionarProyecto});

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
                <Input
                    tipo="text"
                    claseAdicional="buscadorInput"
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

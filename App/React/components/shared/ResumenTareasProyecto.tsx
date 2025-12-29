/*
 * ResumenTareasProyecto
 * Contador compacto de progreso de tareas en un proyecto
 * Estilo Linear: contadores inline con barra de progreso mini
 *
 * Fase 9.2.7: Resumen de tareas en el modal de proyecto
 */

import {CheckCircle2, Circle, ArrowRight} from 'lucide-react';

interface ResumenTareasProyectoProps {
    /* Numero de tareas completadas */
    completadas: number;
    /* Numero de tareas pendientes */
    pendientes: number;
    /* Mostrar barra de progreso mini */
    mostrarBarra?: boolean;
    /* Callback para "Ver todas" */
    onVerTodas?: () => void;
}

export function ResumenTareasProyecto({completadas, pendientes, mostrarBarra = true, onVerTodas}: ResumenTareasProyectoProps): JSX.Element {
    const total = completadas + pendientes;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    return (
        <div className="resumenTareasProyecto">
            {/* Contador de completadas */}
            <div className="resumenTareasProyecto__contador resumenTareasProyecto__contador--completadas">
                <CheckCircle2 size={14} />
                <span>{completadas} completadas</span>
            </div>

            <span className="resumenTareasProyecto__separador">│</span>

            {/* Contador de pendientes */}
            <div className="resumenTareasProyecto__contador resumenTareasProyecto__contador--pendientes">
                <Circle size={14} />
                <span>{pendientes} pendientes</span>
            </div>

            {/* Barra de progreso opcional */}
            {mostrarBarra && total > 0 && (
                <div className="barraProgresoMini">
                    <div className="barraProgresoMini__relleno" style={{width: `${porcentaje}%`}} />
                </div>
            )}

            {/* Link para ver todas */}
            {onVerTodas && (
                <button type="button" className="resumenTareasProyecto__link" onClick={onVerTodas}>
                    <span>Ver todas</span>
                    <ArrowRight size={12} />
                </button>
            )}
        </div>
    );
}

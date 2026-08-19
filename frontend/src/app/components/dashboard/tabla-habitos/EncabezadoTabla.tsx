/*
 * components/dashboard/tabla-habitos/EncabezadoTabla.tsx
 * [H-F13-01] Encabezado de la tabla de hábitos: las columnas visibles según
 * configuracion.columnasVisibles, sobre el mismo grid que las filas.
 */

import type {CSSProperties} from 'react';
import type {ConfiguracionHabitos} from '../../../hooks/useConfiguracionHabitos';

interface EncabezadoTablaProps {
    configuracion: ConfiguracionHabitos;
    estiloGrid: CSSProperties;
}

export function EncabezadoTabla({configuracion, estiloGrid}: EncabezadoTablaProps): JSX.Element {
    return (
        <div className="tablaEncabezado" style={estiloGrid}>
            {configuracion.columnasVisibles.indice && <div className="tablaColumnaCheckbox"></div>}
            <div className="tablaColumnaNombre">HABITO</div>
            {configuracion.columnasVisibles.historial && <div className="tablaColumnaHistorial">ACTIVIDAD</div>}
            {configuracion.columnasVisibles.importancia && <div className="tablaColumnaPrioridad">PRIO</div>}
            {configuracion.columnasVisibles.inactividad && <div className="tablaColumnaInactividad">DIAS</div>}
            {configuracion.columnasVisibles.urgencia && <div className="tablaColumnaUrgencia">URGENCIA</div>}
            {configuracion.columnasVisibles.racha && <div className="tablaColumnaRacha">RACHA</div>}
            {configuracion.columnasVisibles.acciones && <div className="tablaColumnaAcciones"></div>}
        </div>
    );
}

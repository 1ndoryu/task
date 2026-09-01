/*
 * SeccionPanel
 * Componente contenedor para secciones en formularios y paneles.
 * [318A-3 §12.4] Contrato del sistema centralizado: SeccionPanel AGRUPA
 * (titulo/icono + contenido); los campos individuales van DENTRO con
 * FormCampo (campo suelto) o FormularioConfiguracion (lista declarativa de
 * CampoEspecificacion). No renderiza controles por si mismo.
 */

import {ReactNode} from 'react';

interface SeccionPanelProps {
    titulo: string;
    icono?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function SeccionPanel({titulo, icono, children, className = ''}: SeccionPanelProps): JSX.Element {
    return (
        <div className={`seccionPanel ${className}`}>
            <div className="seccionPanelEncabezado">
                {icono && <span className="seccionPanelIcono">{icono}</span>}
                <span className="seccionPanelTitulo">{titulo}</span>
            </div>
            <div className="seccionPanelContenido">{children}</div>
        </div>
    );
}

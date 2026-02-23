/*
 * PestanasModal
 *
 * @deprecated Fase 10.8.6 - Este componente ya no se usa.
 * Las pestañas de Configuración/Chat se eliminaron porque en móvil
 * ahora solo se muestra la vista de configuración.
 *
 * Se mantiene temporalmente por si hay referencias, pero debería
 * eliminarse completamente en una futura limpieza de código.
 *
 * Anteriormente: Componente para pestañas responsive en modales (configuración/chat)
 * Responsabilidad única: Renderizar las pestañas de navegación mobile
 * Visible solo en pantallas pequeñas (CSS controla visibilidad)
 */

import {useMemo} from 'react';
import {Boton} from '../ui/Boton';

type PestanaId = 'configuracion' | 'chat';

interface PestanaConfig {
    id: PestanaId;
    etiqueta: string;
}

interface PestanasModalProps {
    /* Pestaña actualmente activa */
    pestanaActiva: PestanaId;
    /* Callback al cambiar de pestaña */
    onCambiar: (pestana: PestanaId) => void;
    /* Etiquetas personalizadas (opcional) */
    etiquetas?: {
        configuracion?: string;
        chat?: string;
    };
    /* Si mostrar indicador de notificaciones en pestaña de chat */
    tieneNotificaciones?: boolean;
}

const PESTANAS_DEFAULT: PestanaConfig[] = [
    {id: 'configuracion', etiqueta: 'Configuración'},
    {id: 'chat', etiqueta: 'Chat / Historial'}
];

export function PestanasModal({pestanaActiva, onCambiar, etiquetas, tieneNotificaciones = false}: PestanasModalProps): JSX.Element {
    /* Pestañas con etiquetas personalizadas si se proporcionan */
    const pestanas = useMemo(() => {
        if (!etiquetas) return PESTANAS_DEFAULT;

        return PESTANAS_DEFAULT.map(p => ({
            ...p,
            etiqueta: etiquetas[p.id] || p.etiqueta
        }));
    }, [etiquetas]);

    return (
        <div className="panelConfiguracionPestanas">
            {pestanas.map(pestana => (
                <Boton key={pestana.id} type="button" variante="pestaña" activo={pestanaActiva === pestana.id} onClick={() => onCambiar(pestana.id)}>
                    {pestana.etiqueta}
                    {pestana.id === 'chat' && tieneNotificaciones && <span className="pestanaIndicador" />}
                </Boton>
            ))}
        </div>
    );
}

export type {PestanaId, PestanasModalProps};

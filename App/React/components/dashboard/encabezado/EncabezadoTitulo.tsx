import {useMemo} from 'react';
import {obtenerTituloPanelMovil, paginaMovilAPanelId} from '../../../config/registroPaneles';

interface EncabezadoTituloProps {
    titulo: string;
    paginaMovilActiva?: string;
    esTablet: boolean;
}

export function EncabezadoTitulo({titulo, paginaMovilActiva, esTablet}: EncabezadoTituloProps) {
    const tituloFinal = useMemo(() => {
        if (!esTablet || !paginaMovilActiva) return titulo;
        const panelId = paginaMovilAPanelId(paginaMovilActiva);
        return obtenerTituloPanelMovil(panelId || paginaMovilActiva);
    }, [esTablet, paginaMovilActiva, titulo]);

    return (
        <div className="encabezadoIzquierda">
            <span className="encabezadoTitulo">{tituloFinal}</span>
        </div>
    );
}

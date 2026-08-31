import {useMemo} from 'react';
import {obtenerTituloPanelMovil, paginaMovilAPanelId} from '../../../config/registroPaneles';

interface EncabezadoTituloProps {
    titulo: string;
    paginaMovilActiva?: string;
    esTablet: boolean;
    /* [318A-2] Contenido opcional que reemplaza al título (ej.: botones de
     * vista en el Modo Vistas). Se renderiza en la misma zona izquierda. */
    children?: React.ReactNode;
}

export function EncabezadoTitulo({titulo, paginaMovilActiva, esTablet, children}: EncabezadoTituloProps) {
    const tituloFinal = useMemo(() => {
        if (!esTablet || !paginaMovilActiva) return titulo;
        const panelId = paginaMovilAPanelId(paginaMovilActiva);
        return obtenerTituloPanelMovil(panelId || paginaMovilActiva);
    }, [esTablet, paginaMovilActiva, titulo]);

    return (
        <div className="encabezadoIzquierda">
            <span className="encabezadoTitulo">{tituloFinal}</span>
            {children}
        </div>
    );
}

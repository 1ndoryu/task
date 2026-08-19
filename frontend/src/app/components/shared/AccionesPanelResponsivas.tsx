/*
 * AccionesPanelResponsivas
 * [19-08-2026] Envuelve las acciones del encabezado de un panel (.seccionAcciones).
 * Si el contenido desborda el ancho disponible del panel, colapsa todo a un botón
 * de 3 puntos (MoreHorizontal) que abre un popover con las mismas acciones en
 * columna. Reutiliza los botones tal cual (mismos handlers), solo cambia el layout.
 *
 * Por qué: los paneles se pueden encoger (split/columnas) y los encabezados con
 * muchos botones (filtro, orden, config, enfoque, dividir, minimizar) se rompían
 * al desbordar. La copia invisible (seccionAccionesMedidor) mide el ancho real de
 * las acciones sin afectar el layout visible.
 */

import {useLayoutEffect, useEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {MoreHorizontal} from 'lucide-react';
import {Boton} from '../ui';

interface AccionesPanelResponsivasProps {
    children: ReactNode;
}

export function AccionesPanelResponsivas({children}: AccionesPanelResponsivasProps): JSX.Element {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const medidorRef = useRef<HTMLDivElement>(null);
    const [colapsado, setColapsado] = useState(false);
    const [abierto, setAbierto] = useState(false);
    const [posicion, setPosicion] = useState({x: 0, y: 0});

    /* Medir contra el ancho del HEADER (no del propio contenedor): cuando el
     * contenedor colapsa se encoge a un solo botón, así que medirse a sí mismo
     * crearía un deadlock y nunca se restauraría. El header (flex con el título)
     * tiene el ancho estable del panel. */
    useLayoutEffect(() => {
        const contenedor = contenedorRef.current;
        const medidor = medidorRef.current;
        if (!contenedor || !medidor) return;

        const actualizar = () => {
            const header = contenedor.parentElement;
            if (!header) return;
            const titulo = header.querySelector('.seccionTitulo');
            const anchoTitulo = titulo ? titulo.getBoundingClientRect().width : 0;
            /* margen de seguridad: paddings/gaps del header */
            const anchoDisponible = header.clientWidth - anchoTitulo - 24;
            setColapsado(medidor.scrollWidth > anchoDisponible);
        };
        actualizar();

        const header = contenedor.parentElement;
        const observador = new ResizeObserver(actualizar);
        if (header) observador.observe(header);
        observador.observe(contenedor);
        return () => observador.disconnect();
    }, [children]);

    /* Cerrar el popover con click fuera o Escape */
    useEffect(() => {
        if (!abierto) return;
        const cerrarPorClick = (evento: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
                setAbierto(false);
            }
        };
        const cerrarPorTecla = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') setAbierto(false);
        };
        document.addEventListener('mousedown', cerrarPorClick);
        document.addEventListener('keydown', cerrarPorTecla);
        return () => {
            document.removeEventListener('mousedown', cerrarPorClick);
            document.removeEventListener('keydown', cerrarPorTecla);
        };
    }, [abierto]);

    const abrirMenu = (evento: React.MouseEvent) => {
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setPosicion({x: rect.left, y: rect.bottom + 4});
        setAbierto(previo => !previo);
    };

    return (
        <div className="seccionAcciones" ref={contenedorRef}>
            {/* Copia invisible para medir el ancho real de las acciones */}
            <div ref={medidorRef} className="seccionAccionesMedidor" aria-hidden="true">
                {children}
            </div>

            {colapsado ? (
                <>
                    <Boton
                        type="button"
                        variante="ghost"
                        soloIcono
                        onClick={abrirMenu}
                        title="Más acciones"
                        icono={<MoreHorizontal size={14} />}
                    />
                    {abierto && createPortal(
                        <div className="seccionAccionesPopover" style={{left: posicion.x, top: posicion.y}} role="menu">
                            {children}
                        </div>,
                        document.body
                    )}
                </>
            ) : (
                children
            )}
        </div>
    );
}

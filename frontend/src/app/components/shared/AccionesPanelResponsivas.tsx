/*
 * AccionesPanelResponsivas
 * [19-08-2026] Envuelve las acciones del encabezado de un panel (.seccionAcciones).
 * Si el contenido desborda el ancho disponible del panel, colapsa todo a un botón
 * de 3 puntos (MoreHorizontal) que abre un MenuContextual real con las mismas
 * acciones: cada botón de acción se convierte en una opción con su icono y una
 * etiqueta corta (sin tooltip nativo), y los selectores (grupo, filtro, orden)
 * se convierten en opciones con submenú que ejecutan su onChange original.
 *
 * Por qué: los paneles se pueden encoger (split/columnas) y los encabezados con
 * muchos botones (filtro, orden, config, enfoque, dividir, minimizar) se rompían
 * al desbordar. La copia invisible (seccionAccionesMedidor) mide el ancho real de
 * las acciones sin afectar el layout visible.
 */

import {useLayoutEffect, useRef, useState, Children, Fragment, isValidElement, type ReactNode} from 'react';
import {MoreHorizontal, FolderOpen} from 'lucide-react';
import {Boton} from '../ui';
import {MenuContextual, type OpcionMenu} from './MenuContextual';

interface AccionesPanelResponsivasProps {
    children: ReactNode;
}

/* Etiqueta corta: recorta el title/titulo en los dos puntos
 * (p. ej. "Filtrar tareas: Tareas sueltas" → "Filtrar tareas"). */
function etiquetaCortaDe(bruto: string): string {
    return bruto.split(':')[0].trim();
}

interface MenuPreparado {
    opciones: OpcionMenu[];
    acciones: Map<string, () => void>;
    /* [19-08-2026] Selectores convertidos a submenús: mapea el id-base de la
     * opción padre con el manejador que aplica el valor elegido al onChange
     * original del selector ('' = "Sin grupo" para el selector de grupo). */
    manejadoresSelector: Map<string, (valor: string) => void>;
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

    /* [19-08-2026] Convierte las acciones del header en opciones de menu:
     * - Botones de acción (Boton con icono + onClick) → OpcionMenu (icono +
     *   etiqueta corta, sin tooltip). Al seleccionarlas se ejecuta su onClick.
     * - Selectores (SelectorBadge/SelectorGrupo) → opciones con subOpciones que
     *   ejecutan su onChange, con el valor actual marcado con check. */
    const prepararMenu = (): MenuPreparado => {
        const opciones: OpcionMenu[] = [];
        const acciones = new Map<string, () => void>();
        const manejadoresSelector = new Map<string, (valor: string) => void>();
        let indiceSelector = 0;

        const recorrer = (nodos: ReactNode) => {
            Children.forEach(nodos, hijo => {
                if (!isValidElement(hijo)) return;
                /* Aplanar fragmentos: los paneles pasan sus acciones dentro de un <></> */
                if (hijo.type === Fragment) {
                    recorrer((hijo.props as {children?: ReactNode}).children);
                    return;
                }
                const props = hijo.props as Record<string, unknown>;
                const onClick = props.onClick;

                /* Selector de grupo (SelectorGrupo variante badge): grupos: string[] */
                if (Array.isArray(props.grupos) && typeof props.onChange === 'function') {
                    const grupos = props.grupos as string[];
                    const grupoActual = props.grupoActual as string | null;
                    const onChange = props.onChange as (grupo: string | null) => void;
                    const titulo = typeof props.titulo === 'string' ? props.titulo : 'Grupo';
                    const idBase = `selector-grupo-${indiceSelector++}`;
                    opciones.push({
                        id: idBase,
                        etiqueta: titulo,
                        icono: <FolderOpen size={12} />,
                        subOpciones: [
                            {id: `${idBase}::`, etiqueta: 'Sin grupo', marcada: grupoActual === null},
                            ...grupos.map(g => ({id: `${idBase}::${g}`, etiqueta: g, marcada: grupoActual === g}))
                        ]
                    });
                    manejadoresSelector.set(idBase, valor => onChange(valor === '' ? null : valor));
                    return;
                }

                /* SelectorBadge: opciones: {id, etiqueta, icono}[] */
                if (Array.isArray(props.opciones) && typeof props.onChange === 'function') {
                    const opcionesBadge = props.opciones as {id: string; etiqueta: string; icono?: ReactNode}[];
                    const valorActual = props.valorActual as string;
                    const onChange = props.onChange as (valor: string) => void;
                    const titulo = typeof props.titulo === 'string' ? props.titulo : '';
                    const idBase = `selector-badge-${indiceSelector++}`;
                    const opcionActual = opcionesBadge.find(o => o.id === valorActual);
                    opciones.push({
                        id: idBase,
                        etiqueta: titulo,
                        /* El icono del padre: el propio del selector o el de la opción activa */
                        icono: (props.icono as ReactNode) || opcionActual?.icono,
                        subOpciones: opcionesBadge.map(o => ({
                            id: `${idBase}::${o.id}`,
                            etiqueta: o.etiqueta,
                            icono: o.icono,
                            marcada: o.id === valorActual
                        }))
                    });
                    manejadoresSelector.set(idBase, onChange);
                    return;
                }

                /* Botón de acción: Boton con icono + onClick */
                if (typeof onClick === 'function' && 'icono' in props) {
                    const id = `accion-${opciones.length}`;
                    opciones.push({
                        id,
                        etiqueta: etiquetaCortaDe((typeof props.title === 'string' && props.title) || ''),
                        icono: props.icono as ReactNode,
                        deshabilitado: !!props.disabled
                    });
                    acciones.set(id, () => (onClick as () => void)());
                }
            });
        };
        recorrer(children);

        return {opciones, acciones, manejadoresSelector};
    };

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
                    {/* [19-08-2026] Misma variante que los iconos que agrupa
                     * (boton--badge soloIcono): transparente, sin borde, icono 12px. */}
                    <Boton
                        type="button"
                        variante="badge"
                        soloIcono
                        onClick={abrirMenu}
                        title="Más acciones"
                        icono={<MoreHorizontal size={12} />}
                    />
                    {abierto && (() => {
                        const menu = prepararMenu();
                        return (
                            <MenuContextual
                                opciones={menu.opciones}
                                posicionX={posicion.x}
                                posicionY={posicion.y}
                                onSeleccionar={id => {
                                    const indiceSep = id.indexOf('::');
                                    if (indiceSep !== -1) {
                                        const base = id.slice(0, indiceSep);
                                        const valor = id.slice(indiceSep + 2);
                                        const manejador = menu.manejadoresSelector.get(base);
                                        if (manejador) manejador(valor);
                                    } else {
                                        const accion = menu.acciones.get(id);
                                        if (accion) accion();
                                    }
                                    setAbierto(false);
                                }}
                                onCerrar={() => setAbierto(false)}
                            />
                        );
                    })()}
                </>
            ) : (
                children
            )}
        </div>
    );
}

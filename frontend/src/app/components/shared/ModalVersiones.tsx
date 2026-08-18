/* [303A-7] Lazy loading por scroll: carga versiones de a 3 al hacer scroll.
 * Se eliminó la carga de todas las versiones simultáneamente. */
import React, {useState, useCallback, useRef} from 'react';
import {Modal} from './Modal';
import {HISTORIAL_VERSIONES, Version, Cambio} from '../../data/changelog';
import {Tag, Calendar, CheckCircle, PlusCircle, Wrench} from 'lucide-react';
import '../../styles/dashboard/shared/modalVersiones.css';

interface ModalVersionesProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

const VERSIONES_POR_LOTE = 3;

const IconoTipoCambio = ({tipo}: {tipo: Cambio['tipo']}) => {
    switch (tipo) {
        case 'nuevo':
            return <PlusCircle size={14} className="iconoCambio iconoNuevo" />;
        case 'mejora':
            return <CheckCircle size={14} className="iconoCambio iconoMejora" />;
        case 'arreglo':
            return <Wrench size={14} className="iconoCambio iconoArreglo" />;
        default:
            return <Tag size={14} className="iconoCambio" />;
    }
};

const ItemCambio = ({cambio}: {cambio: Cambio}) => (
    <li className={`itemCambio tipo-${cambio.tipo}`}>
        <IconoTipoCambio tipo={cambio.tipo} />
        <span className="textoCambio">{cambio.descripcion}</span>
    </li>
);

const GrupoVersion = ({version}: {version: Version}) => (
    <div className="grupoVersion">
        <div className="encabezadoVersion">
            <div className="infoVersion">
                <Tag size={16} className="iconoVersion" />
                <span className="numeroVersion">{version.version}</span>
            </div>
            <div className="fechaVersion">
                <Calendar size={14} className="iconoFecha" />
                <span>{version.fecha}</span>
            </div>
        </div>
        <ul className="listaCambios">
            {version.cambios.map((cambio) => (
                <ItemCambio key={cambio.descripcion} cambio={cambio} />
            ))}
        </ul>
    </div>
);

export const ModalVersiones: React.FC<ModalVersionesProps> = ({estaAbierto, onCerrar}) => {
    const [cantidadVisible, setCantidadVisible] = useState(VERSIONES_POR_LOTE);
    const refContenedor = useRef<HTMLDivElement>(null);

    const versionesVisibles = HISTORIAL_VERSIONES.slice(0, cantidadVisible);
    const hayMas = cantidadVisible < HISTORIAL_VERSIONES.length;

    const manejarScroll = useCallback(() => {
        const el = refContenedor.current;
        if (!el || !hayMas) return;
        const cerca = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (cerca) setCantidadVisible(prev => Math.min(prev + VERSIONES_POR_LOTE, HISTORIAL_VERSIONES.length));
    }, [hayMas]);

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Historial de Versiones" claseContenido="modalContenidoVersiones">
            <div className="contenedorVersiones" ref={refContenedor} onScroll={manejarScroll}>
                {versionesVisibles.map((version) => (
                    <GrupoVersion key={version.version} version={version} />
                ))}
                {hayMas && <div className="contenedorVersionesCargando">Desliza para ver más versiones...</div>}
            </div>
        </Modal>
    );
};

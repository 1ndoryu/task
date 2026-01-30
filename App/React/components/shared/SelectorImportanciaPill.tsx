/*
 * SelectorImportanciaPill
 * Selector de importancia estilo pill con menu contextual
 * Fase 9.5: Adapta SelectorNivel para importancia al patron de PropiedadesCompactas
 */

import {useState, useRef} from 'react';
import {Star} from 'lucide-react';
import type {NivelImportancia} from '../../types/dashboard';
import {MenuContextual} from './MenuContextual';

interface SelectorImportanciaPillProps {
    importancia: NivelImportancia;
    onChange: (importancia: NivelImportancia) => void;
    deshabilitado?: boolean;
}

const OPCIONES_IMPORTANCIA: {id: NivelImportancia; etiqueta: string; color: string}[] = [
    {id: 'Muy Alta', etiqueta: 'Muy Alta', color: 'var(--dashboard-estadoMuyAlta)'},
    {id: 'Alta', etiqueta: 'Alta', color: 'var(--dashboard-estadoAlta)'},
    {id: 'Media', etiqueta: 'Media', color: 'var(--dashboard-estadoMedia)'},
    {id: 'Baja', etiqueta: 'Baja', color: 'var(--dashboard-textoApagado)'}
];

export function SelectorImportanciaPill({importancia, onChange, deshabilitado = false}: SelectorImportanciaPillProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);

    const importanciaActual = OPCIONES_IMPORTANCIA.find(op => op.id === importancia) || OPCIONES_IMPORTANCIA[1];

    const abrirMenu = () => {
        if (deshabilitado) return;
        if (botonRef.current) {
            const rect = botonRef.current.getBoundingClientRect();
            setPosicionMenu({x: rect.left, y: rect.bottom + 4});
        }
        setMenuAbierto(true);
    };

    const cerrarMenu = () => setMenuAbierto(false);

    const opcionesMenu = OPCIONES_IMPORTANCIA.map(op => ({
        id: op.id,
        etiqueta: op.etiqueta,
        icono: <Star size={12} fill={(op.id === 'Alta' || op.id === 'Muy Alta') ? op.color : 'none'} />
    }));

    return (
        <div className="propiedadesCompactas__item">
            <button ref={botonRef} type="button" className={`pillOpcion ${importancia === 'Media' ? 'pillOpcion--vacio' : ''} ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirMenu} title="Importancia" style={importancia !== 'Media' ? {color: importanciaActual.color} : undefined}>
                <Star size={14} fill={(importancia === 'Alta' || importancia === 'Muy Alta') ? importanciaActual.color : 'none'} />
                <span>{importanciaActual.etiqueta}</span>
            </button>

            {menuAbierto && (
                <MenuContextual
                    opciones={opcionesMenu}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        onChange(id as NivelImportancia);
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}
        </div>
    );
}

export type {SelectorImportanciaPillProps};

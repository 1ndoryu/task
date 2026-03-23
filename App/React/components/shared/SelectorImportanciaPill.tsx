/*
 * SelectorImportanciaPill
 * Selector de importancia estilo pill con menu contextual
 * Fase 9.5: Adapta SelectorNivel para importancia al patron de PropiedadesCompactas
 */

import {useState, useRef} from 'react';
import {Star} from 'lucide-react';
import type {NivelImportancia} from '../../types/dashboard';
import {MenuContextual} from './MenuContextual';
import {Boton} from '../ui';
import {COLORES_IMPORTANCIA, ETIQUETAS_IMPORTANCIA, opcionesMenuImportancia} from '../../utils/nivelesConfig';

interface SelectorImportanciaPillProps {
    importancia: NivelImportancia;
    onChange: (importancia: NivelImportancia) => void;
    deshabilitado?: boolean;
}

export function SelectorImportanciaPill({importancia, onChange, deshabilitado = false}: SelectorImportanciaPillProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);

    const color = COLORES_IMPORTANCIA[importancia];
    const etiqueta = ETIQUETAS_IMPORTANCIA[importancia];
    const rellenar = importancia === 'Alta' || importancia === 'Muy Alta';

    const abrirMenu = () => {
        if (deshabilitado) return;
        if (botonRef.current) {
            const rect = botonRef.current.getBoundingClientRect();
            setPosicionMenu({x: rect.left, y: rect.bottom + 4});
        }
        setMenuAbierto(true);
    };

    const cerrarMenu = () => setMenuAbierto(false);

    return (
        <div className="propiedadesCompactas__item">
            <Boton ref={botonRef} type="button" variante="ghost" claseAdicional={`pillOpcion ${importancia === 'Media' ? 'pillOpcion--vacio' : ''} ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirMenu} title="Importancia" style={importancia !== 'Media' ? {color} : undefined}>
                <Star size={14} fill={rellenar ? color : 'none'} />
                <span>{etiqueta}</span>
            </Boton>

            {menuAbierto && (
                <MenuContextual
                    opciones={opcionesMenuImportancia(12)}
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

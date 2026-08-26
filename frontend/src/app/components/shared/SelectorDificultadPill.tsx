/*
 * SelectorDificultadPill
 * Selector de dificultad estilo pill con menu contextual.
 * Misma escala de 5 niveles que la importancia (Muy Baja..Muy Alta), reutiliza
 * el mismo color por nivel y el icono Gauge. Se usa en la configuracion de
 * tarea junto a la importancia/prioridad (plugin EXP).
 */

import {useState, useRef} from 'react';
import {Gauge} from 'lucide-react';
import {MenuContextual} from './MenuContextual';
import {Boton} from '../ui';
import {COLORES_DIFICULTAD, ETIQUETAS_DIFICULTAD, opcionesMenuDificultad, type DificultadNivel} from '../../utils/nivelesConfig';

interface SelectorDificultadPillProps {
    dificultad: DificultadNivel;
    onChange: (dificultad: DificultadNivel) => void;
    deshabilitado?: boolean;
}

export function SelectorDificultadPill({dificultad, onChange, deshabilitado = false}: SelectorDificultadPillProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);

    const color = COLORES_DIFICULTAD[dificultad];
    const etiqueta = ETIQUETAS_DIFICULTAD[dificultad];

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
            <Boton ref={botonRef} type="button" variante="ghost" claseAdicional={`pillOpcion ${dificultad === 'Media' ? 'pillOpcion--vacio' : ''} ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirMenu} title="Dificultad" style={dificultad !== 'Media' ? {color} : undefined}>
                {/* [28-08-2026] Sin relleno: el nivel se comunica con el color, igual que los demas niveles. */}
                <Gauge size={14} />
                <span>{etiqueta}</span>
            </Boton>

            {menuAbierto && (
                <MenuContextual
                    opciones={opcionesMenuDificultad(12)}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        onChange(id as DificultadNivel);
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}
        </div>
    );
}

export type {SelectorDificultadPillProps};
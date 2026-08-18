/*
 * MenuContextualAdaptivo
 * Wrapper que detecta el dispositivo y muestra MenuContextual o BottomSheet
 * Fase 10.2: Integrar BottomSheet con MenuContextual
 *
 * - En desktop/tablet: usa MenuContextual tradicional
 * - En móvil (<= 480px): usa BottomSheet
 */

import {useEsMovil} from '../../hooks/useEsMovil';
import {MenuContextual} from './MenuContextual';
import {BottomSheet} from './BottomSheet';
import type {OpcionMenu} from './MenuContextual';
import {Boton} from '../ui';

interface MenuContextualAdaptivoProps {
    opciones: OpcionMenu[];
    posicionX: number;
    posicionY: number;
    onSeleccionar: (opcionId: string) => void;
    onCerrar: () => void;
    titulo?: string /* Solo usado en BottomSheet */;
}

export function MenuContextualAdaptivo({opciones, posicionX, posicionY, onSeleccionar, onCerrar, titulo = 'Opciones'}: MenuContextualAdaptivoProps): JSX.Element {
    const {esMovil} = useEsMovil();

    /* En móvil, usar BottomSheet */
    if (esMovil) {
        const manejarSeleccion = (opcionId: string) => {
            onSeleccionar(opcionId);
            onCerrar();
        };

        return (
            <BottomSheet estaAbierto={true} onCerrar={onCerrar} titulo={titulo}>
                {opciones.map(opcion => (
                    <div key={opcion.id}>
                        <Boton type="button" claseAdicional={`bottomSheetItem ${opcion.peligroso ? 'bottomSheetItem--peligro' : ''}`} onClick={() => !opcion.deshabilitado && manejarSeleccion(opcion.id)} disabled={opcion.deshabilitado}>
                            {opcion.icono && <span className="bottomSheetItem__icono">{opcion.icono}</span>}
                            <span className="bottomSheetItem__texto">{opcion.etiqueta}</span>
                        </Boton>
                        {opcion.separadorDespues && <div className="bottomSheetSeparador" />}
                    </div>
                ))}
            </BottomSheet>
        );
    }

    /* En desktop/tablet, usar MenuContextual tradicional */
    return <MenuContextual opciones={opciones} posicionX={posicionX} posicionY={posicionY} onSeleccionar={onSeleccionar} onCerrar={onCerrar} />;
}

export type {MenuContextualAdaptivoProps};

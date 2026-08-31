/*
 * SelectorVistas
 *
 * [318A-2] Botones de las vistas del Modo Vistas. Se renderizan dentro del
 * encabezado (cuadro). Permite: activar una vista, crear una nueva, renombrar,
 * duplicar, eliminar.
 *
 * Diseño: fila de botones tipo pestaña (botón por vista, activo resaltado) +
 * botón "+" para crear + menú contextual por vista (renombrar/duplicar/eliminar).
 * Monocromo: sin colores, bordes 0, sin sombras (tokens --dashboard-*).
 */

import {useCallback, useState} from 'react';
import {Plus, MoreHorizontal, Pencil, Copy, Trash2} from 'lucide-react';
import type {Vista} from '../../../types/vistas';
import {Boton} from '../../ui';

interface SelectorVistasProps {
    vistas: Vista[];
    vistaActivaId: string;
    onSeleccionar: (vistaId: string) => void;
    onCrear: () => void;
    onRenombrar: (vistaId: string, nombre: string) => void;
    onDuplicar: (vistaId: string) => void;
    onEliminar: (vistaId: string) => void;
}

export function SelectorVistas({vistas, vistaActivaId, onSeleccionar, onCrear, onRenombrar, onDuplicar, onEliminar}: SelectorVistasProps): JSX.Element {
    const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);

    const toggleMenu = useCallback((vistaId: string) => {
        setMenuAbiertoId(prev => prev === vistaId ? null : vistaId);
    }, []);

    return (
        <div className="selectorVistas">
            {vistas.map(vista => (
                <div key={vista.id} className="selectorVistasItem">
                    <Boton
                        variante={vista.id === vistaActivaId ? 'primario' : 'secundario'}
                        onClick={() => onSeleccionar(vista.id)}
                        title={vista.nombre}
                    >
                        {vista.nombre}
                    </Boton>
                    <div className="selectorVistasMenuWrap">
                        <Boton variante="badge" soloIcono onClick={() => toggleMenu(vista.id)} icono={<MoreHorizontal size={12} />} title="Opciones de vista" />
                        {menuAbiertoId === vista.id && (
                            <div className="selectorVistasMenu">
                                <Boton variante="badge" soloIcono onClick={() => { onRenombrar(vista.id, prompt('Nombre de la vista:', vista.nombre) || vista.nombre); setMenuAbiertoId(null); }} icono={<Pencil size={12} />} title="Renombrar" />
                                <Boton variante="badge" soloIcono onClick={() => { onDuplicar(vista.id); setMenuAbiertoId(null); }} icono={<Copy size={12} />} title="Duplicar" />
                                <Boton variante="badge" soloIcono onClick={() => { onEliminar(vista.id); setMenuAbiertoId(null); }} icono={<Trash2 size={12} />} title="Eliminar" disabled={vistas.length <= 1} />
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <Boton variante="secundario" onClick={onCrear} icono={<Plus size={14} />} title="Nueva vista">Nueva</Boton>
        </div>
    );
}

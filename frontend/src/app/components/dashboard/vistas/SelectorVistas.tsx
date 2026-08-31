/*
 * SelectorVistas
 *
 * [318A-2] Botones de las vistas del Modo Vistas. Se renderizan dentro del
 * encabezado (cuadro). Permite: activar una vista, crear una nueva, renombrar,
 * duplicar, eliminar.
 *
 * Diseño: fila de botones tipo pestaña (botón por vista, activo resaltado) +
 * botón "+" para crear.
 *
 * [318A-2 fb] El menú de opciones por vista (renombrar/duplicar/eliminar) usa
 * el sistema estándar de menú contextual (MenuContextual + useMenuContextualConId)
 * abierto con click derecho sobre el botón de la vista, igual que el resto de la
 * app. Se eliminó el botón de puntos suspensivos (MoreHorizontal) y su menú propio
 * (selectorVistasMenu) que era incoherente con los demás menús.
 *
 * Monocromo: sin colores, bordes 0, sin sombras (tokens --dashboard-*).
 */

import {useCallback} from 'react';
import {Plus, Pencil, Copy, Trash2} from 'lucide-react';
import type {Vista} from '../../../types/vistas';
import {Boton} from '../../ui';
import {MenuContextual} from '../../shared';
import type {OpcionMenu} from '../../shared';
import {useMenuContextualConId} from '../../../hooks/useMenuContextualGlobal';

interface SelectorVistasProps {
    vistas: Vista[];
    vistaActivaId: string;
    onSeleccionar: (vistaId: string) => void;
    onCrear: () => void;
    onRenombrar: (vistaId: string, nombre: string) => void;
    onDuplicar: (vistaId: string) => void;
    onEliminar: (vistaId: string) => void;
}

/* Un ítem de vista (un botón por vista). Subcomponente separado porque usa
 * useMenuContextualConId (hook) y no puede ir dentro de un map directamente. */
function SelectorVistasItem({vista, esActiva, vistasLength, onSeleccionar, onRenombrar, onDuplicar, onEliminar}: {
    vista: Vista;
    esActiva: boolean;
    vistasLength: number;
    onSeleccionar: (vistaId: string) => void;
    onRenombrar: (vistaId: string, nombre: string) => void;
    onDuplicar: (vistaId: string) => void;
    onEliminar: (vistaId: string) => void;
}): JSX.Element {
    const menuContextual = useMenuContextualConId(`vista-${vista.id}`);

    /* Click derecho en el botón de la vista → menú contextual estándar
     * (renombrar/duplicar/eliminar), mismo patrón que el resto de la app. */
    const manejarClickDerecho = useCallback((evento: React.MouseEvent) => {
        evento.preventDefault();
        evento.stopPropagation();
        menuContextual.toggle(evento.clientX, evento.clientY);
    }, [menuContextual]);

    const opciones = [
        {
            id: 'renombrar',
            etiqueta: 'Renombrar',
            icono: <Pencil size={12} />
        },
        {
            id: 'duplicar',
            etiqueta: 'Duplicar',
            icono: <Copy size={12} />
        },
        {
            id: 'eliminar',
            etiqueta: 'Eliminar',
            icono: <Trash2 size={12} />,
            peligroso: true,
            deshabilitado: vistasLength <= 1
        }
    ] satisfies OpcionMenu[];

    const manejarOpcion = useCallback((opcionId: string) => {
        if (opcionId === 'renombrar') {
            onRenombrar(vista.id, prompt('Nombre de la vista:', vista.nombre) || vista.nombre);
        } else if (opcionId === 'duplicar') {
            onDuplicar(vista.id);
        } else if (opcionId === 'eliminar') {
            onEliminar(vista.id);
        }
        menuContextual.cerrar();
    }, [vista.id, vista.nombre, onRenombrar, onDuplicar, onEliminar, menuContextual]);

    return (
        <div className="selectorVistasItem">
            <Boton
                variante={esActiva ? 'primario' : 'secundario'}
                onClick={() => onSeleccionar(vista.id)}
                onContextMenu={manejarClickDerecho}
                title={`${vista.nombre} (clic derecho: opciones)`}
            >
                {vista.nombre}
            </Boton>
            {menuContextual.visible && (
                <MenuContextual
                    opciones={opciones}
                    posicionX={menuContextual.posicion.x}
                    posicionY={menuContextual.posicion.y}
                    onSeleccionar={manejarOpcion}
                    onCerrar={menuContextual.cerrar}
                />
            )}
        </div>
    );
}

export function SelectorVistas({vistas, vistaActivaId, onSeleccionar, onCrear, onRenombrar, onDuplicar, onEliminar}: SelectorVistasProps): JSX.Element {
    return (
        <div className="selectorVistas">
            {vistas.map(vista => (
                <SelectorVistasItem
                    key={vista.id}
                    vista={vista}
                    esActiva={vista.id === vistaActivaId}
                    vistasLength={vistas.length}
                    onSeleccionar={onSeleccionar}
                    onRenombrar={onRenombrar}
                    onDuplicar={onDuplicar}
                    onEliminar={onEliminar}
                />
            ))}
            <Boton variante="secundario" onClick={onCrear} icono={<Plus size={14} />} title="Nueva vista">Nueva</Boton>
        </div>
    );
}

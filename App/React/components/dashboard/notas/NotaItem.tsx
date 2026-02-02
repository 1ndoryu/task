import {useCallback, useMemo} from 'react';
import {Clock, Trash2, Folder} from 'lucide-react';
import type {Nota, CarpetaNota} from '../../../types/notas';
import {formatearFechaRelativa} from '../../../utils/fecha';
import {useMenuContextualConId} from '../../../hooks/useMenuContextualGlobal';
import {MenuContextualAdaptivo} from '../../shared/MenuContextualAdaptivo';
import type {OpcionMenu} from '../../shared/MenuContextual';

interface NotaItemProps {
    nota: Nota;
    activa: boolean;
    onSeleccionar: (nota: Nota) => void;
    onEliminar: (id: number) => void;
    carpetas: CarpetaNota[];
    onMoverNota?: (notaId: number, carpetaId: number | null) => Promise<boolean>;
}

export function NotaItem({nota, activa, onSeleccionar, onEliminar, carpetas, onMoverNota}: NotaItemProps): JSX.Element {
    const {visible, posicion, toggle, cerrar} = useMenuContextualConId(`nota-${nota.id}`);

    const manejarClickDerecho = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(e.clientX, e.clientY);
        },
        [toggle]
    );

    const manejarOpcion = useCallback(
        (opcionId: string) => {
            if (opcionId === 'eliminar') {
                onEliminar(nota.id);
            } else if (opcionId.startsWith('mover-')) {
                const carpetaIdStr = opcionId.replace('mover-', '');
                const carpetaId = carpetaIdStr === 'general' ? null : parseInt(carpetaIdStr);
                onMoverNota?.(nota.id, carpetaId);
            }
        },
        [nota.id, onEliminar, onMoverNota]
    );

    const opcionesMenu = useMemo<OpcionMenu[]>(() => {
        const opciones: OpcionMenu[] = [];

        if (onMoverNota) {
            const subOpcionesCarpetas: OpcionMenu[] = [
                /* Opción para mover a "Todas las notas" (General) */
                {
                    id: 'mover-general',
                    etiqueta: 'General',
                    icono: <Folder size={12} />,
                    deshabilitado: !nota.carpetaId /* Deshabilitar si ya está en general (carpetaId null/undefined) */
                },
                ...carpetas.map(c => ({
                    id: `mover-${c.id}`,
                    etiqueta: c.nombre,
                    icono: <Folder size={12} />,
                    deshabilitado: nota.carpetaId === c.id
                }))
            ];

            opciones.push({
                id: 'mover',
                etiqueta: 'Mover a carpeta',
                icono: <Folder size={14} />,
                subOpciones: subOpcionesCarpetas
            });
        }

        opciones.push({
            id: 'eliminar',
            etiqueta: 'Eliminar nota',
            icono: <Trash2 size={14} />,
            peligroso: true
        });

        return opciones;
    }, [carpetas, onMoverNota, nota.carpetaId]);

    return (
        <>
            <div className={`listaNotasItem ${activa ? 'listaNotasItem--activo' : ''}`} onClick={() => onSeleccionar(nota)} onContextMenu={manejarClickDerecho}>
                <div className="listaNotasItemPrincipal">
                    <div className="listaNotasItemTitulo">{nota.titulo}</div>

                    <div className="listaNotasItemPreview">
                        {nota.contenido.slice(0, 120)}
                        {nota.contenido.length > 120 ? '...' : ''}
                    </div>

                    <div className="listaNotasItemFechaCreacion">
                        <Clock size={10} />
                        <span>{formatearFechaRelativa(nota.fechaCreacion)}</span>
                    </div>
                </div>
            </div>

            {visible && <MenuContextualAdaptivo opciones={opcionesMenu} posicionX={posicion.x} posicionY={posicion.y} onSeleccionar={manejarOpcion} onCerrar={cerrar} titulo={nota.titulo} />}
        </>
    );
}

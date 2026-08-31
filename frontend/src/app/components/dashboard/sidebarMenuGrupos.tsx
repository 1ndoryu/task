/*
 * useContextMenuGrupo
 *
 * [300A-3] Menú contextual de los grupos (clic derecho): "Agregar a la vista"
 * (añade el grupo a la grilla multi-panel) y "Cambiar nombre de grupo" (abre
 * un input inline para renombrar, propagado al dueño de los datos).
 */
import {useState, useCallback} from 'react';
import type {OpcionMenu} from '../shared';
import {Plus, Pencil} from 'lucide-react';
import type {ContextMenuGrupoState} from './sidebarShared';

export function useContextMenuGrupo(
    onAgregarGrupoVista?: (grupo: string) => void,
    onRenombrarGrupo?: (grupoViejo: string, grupoNuevo: string) => void,
) {
    const [contextMenuGrupo, setContextMenuGrupo] = useState<ContextMenuGrupoState>({abierto: false, grupo: null, x: 0, y: 0});
    const [renombrandoGrupo, setRenombrandoGrupo] = useState<string | null>(null);
    const [nuevoNombreGrupo, setNuevoNombreGrupo] = useState('');

    const opcionesContextualGrupo: OpcionMenu[] = [
        {id: 'agregar-vista', etiqueta: 'Agregar a la vista', icono: <Plus size={14} />},
        {id: 'renombrar', etiqueta: 'Cambiar nombre de grupo', icono: <Pencil size={14} />}
    ];

    const handleContextMenuGrupo = useCallback((e: React.MouseEvent, grupo: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuGrupo({abierto: true, grupo, x: e.clientX, y: e.clientY});
    }, []);

    const handleSeleccionContextualGrupo = useCallback((opcionId: string) => {
        const grupo = contextMenuGrupo.grupo;
        if (opcionId === 'agregar-vista' && grupo) {
            onAgregarGrupoVista?.(grupo);
        } else if (opcionId === 'renombrar' && grupo) {
            setNuevoNombreGrupo(grupo);
            setRenombrandoGrupo(grupo);
        }
        setContextMenuGrupo(prev => ({...prev, abierto: false}));
    }, [contextMenuGrupo.grupo, onAgregarGrupoVista]);

    const confirmarRenombrarGrupo = useCallback(() => {
        const nombre = nuevoNombreGrupo.trim();
        const viejo = renombrandoGrupo;
        if (viejo && nombre && nombre !== viejo) {
            onRenombrarGrupo?.(viejo, nombre);
        }
        setRenombrandoGrupo(null);
        setNuevoNombreGrupo('');
    }, [nuevoNombreGrupo, renombrandoGrupo, onRenombrarGrupo]);

    const cancelarRenombrarGrupo = useCallback(() => {
        setRenombrandoGrupo(null);
        setNuevoNombreGrupo('');
    }, []);

    return {contextMenuGrupo, renombrandoGrupo, nuevoNombreGrupo, opcionesContextualGrupo, handleContextMenuGrupo, handleSeleccionContextualGrupo, confirmarRenombrarGrupo, cancelarRenombrarGrupo, setNuevoNombreGrupo, setContextMenuGrupo, setRenombrandoGrupo};
}
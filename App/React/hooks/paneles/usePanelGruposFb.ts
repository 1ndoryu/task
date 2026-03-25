/* [253A-11] Hook para PanelGruposFb
 * Gestiona la lógica del panel de grupos de Facebook:
 * carga inicial, filtrado local, acciones sobre grupos. */

import {useEffect, useMemo, useCallback} from 'react';
import {useGruposFbStore} from '../../stores/gruposFbStore';
import type {GrupoFb} from '../../stores/gruposFbStore';

export function usePanelGruposFb() {
    const grupos = useGruposFbStore(s => s.grupos);
    const categorias = useGruposFbStore(s => s.categorias);
    const estadisticas = useGruposFbStore(s => s.estadisticas);
    const cargando = useGruposFbStore(s => s.cargando);
    const inicializado = useGruposFbStore(s => s.inicializado);
    const error = useGruposFbStore(s => s.error);
    const filtros = useGruposFbStore(s => s.filtros);
    const cargar = useGruposFbStore(s => s.cargar);
    const cargarCategorias = useGruposFbStore(s => s.cargarCategorias);
    const actualizarGrupo = useGruposFbStore(s => s.actualizarGrupo);
    const eliminarGrupo = useGruposFbStore(s => s.eliminarGrupo);
    const marcarPublicado = useGruposFbStore(s => s.marcarPublicado);
    const setFiltro = useGruposFbStore(s => s.setFiltro);

    /* Carga inicial */
    useEffect(() => {
        if (!inicializado) {
            cargar();
            cargarCategorias();
        }
    }, [inicializado, cargar, cargarCategorias]);

    /* Filtrado local (los datos ya están en memoria) */
    const gruposFiltrados = useMemo(() => {
        let resultado = grupos;

        if (!filtros.mostrarOcultos) {
            resultado = resultado.filter(g => !g.oculto);
        }

        if (filtros.categoria) {
            resultado = resultado.filter(g => g.categoria === filtros.categoria);
        }

        if (filtros.importancia !== '') {
            const imp = parseInt(filtros.importancia, 10);
            resultado = resultado.filter(g => g.importancia === imp);
        }

        if (filtros.busqueda) {
            const termino = filtros.busqueda.toLowerCase();
            resultado = resultado.filter(g =>
                g.nombre.toLowerCase().includes(termino) ||
                g.url.toLowerCase().includes(termino)
            );
        }

        return resultado;
    }, [grupos, filtros]);

    /* Agrupar por categoría para estadísticas rápidas */
    const conteosPorCategoria = useMemo(() => {
        const conteos: Record<string, number> = {};
        grupos.forEach(g => {
            const cat = g.categoria || 'Sin categoría';
            conteos[cat] = (conteos[cat] || 0) + 1;
        });
        return conteos;
    }, [grupos]);

    /* Acciones con manejo de error */
    const toggleOculto = useCallback(async (grupo: GrupoFb) => {
        try {
            await actualizarGrupo(grupo.id, {oculto: !grupo.oculto});
        } catch {
            /* El rollback ya lo hace el store */
        }
    }, [actualizarGrupo]);

    const cambiarCategoria = useCallback(async (id: number, categoria: string | null) => {
        try {
            await actualizarGrupo(id, {categoria});
        } catch {
            /* Rollback automático */
        }
    }, [actualizarGrupo]);

    const cambiarImportancia = useCallback(async (id: number, importancia: number) => {
        try {
            await actualizarGrupo(id, {importancia});
        } catch {
            /* Rollback automático */
        }
    }, [actualizarGrupo]);

    const publicar = useCallback(async (id: number) => {
        try {
            await marcarPublicado(id);
        } catch {
            /* Recarga automática en el store */
        }
    }, [marcarPublicado]);

    const eliminar = useCallback(async (id: number) => {
        try {
            await eliminarGrupo(id);
        } catch {
            /* Rollback automático */
        }
    }, [eliminarGrupo]);

    return {
        grupos: gruposFiltrados,
        todosLosGrupos: grupos,
        categorias,
        estadisticas,
        cargando,
        inicializado,
        error,
        filtros,
        conteosPorCategoria,
        setFiltro,
        toggleOculto,
        cambiarCategoria,
        cambiarImportancia,
        publicar,
        eliminar,
        recargar: cargar
    };
}

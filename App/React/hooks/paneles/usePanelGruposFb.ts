/* [253A-11] Hook para PanelGruposFb
 * Gestiona la lógica del panel de grupos de Facebook:
 * carga inicial, filtrado local, acciones sobre grupos.
 * [024A-19] Polling inteligente: cada 30s consulta /stats (1 query ligera),
 * y solo recarga la lista completa si el total cambió. */

import {useEffect, useMemo, useCallback, useRef} from 'react';
import {useGruposFbStore} from '../../stores/gruposFbStore';
import {gruposFbService} from '../../services/gruposFbService';
import type {GrupoFb} from '../../stores/gruposFbStore';

/* Intervalo de polling (ms). 30s es un buen balance: no satura el servidor,
 * pero detecta cambios de la extensión en menos de un minuto. */
const INTERVALO_POLLING = 30_000;

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

    /* Ref para el último total conocido (evita re-crear el efecto en cada render) */
    const ultimoTotalRef = useRef<number | null>(null);

    /* Carga inicial */
    useEffect(() => {
        if (!inicializado) {
            cargar();
            cargarCategorias();
        }
    }, [inicializado, cargar, cargarCategorias]);

    /* [024A-19] Polling inteligente: solo recarga si los stats cambiaron */
    useEffect(() => {
        if (!inicializado) return;
        let activo = true;

        const poll = async () => {
            try {
                const stats = await gruposFbService.estadisticas();
                if (!activo) return;

                /* Si el total cambió respecto al último conocido, recargar todo */
                if (ultimoTotalRef.current !== null && stats.total !== ultimoTotalRef.current) {
                    cargar();
                }
                ultimoTotalRef.current = stats.total;
            } catch {
                /* Error de red silencioso en polling — no bloquear la UI */
            }
        };

        const id = setInterval(poll, INTERVALO_POLLING);
        return () => {
            activo = false;
            clearInterval(id);
        };
    }, [inicializado, cargar]);

    /* Sincronizar el ref con el total real del store */
    useEffect(() => {
        if (estadisticas) {
            ultimoTotalRef.current = estadisticas.total;
        }
    }, [estadisticas]);

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

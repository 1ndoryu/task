/* [253A-11] Hook para PanelGruposFb
 * Gestiona la lógica del panel de grupos de Facebook:
 * carga inicial, filtrado local, acciones sobre grupos.
 * [024A-19] Polling inteligente: cada 30s consulta /stats (1 query ligera),
 * y solo recarga la lista completa si el total cambió. */

import {useEffect, useMemo, useCallback, useRef, useState} from 'react';
import {useGruposFbStore} from '../../stores/gruposFbStore';
import {gruposFbService} from '../../services/gruposFbService';
import type {GrupoFb} from '../../stores/gruposFbStore';

/* [024A-27] Campos por los que se puede ordenar la tabla */
export type CampoOrden = 'nombre' | 'tipo' | 'miembros' | 'categoria' | 'importancia' | 'ultimaPublicacion';
export type DireccionOrden = 'asc' | 'desc';

export interface EstadoOrden {
    campo: CampoOrden;
    direccion: DireccionOrden;
}

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

    /* [024A-27] Ordenamiento por columna: default por importancia desc */
    const [orden, setOrden] = useState<EstadoOrden>({campo: 'importancia', direccion: 'desc'});

    /* Ref para el último total conocido (evita re-crear el efecto en cada render) */
    const ultimoTotalRef = useRef<number | null>(null);
    /* [024A-23] Contador de polls: fuerza recarga completa cada N ciclos para detectar
     * cambios de contenido (cat/imp/oculto) que no alteran el total de grupos. */
    const pollCountRef = useRef(0);
    const FORZAR_RECARGA_CADA = 4; /* cada 4 polls = ~2 min */

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

                pollCountRef.current++;

                /* [024A-23] Recargar si el total cambió O cada N polls para capturar
                 * cambios de contenido (cat/imp/oculto) que no alteran el total. */
                const totalCambio = ultimoTotalRef.current !== null && stats.total !== ultimoTotalRef.current;
                const forzarRecarga = pollCountRef.current % FORZAR_RECARGA_CADA === 0;

                if (totalCambio || forzarRecarga) {
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

    /* [024A-27] Ordenar los grupos filtrados según el estado de orden */
    const gruposOrdenados = useMemo(() => {
        const {campo, direccion} = orden;
        const mult = direccion === 'asc' ? 1 : -1;

        return [...gruposFiltrados].sort((a, b) => {
            let cmp = 0;
            switch (campo) {
                case 'nombre':
                    cmp = a.nombre.localeCompare(b.nombre);
                    break;
                case 'tipo':
                    cmp = (a.tipo || '').localeCompare(b.tipo || '');
                    break;
                case 'miembros':
                    cmp = parsearNumMiembros(a.cantidadMiembros) - parsearNumMiembros(b.cantidadMiembros);
                    break;
                case 'categoria':
                    cmp = (a.categoria || '').localeCompare(b.categoria || '');
                    break;
                case 'importancia':
                    cmp = a.importancia - b.importancia;
                    break;
                case 'ultimaPublicacion':
                    cmp = (a.ultimaPublicacion || '').localeCompare(b.ultimaPublicacion || '');
                    break;
            }
            return cmp * mult;
        });
    }, [gruposFiltrados, orden]);

    /* [024A-27] Toggle de ordenamiento: si se clickea el mismo campo, alterna dirección.
     * Si es un campo nuevo, ordena ascendente (excepto importancia que empieza desc). */
    const cambiarOrden = useCallback((campo: CampoOrden) => {
        setOrden(prev => {
            if (prev.campo === campo) {
                return {campo, direccion: prev.direccion === 'asc' ? 'desc' : 'asc'};
            }
            return {campo, direccion: campo === 'importancia' ? 'desc' : 'asc'};
        });
    }, []);

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
        grupos: gruposOrdenados,
        todosLosGrupos: grupos,
        categorias,
        estadisticas,
        cargando,
        inicializado,
        error,
        filtros,
        conteosPorCategoria,
        orden,
        cambiarOrden,
        setFiltro,
        toggleOculto,
        cambiarCategoria,
        cambiarImportancia,
        publicar,
        eliminar,
        recargar: cargar
    };
}

/* [024A-27] Parsear "1,5 mil miembros" → 1500, "2 mill. miembros" → 2000000.
 * Para ordenar numéricamente la columna miembros. */
function parsearNumMiembros(raw: string): number {
    if (!raw) return 0;
    const match = raw.match(/([\d.,]+)\s*(mil|mill\.?|K|M)?/i);
    if (!match) return 0;
    const num = parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
    const suffix = (match[2] || '').toLowerCase();
    if (suffix === 'mil' || suffix === 'k') return num * 1000;
    if (suffix.startsWith('mill') || suffix === 'm') return num * 1000000;
    return num;
}

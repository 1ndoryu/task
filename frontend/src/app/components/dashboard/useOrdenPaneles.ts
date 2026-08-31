/*
 * useOrdenPaneles
 *
 * [300A-3] Orden de los botones del menú del sidebar: drag & drop con
 * persistencia en localStorage (glory_sidebar_orden_paneles). Si no hay orden
 * guardado se usa el orden por defecto; los paneles nuevos (no guardados) se
 * añaden al final. Nota: oculta el fantasma nativo del navegador, se sustituye
 * por transparencia del origen + línea de guía (antes/después).
 */
import {useState, useCallback, useMemo} from 'react';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {leerGuardado} from './sidebarShared';

export function useOrdenPaneles<T extends {id: PanelId}>(paneles: T[]) {
    const [ordenIds, setOrdenIds] = useState<string[] | null>(() =>
        leerGuardado<string[] | null>('glory_sidebar_orden_paneles', null, raw => {
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : null;
            } catch {
                return null;
            }
        }),
    );
    const [arrastrandoPanelId, setArrastrandoPanelId] = useState<string | null>(null);
    const [zonaDrop, setZonaDrop] = useState<{id: string; posicion: 'antes' | 'despues'} | null>(null);

    const panelesOrdenados = useMemo(() => {
        if (!ordenIds) return paneles;
        const porId = new Map(paneles.map(p => [p.id, p] as const));
        const ordenados: T[] = [];
        ordenIds.forEach(id => {
            const panel = porId.get(id);
            if (panel) {
                ordenados.push(panel);
                porId.delete(id);
            }
        });
        return [...ordenados, ...porId.values()];
    }, [paneles, ordenIds]);

    const guardarOrden = useCallback((ids: string[]) => {
        setOrdenIds(ids);
        try {
            localStorage.setItem('glory_sidebar_orden_paneles', JSON.stringify(ids));
        } catch {
            /* localStorage no disponible */
        }
    }, []);

    const iniciarArrastre = useCallback((e: React.DragEvent, panelId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', panelId);
        /* Fantasma nativo ocultado: se sustituye por transparencia + línea de guía. */
        const lienzo = document.createElement('canvas');
        lienzo.width = lienzo.height = 1;
        e.dataTransfer.setDragImage(lienzo, 0, 0);
        setArrastrandoPanelId(panelId);
    }, []);

    const marcarDestino = useCallback((e: React.DragEvent, panelId: string) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const posicion = e.clientY < rect.top + rect.height / 2 ? 'antes' : 'despues';
        setZonaDrop({id: panelId, posicion});
    }, []);

    const soltarEn = useCallback((e: React.DragEvent, panelId: string) => {
        e.preventDefault();
        const origen = arrastrandoPanelId || e.dataTransfer.getData('text/plain');
        const posicion = zonaDrop?.id === panelId ? zonaDrop.posicion : 'antes';
        setArrastrandoPanelId(null);
        setZonaDrop(null);
        if (!origen || origen === panelId) return;
        const iOrigen = panelesOrdenados.findIndex(p => p.id === origen);
        const ids = panelesOrdenados.map(p => p.id);
        if (iOrigen === -1) return;
        ids.splice(iOrigen, 1);
        const iDestino = ids.indexOf(panelId);
        if (iDestino === -1) return;
        ids.splice(posicion === 'despues' ? iDestino + 1 : iDestino, 0, origen);
        guardarOrden(ids);
    }, [arrastrandoPanelId, zonaDrop, panelesOrdenados, guardarOrden]);

    const terminarArrastre = useCallback(() => {
        setArrastrandoPanelId(null);
        setZonaDrop(null);
    }, []);

    return {ordenIds, arrastrandoPanelId, zonaDrop, panelesOrdenados, iniciarArrastre, marcarDestino, soltarEn, terminarArrastre};
}
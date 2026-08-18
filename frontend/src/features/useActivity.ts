import { useCallback, useEffect, useRef, useState } from 'react';
import { day, heatmap, stats, _delete } from '../api/generated/activity/activity';
import type { ActivityDetailItem, ActivityHeatmapDay, ActivityStats } from '../api/generated/gloryRSAPI.schemas';

type ActivityState = {
  heatmap: Record<string, ActivityHeatmapDay>;
  stats?: ActivityStats;
  details: ActivityDetailItem[];
  detailsPage: number;
  detailsHasMore: boolean;
  selectedDate?: string;
  loading: boolean;
  loadingDetails: boolean;
  loadingMoreDetails: boolean;
  mutatingId?: number;
  error?: string;
};

const initialState: ActivityState = { heatmap: {}, details: [], detailsPage: 1, detailsHasMore: false, loading: true, loadingDetails: false, loadingMoreDetails: false };

function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useActivity() {
  const [state, setState] = useState<ActivityState>(initialState);
  const summaryControllerRef = useRef<AbortController | null>(null);
  const detailControllerRef = useRef<AbortController | null>(null);
  const summaryRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const selectedDateRef = useRef<string>();

  const load = useCallback(async () => {
    summaryControllerRef.current?.abort();
    const controller = new AbortController();
    summaryControllerRef.current = controller;
    const requestId = ++summaryRequestIdRef.current;
    const today = localDate();
    setState((current) => ({ ...current, loading: true, error: undefined }));

    try {
      const [heatmapResponse, statsResponse] = await Promise.all([
        heatmap({ periodo: 'mes', fechaHoyLocal: today }, { signal: controller.signal }),
        stats({ fechaHoyLocal: today }, { signal: controller.signal }),
      ]);
      if (heatmapResponse.status !== 200 || statsResponse.status !== 200) throw new Error('Actividad no disponible');
      if (controller.signal.aborted || requestId !== summaryRequestIdRef.current) return;
      setState((current) => ({ ...current, heatmap: heatmapResponse.data.heatmap, stats: statsResponse.data.estadisticas, loading: false }));
    } catch {
      if (controller.signal.aborted || requestId !== summaryRequestIdRef.current) return;
      setState((current) => ({ ...current, loading: false, error: 'No se pudo cargar la actividad.' }));
    }
  }, []);

  const loadDay = useCallback(async (date: string) => {
    detailControllerRef.current?.abort();
    const controller = new AbortController();
    detailControllerRef.current = controller;
    const requestId = ++detailRequestIdRef.current;
    selectedDateRef.current = date;
    setState((current) => ({ ...current, selectedDate: date, details: [], detailsPage: 1, detailsHasMore: false, loadingDetails: true, loadingMoreDetails: false, error: undefined }));
    try {
      const response = await day({ fecha: date, page: 1, perPage: 200 }, { signal: controller.signal });
      if (response.status !== 200) throw new Error('Detalle no disponible');
      if (controller.signal.aborted || requestId !== detailRequestIdRef.current) return;
      setState((current) => ({ ...current, details: response.data.detalle, detailsPage: response.data.page, detailsHasMore: response.data.truncated, loadingDetails: false }));
    } catch {
      if (controller.signal.aborted || requestId !== detailRequestIdRef.current) return;
      setState((current) => ({ ...current, details: [], loadingDetails: false, error: 'No se pudo cargar el detalle.' }));
    }
  }, []);

  const loadMoreDay = useCallback(async () => {
    const date = selectedDateRef.current;
    if (!date || !state.detailsHasMore || state.loadingMoreDetails) return;
    detailControllerRef.current?.abort();
    const controller = new AbortController();
    detailControllerRef.current = controller;
    const requestId = ++detailRequestIdRef.current;
    const nextPage = state.detailsPage + 1;
    setState((current) => ({ ...current, loadingMoreDetails: true, error: undefined }));
    try {
      const response = await day({ fecha: date, page: nextPage, perPage: 200 }, { signal: controller.signal });
      if (response.status !== 200) throw new Error('Detalle no disponible');
      if (controller.signal.aborted || requestId !== detailRequestIdRef.current) return;
      setState((current) => ({
        ...current,
        details: [...current.details, ...response.data.detalle.filter((item) => !current.details.some((existing) => existing.id === item.id))],
        detailsPage: response.data.page,
        detailsHasMore: response.data.truncated,
        loadingMoreDetails: false,
      }));
    } catch {
      if (controller.signal.aborted || requestId !== detailRequestIdRef.current) return;
      setState((current) => ({ ...current, loadingMoreDetails: false, error: 'No se pudo cargar más detalle.' }));
    }
  }, [state.detailsHasMore, state.detailsPage, state.loadingMoreDetails]);

  const remove = useCallback(async (id: number) => {
    if (state.mutatingId !== undefined) return;
    setState((current) => ({ ...current, mutatingId: id, error: undefined }));
    try {
      const response = await _delete(id);
      if (response.status !== 200) throw new Error('Actividad no eliminada');
      const selectedDate = state.selectedDate;
      await load();
      if (selectedDate) await loadDay(selectedDate);
    } catch {
      setState((current) => ({ ...current, error: 'No se pudo eliminar la actividad.' }));
    } finally {
      setState((current) => ({ ...current, mutatingId: undefined }));
    }
  }, [load, loadDay, state.mutatingId, state.selectedDate]);

  useEffect(() => {
    void load();
    const onActivityChanged = () => {
      void load();
      if (selectedDateRef.current) void loadDay(selectedDateRef.current);
    };
    window.addEventListener('glory:activity-changed', onActivityChanged);
    return () => {
      summaryRequestIdRef.current += 1;
      detailRequestIdRef.current += 1;
      summaryControllerRef.current?.abort();
      detailControllerRef.current?.abort();
      window.removeEventListener('glory:activity-changed', onActivityChanged);
    };
  }, [load, loadDay]);

  return { ...state, load, loadDay, loadMoreDay, remove };
}

export { localDate };

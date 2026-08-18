import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteDay, getHistory, markDay } from '../api/generated/habits/habits';
import type { HabitHistoryResponse } from '../api/generated/gloryRSAPI.schemas';

type HabitHistoryState = {
  data?: HabitHistoryResponse;
  loading: boolean;
  mutating: boolean;
  error?: string;
};

const initialState: HabitHistoryState = { loading: false, mutating: false };
type MutationResponse = { status: number; data: unknown };

export function useHabitHistory(habitId?: number) {
  const [state, setState] = useState<HabitHistoryState>(initialState);
  const loadAbortRef = useRef<AbortController | null>(null);
  const mutationAbortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!habitId) {
      setState(initialState);
      return;
    }
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const response = await getHistory(habitId, { days: 30 }, { signal: controller.signal });
      if (response.status !== 200) throw new Error(`Historial respondió ${response.status}`);
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setState((current) => ({ ...current, data: response.data, loading: false }));
    } catch {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setState((current) => ({ ...current, loading: false, error: 'No se pudo cargar el historial del hábito.' }));
    }
  }, [habitId]);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
      loadAbortRef.current?.abort();
      mutationAbortRef.current?.abort();
    };
  }, [load]);

  const mutate = useCallback(async (operation: (signal: AbortSignal) => Promise<MutationResponse>, failure: string) => {
    if (!habitId || state.mutating) return;
    mutationAbortRef.current?.abort();
    const controller = new AbortController();
    mutationAbortRef.current = controller;
    setState((current) => ({ ...current, mutating: true, error: undefined }));
    try {
      const response = await operation(controller.signal);
      if (response.status !== 200) throw new Error(failure);
      if (!controller.signal.aborted) setState((current) => ({ ...current, data: response.data as HabitHistoryResponse, mutating: false }));
    } catch {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false, error: failure }));
    }
  }, [habitId, state.mutating]);

  const mark = useCallback(async (date: string, status: string) => {
    await mutate((signal) => markDay(habitId!, { date, status }, { signal }), 'No se pudo guardar el día del hábito.');
  }, [habitId, mutate]);

  const remove = useCallback(async (date: string) => {
    await mutate((signal) => deleteDay(habitId!, date, { signal }), 'No se pudo eliminar el día del hábito.');
  }, [habitId, mutate]);

  return { ...state, load, mark, remove };
}

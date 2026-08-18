import { useCallback, useEffect, useRef, useState } from 'react';
import { getDashboard } from '../api/generated/dashboard/dashboard';
import type { DashboardReadResponse } from '../api/generated/gloryRSAPI.schemas';

type DashboardState = {
  data?: DashboardReadResponse;
  loading: boolean;
  error?: string;
};

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({ loading: true });
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async (): Promise<boolean> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setState((current) => ({ ...current, loading: true, error: undefined }));

    try {
      const response = await getDashboard({ signal: controller.signal });
      if (response.status !== 200) throw new Error(`Dashboard respondió ${response.status}`);
      if (requestId !== requestIdRef.current || controller.signal.aborted) return false;
      setState({ data: response.data, loading: false });
      return true;
    } catch {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return false;
      setState((current) => ({ ...current, loading: false, error: 'No se pudo cargar el dashboard.' }));
      return false;
    }
  }, []);

  useEffect(() => {
    void reload();
    return () => controllerRef.current?.abort();
  }, [reload]);

  return { ...state, reload };
}

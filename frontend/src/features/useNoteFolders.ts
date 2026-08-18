import { useCallback, useEffect, useRef, useState } from 'react';
import { createFolder, deleteFolder, listFolders, renameFolder } from '../api/generated/notes/notes';
import type { NoteFolder } from '../api/generated/gloryRSAPI.schemas';

type FolderState = {
  folders: NoteFolder[];
  loading: boolean;
  mutating: boolean;
  error?: string;
};

const initialState: FolderState = { folders: [], loading: true, mutating: false };

export function useNoteFolders() {
  const [state, setState] = useState<FolderState>(initialState);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const mutationAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (): Promise<boolean> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const response = await listFolders({ signal: controller.signal });
      if (response.status !== 200) throw new Error(`Carpetas respondió ${response.status}`);
      if (controller.signal.aborted || requestId !== requestIdRef.current) return false;
      setState((current) => ({ ...current, folders: response.data, loading: false }));
      return true;
    } catch {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return false;
      setState((current) => ({ ...current, loading: false, error: 'No se pudieron cargar las carpetas.' }));
      return false;
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      mutationAbortRef.current?.abort();
    };
  }, [load]);

  const add = useCallback(async (name: string) => {
    if (state.mutating) return undefined;
    mutationAbortRef.current?.abort();
    const controller = new AbortController();
    mutationAbortRef.current = controller;
    setState((current) => ({ ...current, mutating: true, error: undefined }));
    try {
      const response = await createFolder({ name }, { signal: controller.signal });
      if (response.status !== 201) throw new Error(`Crear carpeta respondió ${response.status}`);
      if (!await load()) return undefined;
      return response.data;
    } catch {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false, error: 'No se pudo crear la carpeta.' }));
      return undefined;
    } finally {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false }));
    }
  }, [load, state.mutating]);

  const remove = useCallback(async (id: string) => {
    if (state.mutating) return false;
    mutationAbortRef.current?.abort();
    const controller = new AbortController();
    mutationAbortRef.current = controller;
    setState((current) => ({ ...current, mutating: true, error: undefined }));
    try {
      const response = await deleteFolder(id, { signal: controller.signal });
      if (response.status !== 204) throw new Error(`Eliminar carpeta respondió ${response.status}`);
      return await load();
    } catch {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false, error: 'No se pudo eliminar la carpeta.' }));
      return false;
    } finally {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false }));
    }
  }, [load, state.mutating]);

  const rename = useCallback(async (id: string, name: string) => {
    if (state.mutating) return false;
    mutationAbortRef.current?.abort();
    const controller = new AbortController();
    mutationAbortRef.current = controller;
    setState((current) => ({ ...current, mutating: true, error: undefined }));
    try {
      const response = await renameFolder(id, { name }, { signal: controller.signal });
      if (response.status !== 200) throw new Error(`Renombrar carpeta respondió ${response.status}`);
      return await load();
    } catch {
      if (!controller.signal.aborted) setState((current) => ({ ...current, error: 'No se pudo renombrar la carpeta.' }));
      return false;
    } finally {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false }));
    }
  }, [load, state.mutating]);

  return { ...state, load, add, remove, rename };
}

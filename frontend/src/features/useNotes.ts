import { useCallback, useEffect, useRef, useState } from 'react';
import { createNote, deleteNote, listNotes, moveNote, updateNote } from '../api/generated/notes/notes';
import type { Note } from '../api/generated/gloryRSAPI.schemas';

const PER_PAGE = 20;

type NotesState = {
  notes: Note[];
  total: number;
  page: number;
  loading: boolean;
  mutating: boolean;
  error?: string;
};

const initialState: NotesState = { notes: [], total: 0, page: 1, loading: true, mutating: false };

export function useNotes(folderId?: string, search?: string) {
  const [state, setState] = useState<NotesState>(initialState);
  const requestId = useRef(0);
  const listAbort = useRef<AbortController>();
  const mutationAbort = useRef<AbortController>();

  const load = useCallback(async (targetPage: number): Promise<boolean> => {
    listAbort.current?.abort();
    const controller = new AbortController();
    listAbort.current = controller;
    const currentRequest = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const response = await listNotes({ page: targetPage, per_page: PER_PAGE, folder_id: folderId || undefined, search: search || undefined }, { signal: controller.signal });
      if (response.status !== 200) throw new Error(`Notas respondió ${response.status}`);
      const result = response.data;
      if (controller.signal.aborted || currentRequest !== requestId.current) return false;
      setState((current) => ({ ...current, notes: result.items, total: result.total, page: result.page, loading: false }));
      return true;
    } catch {
      if (controller.signal.aborted || currentRequest !== requestId.current) return false;
      setState((current) => ({ ...current, loading: false, error: 'No se pudieron cargar las notas.' }));
      return false;
    }
  }, [folderId, search]);

  useEffect(() => {
    void load(1);
    return () => {
      requestId.current += 1;
      listAbort.current?.abort();
      mutationAbort.current?.abort();
    };
  }, [load]);

  const create = useCallback(async (title: string, content: string) => {
    if (state.mutating) return;
    mutationAbort.current?.abort();
    const controller = new AbortController();
    mutationAbort.current = controller;
    setState((current) => ({ ...current, mutating: true, error: undefined }));
    try {
      const response = await createNote({ title, content, folder_id: folderId || null }, { signal: controller.signal });
      if (response.status !== 201) throw new Error(`Crear nota respondió ${response.status}`);
      return await load(1);
    } catch {
      if (!controller.signal.aborted) setState((current) => ({ ...current, error: 'No se pudo crear la nota.' }));
    } finally {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false }));
    }
  }, [folderId, load, state.mutating]);

  const remove = useCallback(async (id: string) => {
    if (state.mutating) return;
    mutationAbort.current?.abort();
    const controller = new AbortController();
    mutationAbort.current = controller;
    const targetPage = state.notes.length === 1 && state.page > 1 ? state.page - 1 : state.page;
    setState((current) => ({ ...current, mutating: true, error: undefined }));
    try {
      const response = await deleteNote(id, { signal: controller.signal });
      if (response.status !== 204) throw new Error(`Eliminar nota respondió ${response.status}`);
      return await load(targetPage);
    } catch {
      if (!controller.signal.aborted) setState((current) => ({ ...current, error: 'No se pudo eliminar la nota.' }));
    } finally {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false }));
    }
  }, [load, state.mutating, state.notes.length, state.page]);

  const update = useCallback(async (id: string, title: string, content: string) => {
    if (state.mutating) return false;
    mutationAbort.current?.abort();
    const controller = new AbortController();
    mutationAbort.current = controller;
    setState((current) => ({ ...current, mutating: true, error: undefined }));
    try {
      const response = await updateNote(id, { title, content }, { signal: controller.signal });
      if (response.status !== 200) throw new Error(`Actualizar nota respondió ${response.status}`);
      return await load(state.page);
    } catch {
      if (!controller.signal.aborted) setState((current) => ({ ...current, error: 'No se pudo actualizar la nota.' }));
      return false;
    } finally {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false }));
    }
  }, [load, state.mutating, state.page]);

  const move = useCallback(async (id: string, targetFolderId: string | null) => {
    if (state.mutating) return false;
    mutationAbort.current?.abort();
    const controller = new AbortController();
    mutationAbort.current = controller;
    setState((current) => ({ ...current, mutating: true, error: undefined }));
    try {
      const response = await moveNote(id, { folder_id: targetFolderId }, { signal: controller.signal });
      if (response.status !== 200) throw new Error(`Mover nota respondió ${response.status}`);
      return await load(state.page);
    } catch {
      if (!controller.signal.aborted) setState((current) => ({ ...current, error: 'No se pudo mover la nota.' }));
      return false;
    } finally {
      if (!controller.signal.aborted) setState((current) => ({ ...current, mutating: false }));
    }
  }, [load, state.mutating, state.page]);

  return { ...state, perPage: PER_PAGE, load, create, remove, update, move };
}

import { FormEvent, useState } from 'react';
import { useNotes } from './useNotes';
import { useNoteFolders } from './useNoteFolders';

export function NotesPanel() {
  const [folderId, setFolderId] = useState('');
  const [folderName, setFolderName] = useState('');
  const [renameName, setRenameName] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const { folders, loading: foldersLoading, mutating: foldersMutating, error: foldersError, add: addFolder, remove: removeFolder, rename: renameFolder } = useNoteFolders();
  const { notes, total, page, perPage, loading, mutating, error, create, remove, update, move, load } = useNotes(folderId || undefined, search || undefined);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const selectedFolder = folders.find((folder) => folder.id === folderId);

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteTitle.trim()) return;
    if (await create(noteTitle.trim(), noteContent)) {
      setNoteTitle('');
      setNoteContent('');
    }
  }

  async function addNewFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderName.trim()) return;
    const folder = await addFolder(folderName.trim());
    if (folder) {
      setFolderName('');
      setFolderId(folder.id);
    }
  }

  async function deleteSelectedFolder() {
    if (!folderId) return;
    if (await removeFolder(folderId)) setFolderId('');
  }

  async function renameSelectedFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFolder || !renameName.trim()) return;
    if (await renameFolder(selectedFolder.id, renameName.trim())) setRenameName('');
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function beginEdit(note: { id: string; title: string; content: string }) {
    setEditingId(note.id);
    setEditingTitle(note.title);
    setEditingContent(note.content);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !editingTitle.trim()) return;
    if (await update(editingId, editingTitle.trim(), editingContent)) setEditingId(undefined);
  }

  return (
    <section className="panel-form" aria-labelledby="notes-title">
      <h2 id="notes-title">Notas</h2>
      <div className="notes-folders">
        <label>Carpeta
          <select aria-label="Carpeta de notas" value={folderId} onChange={(event) => setFolderId(event.target.value)} disabled={foldersLoading || foldersMutating}>
            <option value="">Todas las notas</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void deleteSelectedFolder()} disabled={!folderId || foldersMutating}>Eliminar carpeta</button>
      </div>
      {selectedFolder && <form className="folder-form" onSubmit={renameSelectedFolder}>
        <label>Renombrar carpeta<input required value={renameName} onChange={(event) => setRenameName(event.target.value)} maxLength={255} placeholder={selectedFolder.name} /></label>
        <button disabled={foldersMutating || !renameName.trim()} type="submit">Renombrar</button>
      </form>}
      <form className="folder-form" onSubmit={addNewFolder}>
        <label>Nueva carpeta<input value={folderName} onChange={(event) => setFolderName(event.target.value)} maxLength={255} /></label>
        <button disabled={foldersMutating} type="submit">Crear carpeta</button>
      </form>
      <form className="folder-form" onSubmit={submitSearch}>
        <label>Buscar notas<input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={100} /></label>
        <button disabled={loading || mutating} type="submit">Buscar</button>
        {search && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); }} disabled={loading || mutating}>Limpiar</button>}
      </form>
      <form className="notes-form" onSubmit={addNote}>
        <label>Título<input required value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} maxLength={255} /></label>
        <label>Contenido<textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} maxLength={10000} rows={4} /></label>
        <button disabled={mutating} type="submit">Nueva nota</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {foldersError && <p className="form-error" role="alert">{foldersError}</p>}
      <div className="notes-list" aria-live="polite">
        {loading && <p className="descripcion">Cargando notas…</p>}
        {!loading && notes.length === 0 && <p className="descripcion">Todavía no hay notas.</p>}
        {notes.map((note) => editingId === note.id ? (
          <form className="note-edit-form" key={note.id} onSubmit={saveEdit}>
            <label>Título<input required maxLength={255} value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} /></label>
            <label>Contenido<textarea maxLength={10000} rows={4} value={editingContent} onChange={(event) => setEditingContent(event.target.value)} /></label>
            <div className="note-actions"><button disabled={mutating} type="submit">Guardar cambios</button><button disabled={mutating} type="button" onClick={() => setEditingId(undefined)}>Cancelar</button></div>
          </form>
        ) : (
          <article className="note-card" key={note.id}><div><h3>{note.title}</h3><p>{note.content || 'Sin contenido'}</p></div><div className="note-actions"><button disabled={mutating} type="button" onClick={() => beginEdit(note)}>Editar</button><button disabled={mutating} type="button" onClick={() => void remove(note.id)}>Eliminar</button><label className="note-move">Mover a<select aria-label={`Mover ${note.title}`} value={note.folder_id ?? ''} disabled={mutating || foldersLoading} onChange={(event) => void move(note.id, event.target.value || null)}><option value="">General</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div></article>
        ))}
      </div>
      <div className="pagination" aria-label="Paginación de notas">
        <button type="button" disabled={page <= 1 || loading || mutating} onClick={() => load(page - 1)}>Anterior</button>
        <span>Página {page} de {pageCount}</span>
        <button type="button" disabled={page >= pageCount || loading || mutating} onClick={() => load(page + 1)}>Siguiente</button>
      </div>
    </section>
  );
}

import { FormEvent, useEffect, useRef, useState } from 'react';
import { updateProfile } from '../api/generated/profile/profile';
import type { User } from '../types/auth';

export function ProfilePanel({ user, onUpdated }: { user: User; onUpdated: (user: User) => void }) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? '');
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController>();

  useEffect(() => () => abortRef.current?.abort(), []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const currentRequest = ++requestId.current;
    setSaving(true);
    try {
      const response = await updateProfile({
        display_name: displayName,
        avatar_url: avatarUrl || null,
      }, { signal: controller.signal });
      if (response.status !== 200) throw new Error(`Perfil respondió ${response.status}`);
      const data = response.data;
      if (!controller.signal.aborted && currentRequest === requestId.current) {
        onUpdated({ ...data, avatar_url: data.avatar_url ?? null });
        setMessage('Perfil guardado.');
      }
    } catch {
      if (!controller.signal.aborted && currentRequest === requestId.current) setMessage('No se pudo guardar el perfil.');
    } finally {
      if (!controller.signal.aborted && currentRequest === requestId.current) setSaving(false);
    }
  }

  return (
    <form className="panel-form" onSubmit={save}>
      <h2>Perfil</h2>
      <label>Nombre visible<input disabled={saving} value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} /></label>
      <label>Avatar (URL)<input disabled={saving} type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} /></label>
      <button disabled={saving} type="submit">{saving ? 'Guardando…' : 'Guardar perfil'}</button>
      {message && <p className="status-message" role="status">{message}</p>}
    </form>
  );
}

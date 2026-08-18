import { FormEvent, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { login, logout as logoutSession, me, register } from './api/generated/auth/auth';
import { NotesPanel } from './features/NotesPanel';
import { ProfilePanel } from './features/ProfilePanel';
import { DashboardPanel } from './features/DashboardPanel';
import { ActivityPanel } from './features/ActivityPanel';
import { TeamsPanel } from './features/TeamsPanel';
import { SharedPanel } from './features/SharedPanel';
import { NotificationsPanel } from './features/NotificationsPanel';
import { TimelinePanel } from './features/TimelinePanel';
import type { User } from './types/auth';
import './App.css';

function toUser(user: { id: string; email: string; display_name: string; avatar_url?: string | null; created_at: string }): User {
  return { ...user, avatar_url: user.avatar_url ?? null };
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const response = registering
        ? await register({ email, password })
        : await login({ email, password });
      const expectedStatus = registering ? 201 : 200;
      if (response.status !== expectedStatus) throw new Error(`Auth respondió ${response.status}`);
      onAuthenticated(toUser(response.data.user));
    } catch {
      setError('No se pudo completar la autenticación. Comprueba los datos e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">GLORY / RUST</p>
        <h1 id="auth-title">Tu espacio de trabajo</h1>
        <p className="descripcion">La nueva base Rust conserva el producto React y sustituye el backend WordPress progresivamente.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
          <label>Contraseña<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={registering ? 'new-password' : 'current-password'} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button disabled={loading} type="submit">{loading ? 'Procesando…' : registering ? 'Crear cuenta' : 'Entrar'}</button>
        </form>
        <button className="text-button" type="button" onClick={() => setRegistering((value) => !value)}>{registering ? 'Ya tengo una cuenta' : 'Crear una cuenta'}</button>
      </section>
    </main>
  );
}

function Workspace({ user, onLogout, onUserUpdated }: { user: User; onLogout: () => void; onUserUpdated: (user: User) => void }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  async function logout() {
    setLoggingOut(true);
    setLogoutError(false);
    try {
      await logoutSession();
      onLogout();
    } catch {
      setLogoutError(true);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="workspace-layout">
      <section className="workspace-card">
        <p className="eyebrow">SESIÓN ACTIVA</p>
        <h1>Hola, {user.display_name || user.email}</h1>
        <p className="descripcion">El vertical slice de identidad está conectado a Rust mediante cookie HttpOnly y CSRF.</p>
        <ProfilePanel user={user} onUpdated={onUserUpdated} />
        <TeamsPanel />
        <SharedPanel />
        <NotificationsPanel />
        <TimelinePanel />
        <DashboardPanel />
        <ActivityPanel />
        <NotesPanel />
        <button disabled={loggingOut} type="button" onClick={logout}>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</button>
        {logoutError && <p className="form-error" role="alert">No se pudo cerrar la sesión. Inténtalo de nuevo.</p>}
        <a className="enlace" href="/swagger-ui/" target="_blank" rel="noreferrer">Abrir documentación API</a>
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    me()
      .then((response) => {
        if (response.status !== 200) throw new Error(`Me respondió ${response.status}`);
        setUser(toUser(response.data));
      })
      .catch(() => setUser(undefined))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <main className="auth-layout"><p>Cargando sesión…</p></main>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;
  return <Workspace user={user} onLogout={() => setUser(undefined)} onUserUpdated={setUser} />;
}

export default function AppRoot() {
  return <QueryClientProvider client={queryClient}><App /></QueryClientProvider>;
}

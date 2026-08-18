import {useState, useCallback} from 'react';
/* @ts-ignore - Módulo solo disponible en plataforma nativa Capacitor */
import {GoogleAuth} from '@codetrix-studio/capacitor-google-auth';
import GoogleAuthNative from '../plugins/GoogleAuthNative';
import {Capacitor} from '@capacitor/core';
import {limpiarTodosLosDatosUsuario} from '../utils/limpiezaSesion';

/* [correccion 18-08-2026] Lee el token CSRF de la cookie no HttpOnly
 * (contrato Rust ADR-02); reemplaza al nonce de WordPress. */
function obtenerTokenCsrf(): string {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

interface User {
    id?: string;
    name: string;
    email?: string;
    login?: string;
    description?: string;
    avatarUrl?: string;
}

interface UseAuthReturn {
    loginWithGoogle: () => Promise<void>;
    loginWithCredentials: (username: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    handleCallback: (code: string) => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
    error: string | null;
    user: User | null;
}

export function useAuth(): UseAuthReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* Inicializar usuario desde datos inyectados por WP */
    const [user, _setUser] = useState<User | null>(() => {
        if (typeof window === 'undefined') return null;
        const wpData = window.gloryDashboard;
        return wpData?.currentUser || null;
    });

    /* [18-08-2026] Google OAuth no tiene backend en Rust aun: se degrada a un
     * mensaje claro sin llamar a /wp-json. Cuando exista el flujo OAuth en
     * Rust se restaura este manejador. */
    const handleCallback = useCallback(async (_code: string) => {
        setLoading(false);
        setError('El acceso con Google aún no está disponible');
    }, []);

    const loginWithGoogle = useCallback(async () => {
        setLoading(false);
        setError('El acceso con Google aún no está disponible');
    }, []);

    const loginWithCredentials = useCallback(async (username: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            /* [correccion 18-08-2026] Login contra Rust: /api/auth/login
             * con cookie HttpOnly + CSRF (nada de nonces WordPress). */
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: username, password})
            });
            if (response.ok) {
                console.log('[Auth] Login exitoso, recargando...');
                window.location.reload();
                return;
            }
            const data = await response.json().catch(() => null);
            throw new Error(data?.message || 'Credenciales inválidas');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            setError(msg);
            setLoading(false);
            throw e;
        }
    }, []);

    const register = useCallback(async (username: string, email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            /* [correccion 18-08-2026] Registro contra Rust: /api/auth/register. */
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, password})
            });
            if (response.ok) {
                window.location.reload();
                return;
            }
            const data = await response.json().catch(() => null);
            throw new Error(data?.message || 'Error en el registro');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            setError(msg);
            setLoading(false);
            throw e;
        }
    }, []);

    const logout = useCallback(async () => {
        setLoading(true);
        try {
            /* Limpiar todos los datos del usuario antes de recargar para evitar cruce de sesiones */
            limpiarTodosLosDatosUsuario();

            /* Obtener el nonce de WordPress */
            const wpData = window.gloryDashboard;
            const nonce = wpData?.nonce || '';

            /* [correccion 18-08-2026] Logout contra Rust con CSRF header. */
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': obtenerTokenCsrf()
                }
            });
            if (response.ok) {
                window.location.reload();
            } else {
                console.error('Logout failed:', response.status);
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    }, []);

    return {loginWithGoogle, loginWithCredentials, register, handleCallback, logout, loading, error, user};
}

import {useState, useCallback} from 'react';
import {GoogleAuth} from '@codetrix-studio/capacitor-google-auth';
import GoogleAuthNative from '../plugins/GoogleAuthNative';
import {Capacitor} from '@capacitor/core';
import {limpiarTodosLosDatosUsuario} from '../utils/limpiezaSesion';

interface User {
    name: string;
    email: string;
    login: string;
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
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window === 'undefined') return null;
        const wpData = window.gloryDashboard;
        return wpData?.currentUser || null;
    });

    const handleCallback = useCallback(async (code: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/wp-json/glory/v1/auth/google/login', {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({code})
            });
            const data = await response.json();

            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.message || 'Error en login con Google');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            setError(msg);
            setLoading(false);
        }
    }, []);

    const loginWithGoogle = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (Capacitor.isNativePlatform()) {
                console.log('[GoogleAuthNative] Starting native sign-in...');

                await GoogleAuthNative.initialize({
                    serverClientId: '84327954353-6vcogj4mjjg4c2kip5imvh3vqijqslck.apps.googleusercontent.com'
                });

                const user = await GoogleAuthNative.signIn();
                console.log('[GoogleAuthNative] Success:', user);

                if (user.serverAuthCode) {
                    await handleCallback(user.serverAuthCode);
                } else {
                    throw new Error('No se recibió código de autorización de Google (serverAuthCode missing)');
                }
            } else {
                const response = await fetch('/wp-json/glory/v1/auth/google/url', {
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.success) {
                    window.location.href = data.url;
                } else {
                    throw new Error(data.message || 'Error obteniendo URL de login');
                }
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Error de conexión';

            // Log detallado para debugging nativo
            console.error('[GoogleAuth] Catch Error:', e);

            // Enviar log al servidor para verlo con -wpDebug
            // Intentamos extraer toda la info posible del objeto de error nativo
            /* Extraer propiedades del error nativo (Capacitor puede lanzar objetos con .code/.message) */
            const errorProps = e instanceof Object ? (e as Record<string, unknown>) : {};
            const errorMessage = String(errorProps.message ?? 'No message');
            const errorCode = errorProps.code != null ? String(errorProps.code) : 'No code';
            const errorDetails = {
                message: errorMessage,
                code: errorCode,
                fullError: JSON.stringify(e, e instanceof Object ? Object.getOwnPropertyNames(e) : undefined)
            };

            await fetch('/wp-json/glory/v1/auth/log', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    message: 'Fallo en GoogleAuth.signIn()',
                    data: errorDetails
                })
            }).catch(err => console.error('Fallo enviando log al servidor', err));

            // Alertar en móvil para verlo inmediatamente
            if (Capacitor.isNativePlatform()) {
                let alertMsg = `Error Google Login:\n${errorMessage}\nCode: ${errorCode}`;

                const errString = JSON.stringify(e);

                if (errorCode === '10' || errString.includes('"code":"10"') || errString.includes('"code":10')) {
                    alertMsg = '⚠️ Error 10: Configuración Incorrecta\n\n' + '- Revisa el SHA-1 en Google Console vs Keystore.\n' + '- Verifica que "server_client_id" esté en strings.xml.\n' + '- Asegúrate de que el package name coincida.';
                } else if (errorCode === '12500' || errString.includes('12500') || errorMessage.includes('12500')) {
                    alertMsg = '⚠️ Error 12500: Sign In Failed\n\n' + 'Causas probables:\n' + '1. Email de soporte NO configurado en OAuth Consent Screen.\n' + '2. Tu email no está en "Test Users" (si la app no está publicada).\n' + '3. Falta SHA-1 del Debug Keystore en Google Console.\n' + '4. El dispositivo no tiene Google Play Services actualizado.';
                } else {
                    // Si no es un error conocido, mostrar todo para depurar 'Authentication failed' genérico
                    alertMsg = `Error Google Login (RAW):\n${errString}\n\nMsg: ${errorMessage}`;
                }
                alert(alertMsg);
            }

            setError(msg);
            setLoading(false);
        }
    }, [handleCallback]);

    const loginWithCredentials = useCallback(async (username: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/wp-json/glory/v1/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            });
            const rawText = await response.clone().text();
            console.log('[Auth] Respuesta server:', response.status, rawText);

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (err) {
                console.error('[Auth] Error parseando JSON:', err);
                throw new Error('Error del servidor: Respuesta inválida');
            }

            if (data.success) {
                console.log('[Auth] Login exitoso, recargando...');
                window.location.reload();
            } else {
                console.warn('[Auth] Login fallido:', data.message);
                throw new Error(data.message || 'Error en login');
            }
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
            const response = await fetch('/wp-json/glory/v1/auth/register', {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, email, password})
            });
            const data = await response.json();

            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.message || 'Error en el registro');
            }
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

            const response = await fetch('/wp-json/glory/v1/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': nonce
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

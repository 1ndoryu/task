import {useState, useCallback} from 'react';
import {GoogleAuth} from '@codetrix-studio/capacitor-google-auth';
import {Capacitor} from '@capacitor/core';

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
        const wpData = (window as any).gloryDashboard;
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
            // Debug para confirmar código actualizado
            // alert('Debug: Iniciando login. Nativo? ' + Capacitor.isNativePlatform());

            if (Capacitor.isNativePlatform()) {
                await GoogleAuth.initialize();
                
                // Debug: Verificar configuración antes de signIn
                console.log('[GoogleAuth] Config Check:', {
                    platform: Capacitor.getPlatform(),
                    isNative: Capacitor.isNativePlatform()
                });
                
                const user = await GoogleAuth.signIn();
                console.log('Google User:', user);

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
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : 'Error de conexión';

            // Log detallado para debugging nativo
            console.error('[GoogleAuth] Catch Error:', e);

            // Enviar log al servidor para verlo con -wpDebug
            // Intentamos extraer toda la info posible del objeto de error nativo
            const errorDetails = {
                message: e?.message || 'No message',
                code: e?.code || 'No code',
                fullError: JSON.stringify(e, Object.getOwnPropertyNames(e))
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
                let alertMsg = `Error Google Login:\n${e?.message || 'Unknown'}\nCode: ${e?.code || 'N/A'}`;
                
                if (e?.code === '10' || e?.code === 10 || JSON.stringify(e).includes('"code":"10"') || JSON.stringify(e).includes('"code":10')) {
                    alertMsg = '⚠️ Error Code 10 (Developer Error)\n\n' +
                        'Pasos de Verificación:\n\n' +
                        '1. Google Cloud Console > APIs & Services:\n' +
                        '   - Verificar que "Google Sign-In API" esté ENABLED\n\n' +
                        '2. Credentials > OAuth 2.0:\n' +
                        '   - Android Client con SHA-1: 49:3D:C2:05...\n' +
                        '   - Package: com.taskNakomi.app\n\n' +
                        '3. OAuth Consent Screen:\n' +
                        '   - Modo "Testing" con tu email invitado\n' +
                        '   - O modo "Production"\n\n' +
                        '4. Uninstall completo de la app y reinstalar';
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
            /* Obtener el nonce de WordPress */
            const wpData = (window as any).gloryDashboard;
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

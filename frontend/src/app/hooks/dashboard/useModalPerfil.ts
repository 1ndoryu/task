/*
 * useModalPerfil
 * Hook que encapsula la lógica del modal de edición de perfil.
 * Gestiona formulario, avatar, cambio de contraseña y envío al backend.
 */

import {useState, useEffect, useRef, useCallback} from 'react';
import {useAuth} from '../useAuth';
import {apiFetch} from '../../utils/apiClient';

interface DatosPerfil {
    nombre: string;
    descripcion: string;
    avatarUrl: string;
    passwordActual: string;
    passwordNueva: string;
    passwordConfirmar: string;
}

export interface UseModalPerfilProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

export interface UseModalPerfilReturn {
    /* Estado */
    datos: DatosPerfil;
    cargando: boolean;
    mensaje: {tipo: 'exito' | 'error'; texto: string} | null;
    fileInputRef: React.RefObject<HTMLInputElement | null>;

    /* Acciones */
    handleChange: (campo: keyof DatosPerfil, valor: string) => void;
    handleAvatarClick: () => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: () => Promise<void>;
}

export function useModalPerfil({estaAbierto, onCerrar: _onCerrar}: UseModalPerfilProps): UseModalPerfilReturn {
    const {user} = useAuth();
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState<{tipo: 'exito' | 'error'; texto: string} | null>(null);

    const [datos, setDatos] = useState<DatosPerfil>({
        nombre: user?.name || '',
        descripcion: 'Usuario del Dashboard',
        avatarUrl: '',
        passwordActual: '',
        passwordNueva: '',
        passwordConfirmar: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    /* Actualizar datos cuando cambia el user */
    useEffect(() => {
        if (user && estaAbierto) {
            setDatos(prev => ({
                ...prev,
                nombre: user.name,
                descripcion: user.description || '',
                avatarUrl: user.avatarUrl || ''
            }));
        }
    }, [user, estaAbierto]);

    const handleChange = useCallback((campo: keyof DatosPerfil, valor: string) => {
        setDatos(prev => ({...prev, [campo]: valor}));
        if (mensaje) setMensaje(null);
    }, [mensaje]);

    const handleAvatarClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            /* Validar tamaño (2MB) */
            if (file.size > 2 * 1024 * 1024) {
                setMensaje({tipo: 'error', texto: 'La imagen no debe superar los 2MB'});
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setDatos(prev => ({...prev, avatarUrl: reader.result as string}));
                setMensaje(null);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const handleSubmit = useCallback(async () => {
        /* Validaciones básicas */
        if (!datos.nombre.trim()) {
            setMensaje({tipo: 'error', texto: 'El nombre es obligatorio'});
            return;
        }

        if (datos.passwordNueva) {
            if (datos.passwordNueva !== datos.passwordConfirmar) {
                setMensaje({tipo: 'error', texto: 'Las contraseñas nuevas no coinciden'});
                return;
            }
            if (!datos.passwordActual) {
                setMensaje({tipo: 'error', texto: 'Debes ingresar tu contraseña actual para cambiarla'});
                return;
            }
        }

        setCargando(true);
        setMensaje(null);

        try {
            /* [18-08-2026] PUT /api/profile contra Rust; sin nonce. El cambio
             * de contraseña va a PUT /api/security/password (invalida todas las
             * sesiones: el usuario debe volver a iniciar sesión). */
            const esAvatarUrl = datos.avatarUrl.startsWith('http://') || datos.avatarUrl.startsWith('https://');

            let cambioContrasena = false;
            if (datos.passwordNueva) {
                /* [H-B04-01] El backend verifica la contraseña actual: una
                 * sesión robada ya no basta para tomar la cuenta. */
                await apiFetch('/security/password', {
                    method: 'PUT',
                    body: JSON.stringify({
                        nuevaContrasena: datos.passwordNueva,
                        contrasenaActual: datos.passwordActual
                    })
                });
                cambioContrasena = true;
            }

            await apiFetch('/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    displayName: datos.nombre,
                    avatarUrl: esAvatarUrl ? datos.avatarUrl : null
                })
            });

            setMensaje({
                tipo: 'exito',
                texto: cambioContrasena
                    ? 'Perfil actualizado y contraseña cambiada; vuelve a iniciar sesión'
                    : 'Perfil actualizado correctamente'
            });

            /* Recargar para actualizar el usuario en el shim de sesion */
            setTimeout(() => {
                window.location.reload();
            }, 1500);

            /* Limpiar passwords */
            setDatos(prev => ({
                ...prev,
                passwordActual: '',
                passwordNueva: '',
                passwordConfirmar: ''
            }));
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : 'Error desconocido al actualizar perfil';
            setMensaje({tipo: 'error', texto: msg});
        } finally {
            setCargando(false);
        }
    }, [datos]);

    return {
        datos,
        cargando,
        mensaje,
        fileInputRef,
        handleChange,
        handleAvatarClick,
        handleFileChange,
        handleSubmit
    };
}

/*
 * useModalPerfil
 * Hook que encapsula la lógica del modal de edición de perfil.
 * Gestiona formulario, avatar, cambio de contraseña y envío al backend.
 */

import {useState, useEffect, useRef, useCallback} from 'react';
import {useAuth} from '../useAuth';

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
    fileInputRef: React.RefObject<HTMLInputElement>;

    /* Acciones */
    handleChange: (campo: keyof DatosPerfil, valor: string) => void;
    handleAvatarClick: () => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: () => Promise<void>;
}

export function useModalPerfil({estaAbierto, onCerrar}: UseModalPerfilProps): UseModalPerfilReturn {
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
            const nonce = window.gloryDashboard?.nonce;
            if (!nonce) {
                throw new Error('Error de autenticación: No se encontró nonce');
            }

            const payload = {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                passwordActual: datos.passwordActual,
                passwordNueva: datos.passwordNueva,
                avatar: datos.avatarUrl
            };

            const response = await fetch('/wp-json/glory/v1/perfil', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': nonce
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Error al actualizar perfil');
            }

            setMensaje({tipo: 'exito', texto: data.message || 'Perfil actualizado correctamente'});

            /* Recargar la página para actualizar los datos del usuario en WP */
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

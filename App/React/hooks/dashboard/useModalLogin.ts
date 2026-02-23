/*
 * useModalLogin
 * Hook que encapsula la lógica del modal de login/registro/recuperación.
 * Gestiona estados del formulario, modos, y recuperación de contraseña.
 */

import {useState} from 'react';

export interface UseModalLoginProps {
    onLoginCredentials: (u: string, p: string) => Promise<void>;
    onRegister: (u: string, e: string, p: string) => Promise<void>;
    loading: boolean;
}

export interface UseModalLoginReturn {
    /* Estado del formulario */
    modo: 'login' | 'registro' | 'recuperar';
    setModo: (v: 'login' | 'registro' | 'recuperar') => void;
    username: string;
    setUsername: (v: string) => void;
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    emailRecuperar: string;
    setEmailRecuperar: (v: string) => void;
    recuperarLoading: boolean;
    recuperarMensaje: {tipo: 'exito' | 'error'; texto: string} | null;

    /* Acciones */
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleRecuperar: (e: React.FormEvent) => Promise<void>;
    irARecuperarContrasena: () => void;
    volverALogin: () => void;

    /* Derivados */
    tituloModal: string;
}

export function useModalLogin({onLoginCredentials, onRegister, loading}: UseModalLoginProps): UseModalLoginReturn {
    const [modo, setModo] = useState<'login' | 'registro' | 'recuperar'>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailRecuperar, setEmailRecuperar] = useState('');
    const [recuperarLoading, setRecuperarLoading] = useState(false);
    const [recuperarMensaje, setRecuperarMensaje] = useState<{tipo: 'exito' | 'error'; texto: string} | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;

        if (modo === 'registro') {
            if (!email) return;
            await onRegister(username, email, password);
        } else {
            await onLoginCredentials(username, password);
        }
    };

    const handleRecuperar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailRecuperar) return;

        setRecuperarLoading(true);
        setRecuperarMensaje(null);

        try {
            const response = await fetch('/wp-json/glory/v1/auth/recuperar', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: emailRecuperar})
            });
            const data = await response.json();
            setRecuperarMensaje({tipo: 'exito', texto: data.message});
            setEmailRecuperar('');
        } catch {
            setRecuperarMensaje({tipo: 'error', texto: 'Error al procesar la solicitud'});
        } finally {
            setRecuperarLoading(false);
        }
    };

    const irARecuperarContrasena = () => {
        setModo('recuperar');
        setRecuperarMensaje(null);
    };

    const volverALogin = () => {
        setModo('login');
    };

    const tituloModal = modo === 'login' ? 'Acceso a Glory Dashboard' : modo === 'registro' ? 'Registro de Usuario' : 'Recuperar Contraseña';

    return {
        modo,
        setModo,
        username,
        setUsername,
        email,
        setEmail,
        password,
        setPassword,
        emailRecuperar,
        setEmailRecuperar,
        recuperarLoading,
        recuperarMensaje,
        handleSubmit,
        handleRecuperar,
        irARecuperarContrasena,
        volverALogin,
        tituloModal
    };
}

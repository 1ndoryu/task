import React, {useState} from 'react';
import {Modal} from '../shared/Modal';
import {CampoTexto} from '../shared/CampoTexto';
import {Boton} from '../ui';
import {Chrome, LogIn} from 'lucide-react';
import '../../styles/dashboard/componentes/modalLogin.css';

interface ModalLoginProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onLoginGoogle: () => void;
    onLoginCredentials: (u: string, p: string) => Promise<void>;
    onRegister: (u: string, e: string, p: string) => Promise<void>;
    loading: boolean;
    error: string | null;
    /* Si true, el overlay será opaco para ocultar la app de fondo */
    overlayOpaco?: boolean;
}

export function ModalLogin({estaAbierto, onCerrar, onLoginGoogle, onLoginCredentials, onRegister, loading, error, overlayOpaco = false}: ModalLoginProps): JSX.Element {
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

    const tituloModal = modo === 'login' ? 'Acceso a Glory Dashboard' : modo === 'registro' ? 'Registro de Usuario' : 'Recuperar Contraseña';

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo={tituloModal} claseOverlay={overlayOpaco ? 'modalLoginOverlay' : ''}>
            <div className="modalLoginContenido">
                {modo !== 'recuperar' ? (
                    <>
                        <div className="loginTabs">
                            <Boton
                                variante={modo === 'login' ? 'primario' : 'ghost'}
                                onClick={() => setModo('login')}
                                claseAdicional={`loginTab ${modo === 'login' ? 'activo' : ''}`}
                            >
                                Iniciar Sesión
                            </Boton>
                            <Boton
                                variante={modo === 'registro' ? 'primario' : 'ghost'}
                                onClick={() => setModo('registro')}
                                claseAdicional={`loginTab ${modo === 'registro' ? 'activo' : ''}`}
                            >
                                Registrarse
                            </Boton>
                        </div>

                        {error && (
                            <div className="loginError">
                                <span className="loginError__icono">⚠️</span>
                                <span className="loginError__texto">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="loginForm">
                            <CampoTexto titulo="Usuario" valor={username} onChange={setUsername} autoFocus disabled={loading} />

                            {modo === 'registro' && <CampoTexto titulo="Email" valor={email} onChange={setEmail} tipo="email" disabled={loading} />}

                            <CampoTexto titulo="Contraseña" valor={password} onChange={setPassword} tipo="password" disabled={loading} />

                            <div style={{marginTop: 8}}></div>

                            <Boton
                                type="submit"
                                variante="primario"
                                disabled={loading}
                                cargando={loading}
                                claseAdicional="botonPrimario botonFull"
                            >
                                {!loading && (
                                    <>
                                        <LogIn size={16} style={{marginRight: 8}} />
                                        {modo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                    </>
                                )}
                            </Boton>

                            {modo === 'login' && (
                                <Boton
                                    variante="link"
                                    onClick={() => {
                                        setModo('recuperar');
                                        setRecuperarMensaje(null);
                                    }}
                                    claseAdicional="enlaceRecuperar"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Boton>
                            )}
                        </form>

                        <Boton
                            variante="secundario"
                            onClick={onLoginGoogle}
                            disabled={loading}
                            claseAdicional="botonSecundario botonFull botonGoogle"
                            icono={<Chrome size={16} />}
                        >
                            Continuar con Google
                        </Boton>
                    </>
                ) : (
                    <div className="recuperarContenido">
                        <p className="recuperarDescripcion">Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.</p>

                        {recuperarMensaje && <div className={`mensajeRecuperar mensajeRecuperar--${recuperarMensaje.tipo}`}>{recuperarMensaje.texto}</div>}

                        <form onSubmit={handleRecuperar} className="loginForm">
                            <CampoTexto titulo="Correo Electrónico" valor={emailRecuperar} onChange={setEmailRecuperar} tipo="email" autoFocus disabled={recuperarLoading} />

                            <Boton
                                type="submit"
                                variante="primario"
                                disabled={recuperarLoading}
                                cargando={recuperarLoading}
                                claseAdicional="botonPrimario botonFull"
                            >
                                Enviar Instrucciones
                            </Boton>
                        </form>

                        <Boton
                            variante="link"
                            onClick={() => setModo('login')}
                            claseAdicional="enlaceRecuperar"
                        >
                            ← Volver al inicio de sesión
                        </Boton>
                    </div>
                )}
            </div>
        </Modal>
    );
}

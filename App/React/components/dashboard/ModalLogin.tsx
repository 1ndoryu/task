/*
 * ModalLogin
 * Modal de inicio de sesión / registro / recuperación de contraseña
 * Lógica extraída a useModalLogin hook
 */


import {Modal} from '../shared/Modal';
import {CampoTexto} from '../shared/CampoTexto';
import {Boton} from '../ui';
import {Chrome, LogIn} from 'lucide-react';
import '../../styles/dashboard/componentes/modalLogin.css';
import {useModalLogin} from '../../hooks/dashboard/useModalLogin';

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
    const {
        modo, setModo, username, setUsername, email, setEmail,
        password, setPassword, emailRecuperar, setEmailRecuperar,
        recuperarLoading, recuperarMensaje,
        handleSubmit, handleRecuperar, irARecuperarContrasena, volverALogin,
        tituloModal
    } = useModalLogin({onLoginCredentials, onRegister, loading});

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo={tituloModal} claseOverlay={overlayOpaco ? 'modalLoginOverlay' : ''}>
            <div className="modalLoginContenido">
                {modo !== 'recuperar' ? (
                    <>
                        <div className="loginTabs">
                            <Boton
                                variante="pestaña"
                                activo={modo === 'login'}
                                onClick={() => setModo('login')}
                            >
                                Iniciar Sesión
                            </Boton>
                            <Boton
                                variante="pestaña"
                                activo={modo === 'registro'}
                                onClick={() => setModo('registro')}
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

                            <div className="espaciadorSm"></div>

                            <Boton
                                type="submit"
                                variante="primario"
                                disabled={loading}
                                cargando={loading}
                                claseAdicional="botonPrimario botonFull"
                            >
                                {!loading && (
                                    <>
                                        <LogIn size={16} className="iconoConMargen" />
                                        {modo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                    </>
                                )}
                            </Boton>

                            {modo === 'login' && (
                                <Boton
                                    variante="link"
                                    onClick={irARecuperarContrasena}
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
                            onClick={volverALogin}
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

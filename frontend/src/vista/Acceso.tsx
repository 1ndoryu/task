/* Pantalla de acceso: entrar, crear cuenta, recuperar la contraseña o seguir
 * de invitado. Sale cuando no hay sesión; con sesión local la app ni la ve. */
import { useId, useState, type FormEvent } from 'react';
import { fijarInvitado } from '../logica/invitado';
import { acceder } from '../logica/sesion';

type Modo = 'login' | 'registro' | 'recuperar';

const TITULOS: Record<Modo, string> = { login: 'Entrar', registro: 'Crear cuenta', recuperar: 'Recuperar contraseña' };

export function Acceso() {
  const [modo, setModo] = useState<Modo>('login');
  const [error, setError] = useState('');
  const [enCurso, setEnCurso] = useState(false);
  const idCorreo = useId();
  const idClave = useId();

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (modo === 'recuperar') return;
    const datos = new FormData(evento.currentTarget);
    setEnCurso(true);
    const fallo = await acceder(modo, String(datos.get('correo')), String(datos.get('clave')));
    if (fallo) {
      setError(fallo);
      setEnCurso(false);
    } else location.reload();
  };

  const cambiar = (nuevo: Modo) => {
    setModo(nuevo);
    setError('');
  };

  return (
    <main className="acceso">
      <form className="acceso__caja" onSubmit={(e) => void enviar(e)}>
        <h1 className="acceso__titulo">{TITULOS[modo]}</h1>
        {modo === 'recuperar' ? (
          <p className="acceso__nota">
            Todavía no se pueden enviar correos de recuperación desde aquí. Si olvidaste la contraseña, pídesela a quien
            administra el servicio, o sigue de invitado mientras tanto.
          </p>
        ) : (
          <>
            <label className="campo__titulo" htmlFor={idCorreo}>
              Correo
            </label>
            <input id={idCorreo} name="correo" type="email" className="entrada" required autoComplete="email" />
            <label className="campo__titulo" htmlFor={idClave}>
              Contraseña
            </label>
            <input
              id={idClave}
              name="clave"
              type="password"
              className="entrada"
              required
              minLength={modo === 'registro' ? 8 : undefined}
              autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
            />
            {error && (
              <p className="acceso__error" role="alert">
                {error}
              </p>
            )}
            {/* sentinel-disable-next-line button-clase-especifica: la misma receta que el pie de los modales */}
            <button type="submit" className="boton boton--principal" disabled={enCurso}>
              {TITULOS[modo]}
            </button>
          </>
        )}
        <div className="acceso__enlaces">
          {modo !== 'login' && (
            <button type="button" className="acceso__enlace" onClick={() => cambiar('login')}>
              Ya tengo cuenta
            </button>
          )}
          {modo !== 'registro' && (
            <button type="button" className="acceso__enlace" onClick={() => cambiar('registro')}>
              Crear cuenta
            </button>
          )}
          {modo !== 'recuperar' && (
            <button type="button" className="acceso__enlace" onClick={() => cambiar('recuperar')}>
              Olvidé mi contraseña
            </button>
          )}
        </div>
        <button
          type="button"
          className="boton"
          onClick={() => {
            fijarInvitado(true);
            location.reload();
          }}
        >
          Seguir como invitado
        </button>
        <p className="acceso__nota">Invitado: tus tareas se guardan solo en este equipo, sin cuenta.</p>
      </form>
    </main>
  );
}

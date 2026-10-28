/* Modal de perfil: foto (local), nombre y correo. El invitado solo ve su
 * foto: no tiene cuenta, así que no hay nombre ni correo que cambiar. */
import { useId, useRef, useState } from 'react';
import { guardarFoto, guardarNombre, quitarFoto, type Perfil } from '../logica/perfil';
import { Avatar } from './Avatar';
import { Modal } from './Modal';

interface Props {
  abierto: boolean;
  perfil: Perfil;
  foto: string | null;
  onFoto: (url: string | null) => void;
  onNombre: (nombre: string) => void;
  onCerrar: () => void;
}

export function ModalPerfil({ abierto, perfil, foto, onFoto, onNombre, onCerrar }: Props) {
  const selector = useRef<HTMLInputElement>(null);
  const idNombre = useId();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [error, setError] = useState('');

  const elegirFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    try {
      onFoto(await guardarFoto(archivo));
    } catch {
      setError('No se pudo leer esa imagen.');
    }
  };

  const alElegir = async (id: string) => {
    if (id !== 'guardar') return onCerrar();
    try {
      await guardarNombre(nombre.trim());
      onNombre(nombre.trim());
      onCerrar();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar.');
    }
  };

  return (
    <Modal
      abierto={abierto}
      titulo="Tu perfil"
      botones={[
        { id: 'cerrar', etiqueta: 'Cerrar' },
        ...(perfil.invitado ? [] : [{ id: 'guardar', etiqueta: 'Guardar', principal: true }]),
      ]}
      onElegir={(id) => void alElegir(id)}
      onCerrar={onCerrar}
    >
      <div className="perfil">
        <Avatar foto={foto} nombre={perfil.nombre} grande />
        <div className="perfil__acciones">
          <button type="button" className="boton" onClick={() => selector.current?.click()}>
            Cambiar foto
          </button>
          {foto && (
            <button
              type="button"
              className="boton"
              onClick={() => {
                quitarFoto();
                onFoto(null);
              }}
            >
              Quitar
            </button>
          )}
          <input
            ref={selector}
            type="file"
            accept="image/*"
            hidden
            onChange={(evento) => void elegirFoto(evento.target.files?.[0])}
          />
        </div>
      </div>
      {perfil.invitado ? (
        <p className="perfil__nota">
          Modo invitado: tus datos viven solo en este equipo. Entra con una cuenta para tenerlos en cualquier sitio.
        </p>
      ) : (
        <div className="campo">
          <label className="campo__titulo" htmlFor={idNombre}>
            Nombre
          </label>
          <input id={idNombre} className="entrada" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
          <p className="perfil__nota">{perfil.correo}</p>
        </div>
      )}
      {error && <p className="perfil__error">{error}</p>}
    </Modal>
  );
}

/* El botón de la persona en la barra: su cara abre un menú con el perfil y la
 * salida. La foto y el nombre se piden una vez; el modal los actualiza. */
import { useEffect, useState } from 'react';
import { cerrarSesion, leerFoto, leerPerfil, type Perfil } from '../logica/perfil';
import { Avatar } from './Avatar';
import { Menu } from './Menu';
import { ModalPerfil } from './ModalPerfil';

const ANONIMO: Perfil = { nombre: '', correo: '', invitado: false };

export function BotonPerfil() {
  const [perfil, setPerfil] = useState<Perfil>(ANONIMO);
  const [foto, setFoto] = useState<string | null>(leerFoto);
  const [verPerfil, setVerPerfil] = useState(false);

  useEffect(() => {
    void leerPerfil().then(setPerfil).catch(() => undefined);
  }, []);

  return (
    <>
      <Menu
        etiqueta={<Avatar foto={foto} nombre={perfil.nombre} />}
        titulo={perfil.nombre ? `Perfil de ${perfil.nombre}` : 'Perfil'}
        items={[
          { id: 'ver', etiqueta: 'Ver perfil', accion: true },
          { id: 'salir', etiqueta: perfil.invitado ? 'Salir del modo invitado' : 'Cerrar sesión', accion: true, peligro: true },
        ]}
        onElegir={(id) => (id === 'ver' ? setVerPerfil(true) : void cerrarSesion())}
        claseBoton="barra__boton barra__icono"
      />
      {/* Se monta con el perfil ya leído para que el nombre arranque bien. */}
      {perfil.nombre && (
        <ModalPerfil
          abierto={verPerfil}
          perfil={perfil}
          foto={foto}
          onFoto={setFoto}
          onNombre={(nombre) => setPerfil({ ...perfil, nombre })}
          onCerrar={() => setVerPerfil(false)}
        />
      )}
    </>
  );
}

/* Caja «Archivados»: los grupos y las notas archivados, cada uno con su
 * «Recuperar». Es una caja de sistema más: se arrastra, se redimensiona y se
 * minimiza como las demás, pero no tiene menú de panel ni se renombra. Archivar
 * nunca borra, así que desde aquí todo vuelve tal cual estaba. */
import type { ReactNode } from 'react';
import type { TamanoCaja } from '../logica/preferencias';
import { CarcasaCaja } from './CarcasaCaja';

/** Lo que la caja enseña y los dos botones de recuperar. */
export interface DatosArchivados {
  grupos: string[];
  notas: { id: string; titulo: string }[];
  onDesarchivarGrupo: (nombre: string) => void;
  onRecuperarNota: (id: string) => void;
}

interface Props extends DatosArchivados {
  /** Con id, el carril la reconoce como pieza que se arrastra. */
  idPanel?: string;
  /** Tamaño propio de la caja y su asa: como cualquier otra caja del carril. */
  tamano?: TamanoCaja;
  onTamano?: (tamano: TamanoCaja | undefined) => void;
  minimizada?: boolean;
  /** Botón de minimizar, que pone quien pinta el carril. */
  botonMinimizar?: ReactNode;
}

export function Archivados({
  grupos,
  notas,
  onDesarchivarGrupo,
  onRecuperarNota,
  idPanel,
  tamano,
  onTamano,
  minimizada,
  botonMinimizar,
}: Props): ReactNode {
  const vacio = grupos.length === 0 && notas.length === 0;
  return (
    <CarcasaCaja
      clases={['caja--archivados']}
      nombradaPor="archivados-titulo"
      idPanel={idPanel}
      tamano={tamano}
      onTamano={onTamano}
      minimizada={minimizada}
      cabecera={
        <header className="barra">
          <h2 className="barra__titulo" id="archivados-titulo">
            Archivados
          </h2>
          <div className="barra__acciones">{botonMinimizar}</div>
        </header>
      }
    >
      {vacio ? (
        <p className="aviso aviso--vacio">Nada archivado.</p>
      ) : (
        <div className="scroll">
          {grupos.length > 0 && (
            <>
              <h3 className="archivados__subtitulo">Grupos</h3>
              <ul className="lista">
                {grupos.map((nombre) => (
                  <li className="archivado" key={`grupo:${nombre}`}>
                    <span className="archivado__nombre">{nombre}</span>
                    {/* Un botón nativo: el teclado lo alcanza y Enter o Espacio lo pulsan. */}
                    <button
                      type="button"
                      className="barra__boton"
                      aria-label={`Recuperar el grupo ${nombre}`}
                      onClick={() => onDesarchivarGrupo(nombre)}
                    >
                      Recuperar
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {notas.length > 0 && (
            <>
              <h3 className="archivados__subtitulo">Notas</h3>
              <ul className="lista">
                {notas.map((nota) => (
                  <li className="archivado" key={`nota:${nota.id}`}>
                    <span className="archivado__nombre">{nota.titulo}</span>
                    <button
                      type="button"
                      className="barra__boton"
                      aria-label={`Recuperar la nota ${nota.titulo}`}
                      onClick={() => onRecuperarNota(nota.id)}
                    >
                      Recuperar
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </CarcasaCaja>
  );
}

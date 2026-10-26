/* Panel «Archivados», al final de la vista: los grupos y las notas archivados,
 * cada uno con su «Recuperar». No es un panel de contenido: no se arrastra, no
 * tiene menú de panel y no cuenta como pestaña. Archivar nunca borra, así que
 * desde aquí todo vuelve tal cual estaba. */
import type { ReactNode } from 'react';

interface Props {
  grupos: string[];
  notas: { id: string; titulo: string }[];
  onDesarchivarGrupo: (nombre: string) => void;
  onRecuperarNota: (id: string) => void;
}

export function Archivados({ grupos, notas, onDesarchivarGrupo, onRecuperarNota }: Props): ReactNode {
  const vacio = grupos.length === 0 && notas.length === 0;
  return (
    <section className="caja caja--archivados" aria-labelledby="archivados-titulo">
      <header className="barra">
        <h2 className="barra__titulo" id="archivados-titulo">
          Archivados
        </h2>
      </header>
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
    </section>
  );
}

/* Modal con título, cuerpo y botones: la receta de `estilos/modal.css` más una
 * fila de acciones al pie. Los modales que se guardan solos (ajustes,
 * configuración) no lo necesitan; este es para los que piden decidir antes de
 * aplicar algo, como borrar un grupo. Escape y el clic fuera cierran como
 * siempre: `<dialog>` nativo. */
import { useId, type ReactNode } from 'react';
import { Dialogo } from './Dialogo';

export interface BotonModal {
  id: string;
  etiqueta: string;
  /** Una acción que destruye: se pinta en sangre. */
  peligro?: boolean;
  /** La acción que se espera; va la última y con fondo de tinta. */
  principal?: boolean;
}

interface Props {
  abierto: boolean;
  /** Opcional: un panel que se entiende solo no necesita rótulo. */
  titulo?: string;
  /** Nombre para lectores de pantalla cuando no hay título visible. */
  etiqueta?: string;
  children: ReactNode;
  /** Sin botones no se pinta el pie. */
  botones: BotonModal[];
  onElegir: (id: string) => void;
  onCerrar: () => void;
}

export function Modal({ abierto, titulo, etiqueta, children, botones, onElegir, onCerrar }: Props) {
  const idTitulo = useId();

  return (
    <Dialogo clase="modal--acciones" etiqueta={!titulo ? etiqueta : undefined} nombradoPor={titulo ? idTitulo : undefined} abierto={abierto} onCerrar={onCerrar}>
      <div className="modal__caja">
        <div className={`modal__cuerpo${titulo ? '' : ' modal__cuerpo--sin-titulo'}`}>
          {titulo && (
            <p className="modal__titulo" id={idTitulo}>
              {titulo}
            </p>
          )}
          {children}
        </div>
        {botones.length > 0 && (
          <div className="modal__pie">
            {botones.map((boton) => (
              <button
                key={boton.id}
                type="button"
                className={[
                  'boton',
                  boton.peligro && 'boton--peligro',
                  boton.principal && 'boton--principal',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onElegir(boton.id)}
              >
                {boton.etiqueta}
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialogo>
  );
}

/* Modal con título, cuerpo y botones: la receta de `estilos/modal.css` más una
 * fila de acciones al pie. Los modales que se guardan solos (ajustes,
 * configuración) no lo necesitan; este es para los que piden decidir antes de
 * aplicar algo, como borrar un grupo. Escape y el clic fuera cierran como
 * siempre: `<dialog>` nativo. */
import { useEffect, useId, useRef, type ReactNode } from 'react';

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
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    if (abierto && !nodo.open) nodo.showModal();
    if (!abierto && nodo.open) nodo.close();
  }, [abierto]);

  // Escape llega aquí; el estado que abre el modal vive fuera.
  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    const alCerrar = () => onCerrar();
    nodo.addEventListener('close', alCerrar);
    return () => nodo.removeEventListener('close', alCerrar);
  }, [onCerrar]);

  return (
    <dialog
      className="modal modal--acciones"
      ref={dialogo}
      aria-label={!titulo ? etiqueta : undefined}
      aria-labelledby={titulo ? idTitulo : undefined}
      onClick={(evento) => {
        // El clic fuera del contenido solo alcanza al propio `<dialog>`.
        if (evento.target === dialogo.current) onCerrar();
      }}
    >
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
    </dialog>
  );
}

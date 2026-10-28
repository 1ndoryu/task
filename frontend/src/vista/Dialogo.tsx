/* Carcasa común de todo modal: el `<dialog>` nativo con su fondo, el foco, el
 * bloqueo del resto y Escape que pone el navegador, y el cierre con un clic
 * fuera. Modal, Ajustes y Calendario la comparten: un diálogo nuevo hereda el
 * fondo oscuro sin acordarse de pedirlo (el calendario, hecho a mano, no lo
 * tenía). */
import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  /** Los diálogos que solo se montan abiertos pueden omitirlo. */
  abierto?: boolean;
  /** Clases del diálogo; `modal` va siempre. */
  clase?: string;
  etiqueta?: string;
  nombradoPor?: string;
  onCerrar: () => void;
  children: ReactNode;
}

export function Dialogo({ abierto = true, clase, etiqueta, nombradoPor, onCerrar, children }: Props) {
  const nodo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = nodo.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  // Escape llega aquí; el estado que abre el diálogo vive fuera.
  useEffect(() => {
    const dialogo = nodo.current;
    if (!dialogo) return;
    const alCerrar = () => onCerrar();
    dialogo.addEventListener('close', alCerrar);
    return () => dialogo.removeEventListener('close', alCerrar);
  }, [onCerrar]);

  return (
    <dialog
      className={clase ? `modal ${clase}` : 'modal'}
      ref={nodo}
      aria-label={etiqueta}
      aria-labelledby={nombradoPor}
      onClick={(evento) => {
        // El clic fuera del contenido solo alcanza al propio `<dialog>`.
        if (evento.target === nodo.current) onCerrar();
      }}
    >
      {children}
    </dialog>
  );
}

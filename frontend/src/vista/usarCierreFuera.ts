/* Cierre de un desplegable: un pulsador fuera de `dentro` y Escape lo cierran.
 * Menu, Selector, Explorador y el panel libre de NuevaFila lo repetían a mano. */
import { useEffect, useRef, type RefObject } from 'react';

interface Opciones {
  activo: boolean;
  /** Nodos que cuentan como «dentro»: pulsar en ellos no cierra. */
  dentro: RefObject<Node | null>[];
  alFuera: () => void;
  /** Por defecto Escape llama a `alFuera`; así se cambia (p. ej. cerrar primero un submenú). */
  alEscape?: (evento: KeyboardEvent) => void;
  /** Escucha en captura y consume Escape, para que no cierre también al modal que lo contiene. */
  capturaEscape?: boolean;
}

export function usarCierreFuera({ activo, dentro, alFuera, alEscape, capturaEscape }: Opciones) {
  // Los callbacks cambian en cada render; se leen por ref para no re-suscribir.
  const vivo = useRef({ dentro, alFuera, alEscape });
  vivo.current = { dentro, alFuera, alEscape };

  useEffect(() => {
    if (!activo) return;
    const fuera = (evento: PointerEvent) => {
      const destino = evento.target as Node;
      if (!vivo.current.dentro.some((ref) => ref.current?.contains(destino))) vivo.current.alFuera();
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      if (capturaEscape) {
        evento.preventDefault();
        evento.stopPropagation();
      }
      (vivo.current.alEscape ?? vivo.current.alFuera)(evento);
    };
    document.addEventListener('pointerdown', fuera);
    const donde = capturaEscape ? window : document;
    donde.addEventListener('keydown', tecla as EventListener, !!capturaEscape);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      donde.removeEventListener('keydown', tecla as EventListener, !!capturaEscape);
    };
  }, [activo, capturaEscape]);
}

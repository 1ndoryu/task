/* Iconos de la vista, en SVG dentro del propio componente: son tres trazos y no
 * justifican arrastrar una librería entera al front nuevo. `arrow-up-down` es el
 * mismo símbolo que el legacy pone junto al selector de orden. */

interface PropsIcono {
  /** Lado en píxeles; el trazo se ajusta al tamaño. */
  tam?: number;
}

export function IconoOrden({ tam = 12 }: PropsIcono) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 3v18M3 17l4 4 4-4M17 21V3M13 7l4-4 4 4" />
    </svg>
  );
}

/** Tres puntos verticales: abre el menú contextual de la fila. */
export function IconoMenu({ tam = 12 }: PropsIcono) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

/** Engranaje de los ajustes: la rueda dentada de siempre, en cuatro trazos. */
export function IconoAjustes({ tam = 12 }: PropsIcono) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

/** Aspa del botón de cerrar del modal. */
export function IconoCerrar({ tam = 12 }: PropsIcono) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

/** Ojo abierto si la lista se lee, tachado si el modo privacidad la difumina. */
export function IconoPrivacidad({ tam = 12, oculto }: PropsIcono & { oculto: boolean }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {oculto && <path d="M3 3l18 18" />}
    </svg>
  );
}

/** Carpeta: el grupo al que va lo que se está dando de alta. */
export function IconoCarpeta({ tam = 12 }: PropsIcono) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17.5z" />
    </svg>
  );
}

/** Tarea: una casilla marcada. Dice qué se está dando de alta, junto al
 * campo que lo escribe. */
export function IconoTarea({ tam = 12 }: PropsIcono) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 12.5l4.5 4.5L20 5.5" />
    </svg>
  );
}

/** Hábito: flecha circular, la misma que la frecuencia. Es lo que lo
 * distingue de una tarea: vuelve. */
export function IconoHabito({ tam = 12 }: PropsIcono) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

/** Flecha circular: la frecuencia con la que vuelve un hábito. */
export function IconoFrecuencia({ tam = 12 }: PropsIcono) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

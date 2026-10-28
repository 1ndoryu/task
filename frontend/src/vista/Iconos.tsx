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

/** Hoja con un trazo dentro: una caja de nota, no de tareas. */
export function IconoNota({ tam = 12 }: PropsIcono) {
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
      <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M8 9h8M8 13h8M8 17h4" />
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

/** Luna si la vista está clara (pulsarla la apaga), sol si ya está oscura. */
export function IconoTema({ tam = 12, oscuro }: PropsIcono & { oscuro: boolean }) {
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
      {oscuro ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </>
      ) : (
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
      )}
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

/** Calendario con un punto: con qué frecuencia vuelve un hábito. No es la
 *  flecha circular del hábito —eran el mismo dibujo y no se distinguían—: la
 *  frecuencia es cuándo, y eso se lee mejor como calendario. */
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
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M12 14.5v1.5M12 18.5v.01" />
    </svg>
  );
}

/* --- Controles de la ventana de escritorio (ver `BarraVentana`). Trazo de 1px
 * como los de Windows: a 10px, el de 2 de los demás iconos los engorda. --- */

/** Guion de minimizar. */
export function IconoMinimizar({ tam = 10 }: PropsIcono) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" focusable="false">
      <path d="M1.5 5.5h7" />
    </svg>
  );
}

/** Cuadrado de maximizar, con su hueco al pie derecho. */
export function IconoMaximizar({ tam = 10 }: PropsIcono) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="7" height="7" />
    </svg>
  );
}

/** Cebo hacia abajo: la fila tiene hijos y ahora se ven. Rota con `abierta`. */
export function IconoDesplegar({ tam = 10 }: PropsIcono) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M2.5 4l2.5 2.5L7.5 4" />
    </svg>
  );
}

/** Cebo hacia la derecha: los hijos están plegados. */
export function IconoPlegar({ tam = 10 }: PropsIcono) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 2.5l2.5 2.5L4 7.5" />
    </svg>
  );
}

/** Dos cuadrados superpuestos: la ventana vuelve a su tamaño. */
export function IconoRestaurar({ tam = 10 }: PropsIcono) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" focusable="false">
      <rect x="1.5" y="3" width="5.5" height="5.5" />
      <path d="M3.5 1.5h5v5" />
    </svg>
  );
}

/** Cajas: cuatro baldosas, el explorador de todas las cajas. */
export function IconoCajas({ tam = 12 }: PropsIcono) {
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
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

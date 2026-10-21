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

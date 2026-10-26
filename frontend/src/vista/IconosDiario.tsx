/* Iconos de la caja «Diario»: el libro de la pestaña y los chevrones de día.
 * Van aparte de `Iconos.tsx` para que ese archivo no pase del límite de líneas. */

interface PropsIcono {
  tam?: number;
}

/** Libro abierto: la caja del diario, distinta de la hoja de nota. */
export function IconoDiario({ tam = 12 }: PropsIcono) {
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
      <path d="M12 6c-2-1.5-4.5-2-8-2v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V4c-3.5 0-6 .5-8 2z" />
      <path d="M12 6v14" />
    </svg>
  );
}

/** Chevrón hacia atrás: el día anterior. */
export function IconoAnterior({ tam = 12 }: PropsIcono) {
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
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** Chevrón hacia delante: el día siguiente. */
export function IconoSiguiente({ tam = 12 }: PropsIcono) {
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
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

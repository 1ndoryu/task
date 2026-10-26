/* Botón de la cabecera que pliega una caja hasta su título y la vuelve a abrir.
 * Es el mismo en todas las cajas: solo cambia el icono según esté plegada. */

interface Props {
  minimizada: boolean;
  onAlternar: () => void;
}

/** Chevrón: hacia arriba recoge la caja, hacia abajo la despliega. */
function Chevron({ abajo }: { abajo: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={abajo ? 'M5 9l7 7 7-7' : 'M5 15l7-7 7 7'} />
    </svg>
  );
}

export function BotonMinimizar({ minimizada, onAlternar }: Props) {
  const texto = minimizada ? 'Maximizar caja' : 'Minimizar caja';
  return (
    <button
      type="button"
      className="barra__boton barra__icono"
      aria-label={texto}
      title={texto}
      aria-expanded={!minimizada}
      onClick={onAlternar}
    >
      <Chevron abajo={minimizada} />
    </button>
  );
}

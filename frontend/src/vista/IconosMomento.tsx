/* Icono de «Cuándo es mejor hacer» dentro del círculo de completar: amanecer para
 * temprano, sol para tarde y luna para noche. Son los de Lucide (licencia ISC),
 * copiados en trazos como el resto de `Iconos.tsx`, sin añadir la librería. */
import type { Momento } from '../logica/momentos';

interface Props {
  momento: Momento;
  /** Lado en píxeles; el trazo se ajusta al tamaño. */
  tam?: number;
}

export function IconoMomento({ momento, tam = 12 }: Props) {
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
      {momento === 'temprano' && (
        <>
          <path d="M12 2v8M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M2 22h20M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0" />
        </>
      )}
      {momento === 'tarde' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
        </>
      )}
      {momento === 'noche' && <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />}
    </svg>
  );
}

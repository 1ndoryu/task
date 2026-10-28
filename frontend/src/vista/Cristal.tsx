/* Superficie de cristal de la barra y del panel de Cajas. `CRISTAL_ACTIVO` la enciende
 * o la apaga para toda la app: encendida, pinta el cristal líquido con `vidrio`;
 * apagada, la misma caja pero plana (fondo y borde del tema), sin efectos. */
import type { ReactNode } from 'react';
import LiquidGlass from 'liquid-glass-react';
import type { Vidrio } from './ConfigVidrio';

/* Cambiar a `true` para volver al cristal líquido. */
export const CRISTAL_ACTIVO = false;

interface Props {
  className: string;
  vidrio: Vidrio;
  /** Retoques propios de una superficie, sobre los parámetros de `vidrio`. */
  ajustes?: Partial<Vidrio>;
  children: ReactNode;
}

export function Cristal({ className, vidrio, ajustes, children }: Props) {
  // La clase `--plano` la recogen las reglas de cajas.css; sin cristal, el fondo es del tema.
  if (!CRISTAL_ACTIVO) return <div className={`${className} ${className}--plano`}>{children}</div>;
  return (
    <LiquidGlass className={className} {...vidrio} {...ajustes}>
      {children}
    </LiquidGlass>
  );
}

/* Menú contextual de una caja del carril. Vive aparte porque se pinta igual en
 * las dos formas de la vista —con las cajas en fila y con la caja única— y en
 * las dos nace del clic derecho sobre el panel, no de un botón propio. */
import type { Panel } from '../logica/paneles';
import { Menu } from './Menu';
import { opcionesPanel } from './menuPanel';

interface Props {
  /** Panel y punto pulsado; `null` no pinta nada. */
  menuPanel: { panel: Panel; x: number; y: number } | null;
  onCerrar: () => void;
  onAccion: (panel: Panel, accion: string) => void;
}

export function MenuCaja({ menuPanel, onCerrar, onAccion }: Props) {
  if (!menuPanel) return null;
  return (
    <Menu
      etiqueta={null}
      titulo={`Acciones de «${menuPanel.panel.etiqueta}»`}
      items={opcionesPanel(menuPanel.panel)}
      abierto
      onAbierto={(abierto) => {
        if (!abierto) onCerrar();
      }}
      enPunto={menuPanel}
      onElegir={(accion) => {
        onAccion(menuPanel.panel, accion);
        onCerrar();
      }}
    />
  );
}

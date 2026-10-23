/* Estado de la vista que no es de los datos: qué ventana está abierta y sobre
 * qué. Vive fuera de `Lista` para que la vista se quede en el reparto de
 * paneles; las acciones de la lista entran por parámetro, así el hook no sabe
 * de la API ni de los datos, solo de lo que hay que abrir. */
import { createElement, useState, type ReactNode } from 'react';
import type { Panel } from '../logica/paneles';
import type { Borrado } from './ConfirmarPanel';
import { opcionesPanel } from './menuPanel';
import { TituloEditable } from './TituloEditable';

interface Entrada {
  renombrarPanel: (panel: Panel, titulo: string) => void;
  cambiarGrupo: (grupo: string) => void;
  archivarNota: (panel: string) => void;
  archivarGrupo: (nombre: string) => void;
}

/** Punto de la pantalla donde nació un clic derecho. */
type Punto = { x: number; y: number };

/** El título de un panel, ya listo para pintar; la clase la elige quien pinta
 *  (la caja o la pestaña) y el gesto, también. */
export type TituloPanel = (panel: Panel, clase: string, abrir?: 'clic' | 'doble') => ReactNode;

/** El clic derecho de un panel, o nada si es de sistema y no tiene menú. */
export type ContextoPanel = (panel: Panel) => ((punto: Punto) => void) | undefined;

export function usarVista({ renombrarPanel, cambiarGrupo, archivarNota, archivarGrupo }: Entrada) {
  // Menú abierto con clic derecho, con la clave de la fila y el punto pulsado.
  // Se guarda aquí porque el clic derecho nace fuera del propio menú.
  const [menuAbierto, setMenuAbierto] = useState<{ clave: string; x: number; y: number } | null>(null);
  // Panel de grupos: alta, renombrado y borrado de los nombres de grupo.
  const [gruposAbiertos, setGruposAbiertos] = useState(false);
  // Nota recién creada: el carril la centra en cuanto existe en la lista.
  const [notaNueva, setNotaNueva] = useState<string | null>(null);
  // Panel que se está renombrando desde el menú, con su número de petición: el
  // título abre el campo con cada uno, así pedirlo dos veces funciona. Se
  // limpia al guardar, para que no vuelva a abrirse solo.
  const [renombrando, setRenombrando] = useState<{ id: string; vez: number } | null>(null);
  // Panel que espera confirmación de borrado, con las filas que se lleva.
  const [borrando, setBorrando] = useState<Borrado | null>(null);
  // Menú de una caja abierto con clic derecho: el panel y el punto pulsado.
  const [menuPanel, setMenuPanel] = useState<{ panel: Panel; x: number; y: number } | null>(null);

  /** Abre el menú de un panel en el punto pulsado. */
  const abrirMenuPanel = (panel: Panel, punto: Punto) => {
    setMenuPanel({ panel, ...punto });
  };

  /** El clic derecho de un panel, o nada: los de sistema no tienen menú y su
   *  caja no debe capturarlo (el navegador hace lo suyo). */
  const contextoDe = (panel: Panel) =>
    opcionesPanel(panel).length > 0 ? (punto: Punto) => abrirMenuPanel(panel, punto) : undefined;

  /** El título de un panel: editable salvo en los de sistema («Tareas» y
   *  «Completados»), cuyo nombre no significa nada que se pueda cambiar.
   *  `createElement` porque el módulo es `.ts` y no admite JSX. */
  const titulo = (panel: Panel, clase: string, abrir: 'clic' | 'doble' = 'clic') =>
    createElement(TituloEditable, {
      abrir,
      valor: panel.etiqueta,
      editable: !panel.fija,
      onRenombrar: (nombre: string) => {
        renombrarPanel(panel, nombre);
        setRenombrando(null);
      },
      clase,
      etiqueta: `Renombrar «${panel.etiqueta}»`,
      forzar: renombrando?.id === panel.id ? renombrando.vez : 0,
    });

  /** Lo que el menú contextual de un panel puede pedir. `cuenta` entra por
   *  parámetro: son los datos de la lista y el hook no los guarda. */
  const accionPanel = (panel: Panel, accion: string, cuenta: Record<string, number>) => {
    if (accion === 'renombrar') {
      // Se abre el campo del título donde esté pintado el panel: es la misma
      // edición de siempre, solo que pedida desde el menú.
      cambiarGrupo(panel.id);
      setRenombrando((previa) => ({ id: panel.id, vez: (previa?.vez ?? 0) + 1 }));
      return;
    }
    if (accion === 'archivar') {
      if (panel.tipo === 'nota') archivarNota(panel.id);
      else archivarGrupo(panel.id);
      return;
    }
    if (accion === 'borrar') {
      setBorrando({ panel, filas: panel.tipo === 'nota' ? 0 : (cuenta[panel.id] ?? 0) });
    }
  };

  return {
    menuAbierto,
    setMenuAbierto,
    gruposAbiertos,
    setGruposAbiertos,
    notaNueva,
    setNotaNueva,
    borrando,
    setBorrando,
    menuPanel,
    setMenuPanel,
    abrirMenuPanel,
    contextoDe,
    titulo,
    accionPanel,
  };
}

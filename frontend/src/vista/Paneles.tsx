/* Lo que la vista sabe de un tipo de panel sin mirar dentro de la caja: su
 * icono y las acciones que solo él tiene. Añadir un tipo nuevo se nota aquí y
 * en `Lista`; el resto de la vista sigue igual.
 *
 * Las acciones se devuelven como datos y no como nodos para que sea la vista
 * la que decida el orden (orden, acciones propias, borrar). */
import type { ReactNode } from 'react';
import type { Panel } from '../logica/paneles';
import { IconoHabito, IconoNota, IconoTarea } from './Iconos';
import { IconoDiario } from './IconosDiario';
import { IconoAplazar } from './MenuOpciones';

/** El icono de la pestaña, para distinguir un tipo de otro sin leer. */
export function iconoDePanel(panel: Panel): ReactNode {
  if (panel.tipo === 'nota') return <IconoNota tam={10} />;
  if (panel.tipo === 'diario') return <IconoDiario tam={10} />;
  if (panel.tipo === 'habitos') return <IconoHabito tam={10} />;
  if (panel.tipo === 'aplazados') return <IconoAplazar />;
  return <IconoTarea tam={10} />;
}

/** Un panel de nota se borra; uno de tareas, no: su contenido no es suyo. */
export const seBorra = (panel: Panel): boolean => panel.tipo === 'nota';


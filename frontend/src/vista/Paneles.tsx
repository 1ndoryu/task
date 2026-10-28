/* Lo que la vista sabe de un tipo de panel sin mirar dentro de la caja: su
 * icono y las acciones que solo él tiene. Añadir un tipo nuevo se nota aquí y
 * en `Lista`; el resto de la vista sigue igual.
 *
 * Las acciones se devuelven como datos y no como nodos para que sea la vista
 * la que decida el orden (orden, acciones propias, borrar). */
import type { ReactNode } from 'react';
import type { Panel, TipoPanel } from '../logica/paneles';
import { IconoHabito, IconoNota, IconoTarea } from './Iconos';
import { IconoDiario } from './IconosDiario';
import { IconoAplazar } from './MenuOpciones';

/** Lo propio de cada tipo de panel; uno nuevo se añade aquí y los consumidores
 * (icono, borrado) no cambian. Los tipos de lista comparten el valor por defecto. */
const TIPOS: Partial<Record<TipoPanel, { icono: () => ReactNode; seBorra?: boolean }>> = {
  nota: { icono: () => <IconoNota tam={10} />, seBorra: true },
  diario: { icono: () => <IconoDiario tam={10} /> },
  habitos: { icono: () => <IconoHabito tam={10} /> },
  aplazados: { icono: () => <IconoAplazar /> },
};

/** El icono de la pestaña, para distinguir un tipo de otro sin leer. */
export const iconoDePanel = (panel: Panel): ReactNode => TIPOS[panel.tipo]?.icono() ?? <IconoTarea tam={10} />;

/** Un panel de nota se borra; uno de tareas, no: su contenido no es suyo. */
export const seBorra = (panel: Panel): boolean => TIPOS[panel.tipo]?.seBorra ?? false;

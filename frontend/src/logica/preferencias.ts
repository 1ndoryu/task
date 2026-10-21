/* Preferencias de la vista (orden y filtro), recordadas en `localStorage`.
 * Se guardan aparte de los datos: aquí no hay contratos del backend, solo cómo
 * mira la usuaria su lista. */
const CLAVE = 'tareas-nuevo:v1:vista';

export interface Preferencias {
  orden: string;
  filtro: string;
}

const POR_DEFECTO: Preferencias = { orden: 'inteligente', filtro: 'sueltas' };

export function leerPreferencias(): Preferencias {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return { ...POR_DEFECTO };
    const guardado = JSON.parse(crudo) as Partial<Preferencias> & { ordenTareas?: string };
    // `ordenTareas` es la clave de la versión con dos selectores: se migra.
    return { ...POR_DEFECTO, ...guardado, orden: guardado.orden ?? guardado.ordenTareas ?? POR_DEFECTO.orden };
  } catch {
    return { ...POR_DEFECTO };
  }
}

export function guardarPreferencias(cambios: Partial<Preferencias>): void {
  const actuales = leerPreferencias();
  localStorage.setItem(CLAVE, JSON.stringify({ ...actuales, ...cambios }));
}

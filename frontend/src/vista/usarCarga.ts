/* Carga única de la lista: asegura la sesión, lee el dashboard y le fusiona lo
 * que quedó pendiente de escribir de esa cuenta. Vive aparte de `usarLista`
 * porque no comparte nada con las mutaciones: entra una vez y no vuelve.
 * [por que] `abrirCuenta` fija la cuenta vigente en `usarEscritura`; llamarla
 * aquí, una sola vez y antes de cualquier escritura, es lo que hace que los
 * pendientes se guarden en el sitio correcto. */
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { leerDashboard } from '../logica/dashboard';
import { asegurarSesionLocal } from '../logica/sesion';
import type { Dashboard, Habito, Tarea } from '../logica/tipos';
import type { Estado } from './tiposLista';

export function usarCarga(
  abrirCuenta: (correo: string, servidor: Dashboard) => { tareas: Tarea[]; habitos: Habito[] },
  /** Se llama una vez, ya con sesión y datos: entonces el respaldo del servidor
   *  se puede leer y sembrar sin que nadie le escriba antes de tiempo. */
  alCargar?: () => void,
): [Estado, Dispatch<SetStateAction<Estado>>] {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  // Las dos funciones nacen en el render y el efecto es de una sola vez: el ref
  // las deja fuera de las dependencias sin quedarse con una copia vieja.
  const abrirRef = useRef(abrirCuenta);
  abrirRef.current = abrirCuenta;
  const alCargarRef = useRef(alCargar);
  alCargarRef.current = alCargar;

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        const correo = (await asegurarSesionLocal()) ?? '';
        const datos = await leerDashboard();
        alCargarRef.current?.();
        if (!vigente) return;
        // Lo pendiente se cruza con el servidor dentro de `abrirCuenta`: aquí solo se pinta.
        const filas = abrirRef.current(correo, datos);
        setEstado({ fase: 'listo', datos: { ...datos, ...filas } });
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudo leer el dashboard';
        if (vigente) setEstado({ fase: 'error', mensaje });
      }
    }
    void cargar();
    return () => {
      vigente = false;
    };
    // La carga es única: depende de la sesión que se asegura dentro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [estado, setEstado];
}

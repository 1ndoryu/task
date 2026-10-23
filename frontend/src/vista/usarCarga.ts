/* Carga única de la lista: asegura la sesión, lee el dashboard y le fusiona lo
 * que quedó pendiente de escribir de esa cuenta. Vive aparte de `usarLista`
 * porque no comparte nada con las mutaciones: entra una vez y no vuelve.
 * [por que] `abrirCuenta` fija la cuenta vigente en `usarEscritura`; llamarla
 * aquí, una sola vez y antes de cualquier escritura, es lo que hace que los
 * pendientes se guarden en el sitio correcto. */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { leerDashboard } from '../logica/dashboard';
import { asegurarSesionLocal } from '../logica/sesion';
import { fusionarPendientes, type Pendientes } from '../logica/store';
import type { Estado } from './tiposLista';

export function usarCarga(abrirCuenta: (correo: string) => Pendientes): [Estado, Dispatch<SetStateAction<Estado>>] {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        const correo = (await asegurarSesionLocal()) ?? '';
        const datos = await leerDashboard();
        if (!vigente) return;
        const guardados = abrirCuenta(correo);
        const fusionado = fusionarPendientes(datos.tareas, datos.habitos, guardados);
        setEstado({ fase: 'listo', datos: { ...datos, ...fusionado } });
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

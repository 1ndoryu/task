/* Estado de la vista: carga la sesión local y el dashboard una vez.
 * La lógica vive en `logica/`; aquí solo se guarda el resultado para pintarlo. */
import { useEffect, useState } from 'react';
import { leerDashboard } from '../logica/dashboard';
import { asegurarSesionLocal } from '../logica/sesion';
import type { Dashboard } from '../logica/tipos';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; datos: Dashboard }
  | { fase: 'error'; mensaje: string };

export function usarDashboard(): Estado {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        await asegurarSesionLocal();
        const datos = await leerDashboard();
        if (vigente) setEstado({ fase: 'listo', datos });
      } catch (error) {
        // Se muestra el motivo tal cual: no se ocultan fallos de sesión ni de red.
        const mensaje = error instanceof Error ? error.message : 'No se pudo leer el dashboard';
        if (vigente) setEstado({ fase: 'error', mensaje });
      }
    }
    void cargar();
    return () => {
      vigente = false;
    };
  }, []);

  return estado;
}

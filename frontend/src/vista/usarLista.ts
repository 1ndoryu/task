/* Estado de la lista: carga, orden, filtro y la mutación de completar.
 * La lógica de datos vive en `logica/`; aquí solo se guarda y se encadena. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { leerDashboard } from '../logica/dashboard';
import { fechaLocal } from '../logica/fechas';
import { codificarFiltro, decodificarFiltro, type Filtro } from '../logica/filtros';
import type { ModoOrden } from '../logica/orden';
import { guardarPreferencias, leerPreferencias } from '../logica/preferencias';
import { seleccionar, type Vista } from '../logica/seleccion';
import { asegurarSesionLocal } from '../logica/sesion';
import { fusionarPendientes, guardarPendientes, leerPendientes } from '../logica/store';
import { alternarCompletado, guardarTarea } from '../logica/tareas';
import type { Dashboard, Tarea } from '../logica/tipos';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; datos: Dashboard }
  | { fase: 'error'; mensaje: string };

export interface Lista {
  estado: Estado;
  filtro: Filtro;
  orden: ModoOrden;
  vista: Vista | null;
  hoy: string;
  cambiarFiltro: (filtro: Filtro) => void;
  cambiarOrden: (modo: ModoOrden) => void;
  completar: (tarea: Tarea) => void;
}

export function usarLista(): Lista {
  const preferencias = useMemo(leerPreferencias, []);
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [filtro, setFiltro] = useState<Filtro>(() => decodificarFiltro(preferencias.filtro));
  const [orden, setOrden] = useState(preferencias.orden as ModoOrden);
  const [hoy] = useState(() => fechaLocal());
  // El correo separa los cambios de cada cuenta; llega con la carga.
  const correoRef = useRef('');
  // Cambios sin confirmar: solo se mutan en el manejador, nunca se leen del estado.
  const pendientesRef = useRef<Record<number, Tarea>>({});

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        correoRef.current = (await asegurarSesionLocal()) ?? '';
        const datos = await leerDashboard();
        if (!vigente) return;
        const guardados = leerPendientes(correoRef.current);
        pendientesRef.current = guardados.tareas;
        setEstado({
          fase: 'listo',
          datos: { ...datos, tareas: fusionarPendientes(datos.tareas, guardados) },
        });
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudo leer el dashboard';
        if (vigente) setEstado({ fase: 'error', mensaje });
      }
    }
    void cargar();
    return () => {
      vigente = false;
    };
  }, []);

  const completar = useCallback(
    (tarea: Tarea) => {
      const actualizada = alternarCompletado(tarea, hoy);
      // Optimista: la fila se tacha antes de que el servidor conteste.
      setEstado((previo) =>
        previo.fase === 'listo'
          ? {
              fase: 'listo',
              datos: {
                ...previo.datos,
                tareas: previo.datos.tareas.map((t) => (t.id === tarea.id ? actualizada : t)),
              },
            }
          : previo,
      );
      const anotar = (tareas: Record<number, Tarea>) => {
        pendientesRef.current = tareas;
        guardarPendientes(correoRef.current, { tareas });
      };
      anotar({ ...pendientesRef.current, [tarea.id]: actualizada });
      void guardarTarea(actualizada)
        .then(() => {
          const resto = { ...pendientesRef.current };
          delete resto[tarea.id];
          anotar(resto);
        })
        .catch(() => {
          // Queda pendiente en el navegador y se reenvía al recargar la lista.
        });
    },
    [hoy],
  );

  const vista = useMemo(
    () => (estado.fase === 'listo' ? seleccionar(estado.datos, { filtro, orden, hoy }) : null),
    [estado, filtro, orden, hoy],
  );

  return {
    estado,
    filtro,
    orden,
    vista,
    hoy,
    cambiarFiltro: (nuevo) => {
      setFiltro(nuevo);
      guardarPreferencias({ filtro: codificarFiltro(nuevo) });
    },
    cambiarOrden: (modo) => {
      setOrden(modo);
      guardarPreferencias({ orden: modo });
    },
    completar,
  };
}

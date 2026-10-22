/* Única vía de escritura de una fila. Aplica el cambio en memoria al momento,
 * lo anota como pendiente y lo manda; si el envío falla, la anotación se queda
 * y se reenvía al recargar la lista.
 * Vive aparte de `usarLista` porque leer, ordenar y pintar no necesitan saber
 * cómo se escribe: aquí solo está lo que toca los datos y el servidor. */
import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { borrarHabito, guardarHabito } from '../logica/habitos';
import { guardarPendientes, leerPendientes, type Pendientes } from '../logica/store';
import { borrarTarea, guardarTarea } from '../logica/tareas';
import type { Dashboard, Habito, Tarea } from '../logica/tipos';
import type { Estado } from './tiposLista';

/** Escritor de una fila: cambia el dato y lo manda. */
export type Escribir<T> = (id: number, cambiar: (dato: T) => T) => Promise<void>;

export interface Escritura {
  escribirTarea: Escribir<Tarea>;
  escribirHabito: Escribir<Habito>;
  /** Borrado optimista: desaparece y, si el servidor falla, vuelve al recargar. */
  quitarTarea: (id: number) => void;
  quitarHabito: (id: number) => void;
  /** Anota cambios sin confirmar; lo usan también las altas. */
  anotar: (cambios: Partial<Pendientes>) => void;
  /** Lo pendiente de una cuenta, ya fijada como la vigente, para fusionarlo. */
  abrirCuenta: (correo: string) => Pendientes;
}

export function usarEscritura(
  estado: Estado,
  setEstado: Dispatch<SetStateAction<Estado>>,
  datosRef: MutableRefObject<Dashboard>,
  pendientesRef: MutableRefObject<Pendientes>,
): Escritura {
  // Última foto de los datos, para que una acción tarde no trabaje sobre una
  // copia vieja: el estado de React no se lee dentro de los manejadores.
  if (estado.fase === 'listo') datosRef.current = estado.datos;

  // El correo separa los cambios de cada cuenta; llega con la carga.
  const correoRef = useRef('');
  // Cambios sin confirmar: solo se mutan en el manejador, nunca se leen del estado.
  // Compartido con `usarLista`, porque las altas y las salidas anotan igual.

  const anotar = useCallback(
    (cambios: Partial<Pendientes>) => {
      pendientesRef.current = { ...pendientesRef.current, ...cambios };
      guardarPendientes(correoRef.current, pendientesRef.current);
    },
    [pendientesRef],
  );

  const abrirCuenta = useCallback(
    (correo: string): Pendientes => {
      correoRef.current = correo;
      pendientesRef.current = leerPendientes(correo);
      return pendientesRef.current;
    },
    [pendientesRef],
  );

  const escribirTarea = useCallback(
    async (id: number, cambiar: (tarea: Tarea) => Tarea) => {
      const actual = datosRef.current.tareas.find((t) => t.id === id);
      if (!actual) return;
      const actualizada = cambiar(actual);
      setEstado((previo) =>
        previo.fase === 'listo'
          ? {
              fase: 'listo',
              datos: { ...previo.datos, tareas: previo.datos.tareas.map((t) => (t.id === id ? actualizada : t)) },
            }
          : previo,
      );
      anotar({ tareas: { ...pendientesRef.current.tareas, [id]: actualizada } });
      try {
        await guardarTarea(actualizada);
        const resto = { ...pendientesRef.current.tareas };
        delete resto[id];
        anotar({ tareas: resto });
      } catch {
        // Queda pendiente en el navegador y se reenvía al recargar la lista.
      }
    },
    [anotar, setEstado],
  );

  const escribirHabito = useCallback(
    async (id: number, cambiar: (habito: Habito) => Habito) => {
      const actual = datosRef.current.habitos.find((h) => h.id === id);
      if (!actual) return;
      const actualizado = cambiar(actual);
      setEstado((previo) =>
        previo.fase === 'listo'
          ? {
              fase: 'listo',
              datos: { ...previo.datos, habitos: previo.datos.habitos.map((h) => (h.id === id ? actualizado : h)) },
            }
          : previo,
      );
      anotar({ habitos: { ...pendientesRef.current.habitos, [id]: actualizado } });
      try {
        await guardarHabito(actualizado);
        const resto = { ...pendientesRef.current.habitos };
        delete resto[id];
        anotar({ habitos: resto });
      } catch {
        // Queda pendiente en el navegador y se reenvía al recargar la lista.
      }
    },
    [anotar, setEstado],
  );

  /** Borrado optimista. La copia de pendientes no debe resucitar la fila. */
  const quitarTarea = useCallback(
    (id: number) => {
      setEstado((previo) =>
        previo.fase === 'listo'
          ? { fase: 'listo', datos: { ...previo.datos, tareas: previo.datos.tareas.filter((t) => t.id !== id) } }
          : previo,
      );
      const resto = { ...pendientesRef.current.tareas };
      delete resto[id];
      anotar({ tareas: resto });
      void borrarTarea(id).catch(() => {
        /* Queda en el servidor: la próxima carga la trae otra vez. */
      });
    },
    [anotar, setEstado],
  );

  const quitarHabito = useCallback(
    (id: number) => {
      setEstado((previo) =>
        previo.fase === 'listo'
          ? { fase: 'listo', datos: { ...previo.datos, habitos: previo.datos.habitos.filter((h) => h.id !== id) } }
          : previo,
      );
      const resto = { ...pendientesRef.current.habitos };
      delete resto[id];
      anotar({ habitos: resto });
      void borrarHabito(id).catch(() => {
        /* Queda en el servidor: la próxima carga la trae otra vez. */
      });
    },
    [anotar, setEstado],
  );

  return { escribirTarea, escribirHabito, quitarTarea, quitarHabito, anotar, abrirCuenta };
}

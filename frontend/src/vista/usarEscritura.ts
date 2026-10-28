/* Única vía de escritura de una fila. Aplica el cambio en memoria al momento y
 * lo manda por la cola de su fila (`colaEscritura.ts`): una a una, cada una con
 * la versión que dejó la anterior. Lo que no tiene respuesta queda anotado como
 * pendiente, con la versión sobre la que se hizo, y al cargar se reenvía solo si
 * el servidor sigue en esa versión (`fusionarFilas`).
 * Vive aparte de `usarLista` porque leer, ordenar y pintar no necesitan saber
 * cómo se escribe: aquí solo está lo que toca los datos y el servidor. */
import { useCallback, useMemo, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { leerDashboard } from '../logica/dashboard';
import { borrarHabito, guardarHabito } from '../logica/habitos';
import { fusionarFilas, guardarPendientes, leerPendientes, type Pendiente, type Pendientes } from '../logica/store';
import { borrarTarea, guardarTarea } from '../logica/tareas';
import type { Dashboard, Habito, Tarea } from '../logica/tipos';
import {
  cancelarCola,
  colaDe,
  encolarCambio,
  type Adaptador,
  type Cambio,
  type Cola,
  type Versionada,
} from './colaEscritura';
import type { Estado } from './tiposLista';

/** Escritor de una fila: cambia el dato y lo manda. */
export type Escribir<T> = (id: number, cambiar: (dato: T) => T) => Promise<void>;

export interface Escritura {
  escribirTarea: Escribir<Tarea>;
  escribirHabito: Escribir<Habito>;
  /** Borrado optimista: desaparece y, si el servidor falla, vuelve al recargar. */
  quitarTarea: (id: number) => void;
  quitarHabito: (id: number) => void;
  /** Fija la cuenta, cruza sus pendientes con el dashboard que llega, reenvía los vigentes y devuelve las filas a mostrar. */
  abrirCuenta: (correo: string, servidor: Dashboard) => { tareas: Tarea[]; habitos: Habito[] };
}

/** La lista con la fila cambiada; sin `dato`, la fila sale de la lista. */
function enLista<T extends Versionada>(lista: T[], id: number, dato: T | undefined): T[] {
  return dato ? lista.map((fila) => (fila.id === id ? dato : fila)) : lista.filter((fila) => fila.id !== id);
}

/** Reenvía cada copia vigente por su cola, con la versión con la que se guardó. */
function reenviar<T extends Versionada>(mapa: Map<number, Cola<T>>, vigentes: Record<number, Pendiente<T>>, ad: Adaptador<T>): void {
  for (const [clave, { copia }] of Object.entries(vigentes)) {
    const id = Number(clave);
    // Si el servidor cambió justo después de comprobarlo, la copia cede ante la fila nueva.
    const mantener: Cambio<T> = (dato) => (dato.updatedAt === copia.updatedAt ? copia : dato);
    void encolarCambio(colaDe(mapa, id), id, copia, mantener, ad);
  }
}

export function usarEscritura(
  estado: Estado,
  setEstado: Dispatch<SetStateAction<Estado>>,
  datosRef: MutableRefObject<Dashboard>,
  pendientesRef: MutableRefObject<Pendientes>,
  avisar: (texto: string) => void,
): Escritura {
  // Última foto de los datos, para que una acción tarde no trabaje sobre una
  // copia vieja: el estado de React no se lee dentro de los manejadores.
  if (estado.fase === 'listo') datosRef.current = estado.datos;

  // El correo separa los cambios de cada cuenta; llega con la carga.
  const correoRef = useRef('');
  // Colas de escritura por fila: cada fila manda sus cambios de uno en uno.
  const colasTareas = useRef(new Map<number, Cola<Tarea>>());
  const colasHabitos = useRef(new Map<number, Cola<Habito>>());

  const anotar = useCallback(
    (cambios: Partial<Pendientes>) => {
      pendientesRef.current = { ...pendientesRef.current, ...cambios };
      guardarPendientes(correoRef.current, pendientesRef.current);
    },
    [pendientesRef],
  );

  // Pintar y anotar pendientes: la fila vigente va al estado y, si queda algo sin
  // respuesta, a la copia de pendientes (sin ella, un recargo la perdería). La
  // versión de la copia es la de su base: los cambios conservan el `updatedAt`.
  const adaptadorTareas = useMemo<Adaptador<Tarea>>(
    () => ({
      enviar: guardarTarea,
      releer: async (id) => (await leerDashboard()).tareas.find((t) => t.id === id),
      mostrar: (id, dato, pendiente) => {
        setEstado((previo) =>
          previo.fase === 'listo' ? { fase: 'listo', datos: { ...previo.datos, tareas: enLista(previo.datos.tareas, id, dato) } } : previo,
        );
        const resto = { ...pendientesRef.current.tareas };
        if (dato && pendiente) resto[id] = { copia: dato, baseUpdatedAt: dato.updatedAt };
        else delete resto[id];
        anotar({ tareas: resto });
      },
      avisar,
    }),
    [anotar, avisar, pendientesRef, setEstado],
  );

  const adaptadorHabitos = useMemo<Adaptador<Habito>>(
    () => ({
      enviar: guardarHabito,
      releer: async (id) => (await leerDashboard()).habitos.find((h) => h.id === id),
      mostrar: (id, dato, pendiente) => {
        setEstado((previo) =>
          previo.fase === 'listo' ? { fase: 'listo', datos: { ...previo.datos, habitos: enLista(previo.datos.habitos, id, dato) } } : previo,
        );
        const resto = { ...pendientesRef.current.habitos };
        if (dato && pendiente) resto[id] = { copia: dato, baseUpdatedAt: dato.updatedAt };
        else delete resto[id];
        anotar({ habitos: resto });
      },
      avisar,
    }),
    [anotar, avisar, pendientesRef, setEstado],
  );

  /** Al cargar: solo las copias de la versión vigente sobreviven; el resto se avisa y se descarta. */
  const abrirCuenta = useCallback(
    (correo: string, servidor: Dashboard) => {
      correoRef.current = correo;
      const guardados = leerPendientes(correo);
      const tareas = fusionarFilas(servidor.tareas, guardados.tareas);
      const habitos = fusionarFilas(servidor.habitos, guardados.habitos);
      pendientesRef.current = { tareas: tareas.vigentes, habitos: habitos.vigentes };
      guardarPendientes(correo, pendientesRef.current);
      const descartados = tareas.descartados + habitos.descartados;
      if (descartados === 1) avisar('Un cambio pendiente no se guardó: la fila cambió en otro sitio.');
      else if (descartados > 1) avisar(`${descartados} cambios pendientes no se guardaron: las filas cambiaron en otro sitio.`);
      reenviar(colasTareas.current, tareas.vigentes, adaptadorTareas);
      reenviar(colasHabitos.current, habitos.vigentes, adaptadorHabitos);
      return { tareas: tareas.filas, habitos: habitos.filas };
    },
    [adaptadorHabitos, adaptadorTareas, avisar, pendientesRef],
  );

  const escribirTarea = useCallback(
    (id: number, cambiar: Cambio<Tarea>) => {
      const actual = datosRef.current.tareas.find((t) => t.id === id);
      if (!actual) return Promise.resolve();
      return encolarCambio(colaDe(colasTareas.current, id), id, actual, cambiar, adaptadorTareas);
    },
    [adaptadorTareas, datosRef],
  );

  const escribirHabito = useCallback(
    (id: number, cambiar: Cambio<Habito>) => {
      const actual = datosRef.current.habitos.find((h) => h.id === id);
      if (!actual) return Promise.resolve();
      return encolarCambio(colaDe(colasHabitos.current, id), id, actual, cambiar, adaptadorHabitos);
    },
    [adaptadorHabitos, datosRef],
  );

  /** Borrado optimista. Corta la cola de la fila: su copia pendiente no debe resucitarla. */
  const quitarTarea = useCallback(
    (id: number) => {
      cancelarCola(colasTareas.current, id);
      adaptadorTareas.mostrar(id, undefined, false);
      void borrarTarea(id).catch(() => {
        /* Queda en el servidor: la próxima carga la trae otra vez. */
      });
    },
    [adaptadorTareas],
  );

  const quitarHabito = useCallback(
    (id: number) => {
      cancelarCola(colasHabitos.current, id);
      adaptadorHabitos.mostrar(id, undefined, false);
      void borrarHabito(id).catch(() => {
        /* Queda en el servidor: la próxima carga la trae otra vez. */
      });
    },
    [adaptadorHabitos],
  );

  return { escribirTarea, escribirHabito, quitarTarea, quitarHabito, abrirCuenta };
}

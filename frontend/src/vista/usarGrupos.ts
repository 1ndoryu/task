/* Alta, renombrado y borrado de grupos. Un grupo no es una entidad del
 * backend: es un nombre que las filas llevan en `grupoEjecucion`, así que
 * renombrar es mudar todas sus filas y borrar es decidir qué pasa con ellas.
 * Vive aparte de `usarLista` porque es la única parte que reescribe filas en
 * bloque; la lista solo la llama. */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import {
  anotarGrupos,
  archivarGrupoGuardado,
  guardarOrdenPaneles,
  leerOrdenPestanas,
  olvidarGrupo,
  renombrarGrupoGuardado,
} from '../logica/grupos';
import { editarHabito } from '../logica/habitos';
import { limpiarGrupo } from '../logica/orden';
import { guardarPreferencias } from '../logica/preferencias';
import { editarTarea } from '../logica/tareas';
import type { Dashboard } from '../logica/tipos';

interface Entrada {
  /** Última foto de los datos: las filas a mudar salen de aquí, no del estado. */
  datosRef: MutableRefObject<Dashboard>;
  setGruposConocidos: Dispatch<SetStateAction<string[]>>;
  setOrdenPestanas: Dispatch<SetStateAction<string[]>>;
  setGrupo: Dispatch<SetStateAction<string>>;
  escribirTarea: (id: number, cambiar: (tarea: import('../logica/tipos').Tarea) => import('../logica/tipos').Tarea) => Promise<void>;
  escribirHabito: (id: number, cambiar: (habito: import('../logica/tipos').Habito) => import('../logica/tipos').Habito) => Promise<void>;
  quitarTarea: (id: number) => void;
  quitarHabito: (id: number) => void;
  /** Pestaña que se está mirando, ya resuelta contra las pestañas vivas. */
  grupoActivo: string;
}

export interface AccionesGrupo {
  /** Crea un grupo vacío: aparece como pestaña o caja aunque no tenga filas. */
  crearGrupo: (nombre: string) => void;
  /** Renombra un grupo y todas sus filas; el orden de las pestañas acompaña. */
  renombrarGrupo: (viejo: string, nuevo: string) => void;
  /** Borra un grupo. Con `conFilas`, también sus tareas y hábitos; sin él, las
   * filas se quedan y pasan a «Tareas» (sin grupo). */
  borrarGrupo: (nombre: string, conFilas: boolean) => void;
  /** Lo aparta sin tocar sus filas: deja de ser panel y puede volver. */
  archivarGrupo: (nombre: string) => void;
}

export function usarGrupos({
  datosRef,
  setGruposConocidos,
  setOrdenPestanas,
  setGrupo,
  escribirTarea,
  escribirHabito,
  quitarTarea,
  quitarHabito,
  grupoActivo,
}: Entrada): AccionesGrupo {
  /** Grupo nuevo, aunque esté vacío: se anota en conocidos y en el orden de las
   * pestañas (al final) para que su sitio no dependa de tener filas. */
  const crearGrupo = useCallback(
    (nombre: string) => {
      const limpio = limpiarGrupo(nombre);
      if (!limpio) return;
      setGruposConocidos((previos) => (previos.includes(limpio) ? previos : [...previos, limpio]));
      setOrdenPestanas((previo) => (previo.includes(limpio) ? previo : [...previo, limpio]));
      anotarGrupos([limpio]);
      guardarOrdenPaneles([...leerOrdenPestanas(), limpio]);
    },
    [setGruposConocidos, setOrdenPestanas],
  );

  /** Renombrado: el grupo, el orden de pestañas y todas sus filas a la vez. La
   * pestaña abierta sigue al grupo si era la que se estaba mirando. */
  const renombrarGrupo = useCallback(
    (viejo: string, nuevo: string) => {
      const desde = limpiarGrupo(viejo);
      const hasta = limpiarGrupo(nuevo);
      if (!desde || !hasta || desde === hasta) return;
      renombrarGrupoGuardado(desde, hasta);
      setGruposConocidos((previos) => [...new Set(previos.map((g) => (g === desde ? hasta : g)))]);
      setOrdenPestanas((previos) => [...new Set(previos.map((g) => (g === desde ? hasta : g)))]);
      // Se reescriben las filas: mover es elegir, y el grupo es un nombre, no
      // una entidad del backend, así que el renombrado es una mudanza de datos.
      for (const tarea of datosRef.current.tareas) {
        if (tarea.grupoEjecucion === desde) {
          void escribirTarea(tarea.id, (t) => editarTarea(t, { texto: t.texto, grupoEjecucion: hasta }));
        }
      }
      for (const habito of datosRef.current.habitos) {
        if (habito.grupoEjecucion === desde) {
          void escribirHabito(habito.id, (h) => editarHabito(h, { nombre: h.nombre, grupoEjecucion: hasta }));
        }
      }
      setGrupo((abierto) => (abierto === desde ? hasta : abierto));
      guardarPreferencias({ grupo: grupoActivo === desde ? hasta : grupoActivo });
    },
    [datosRef, escribirTarea, escribirHabito, grupoActivo, setGrupo, setGruposConocidos, setOrdenPestanas],
  );

  /** Borrado: con `conFilas` se van las tareas y hábitos del grupo; sin él se
   * mudan a «Tareas» (sin grupo). En ambos casos el nombre deja de existir. */
  const borrarGrupo = useCallback(
    (nombre: string, conFilas: boolean) => {
      const grupoBorrado = limpiarGrupo(nombre);
      if (!grupoBorrado) return;
      for (const tarea of datosRef.current.tareas) {
        if (tarea.grupoEjecucion !== grupoBorrado) continue;
        if (conFilas) quitarTarea(tarea.id);
        else void escribirTarea(tarea.id, (t) => editarTarea(t, { texto: t.texto, grupoEjecucion: null }));
      }
      for (const habito of datosRef.current.habitos) {
        if (habito.grupoEjecucion !== grupoBorrado) continue;
        if (conFilas) quitarHabito(habito.id);
        else void escribirHabito(habito.id, (h) => editarHabito(h, { nombre: h.nombre, grupoEjecucion: null }));
      }
      olvidarGrupo(grupoBorrado);
      setGruposConocidos((previos) => previos.filter((g) => g !== grupoBorrado));
      setOrdenPestanas((previos) => previos.filter((g) => g !== grupoBorrado));
      // La pestaña borrada vuelve a «Tareas»; desde ahí se ve a dónde fueron.
      if (grupoActivo === grupoBorrado) {
        setGrupo('');
        guardarPreferencias({ grupo: '' });
      }
    },
    [
      datosRef,
      escribirTarea,
      escribirHabito,
      quitarTarea,
      quitarHabito,
      grupoActivo,
      setGrupo,
      setGruposConocidos,
      setOrdenPestanas,
    ],
  );

  /** Archivar no toca las filas: el grupo sigue en `grupoEjecucion` de cada
   *  una y solo deja de tener panel. Desarchivar lo devuelve tal cual. */
  const archivarGrupo = useCallback(
    (nombre: string) => {
      const archivado = limpiarGrupo(nombre);
      if (!archivado) return;
      archivarGrupoGuardado(archivado, true);
      setOrdenPestanas((previos) => previos.filter((g) => g !== archivado));
      // La pestaña archivada no puede seguir abierta: se vuelve a «Tareas».
      if (grupoActivo === archivado) {
        setGrupo('');
        guardarPreferencias({ grupo: '' });
      }
    },
    [grupoActivo, setGrupo, setOrdenPestanas],
  );

  return { crearGrupo, renombrarGrupo, borrarGrupo, archivarGrupo };
}

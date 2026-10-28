/* Acciones sobre las cajas: archivar, borrar y renombrar grupos; borrar, archivar
 * y renombrar notas. Una caja que sale de la vista se retira también de las
 * pilas (`olvidarPanel`), para que no quede un hueco en el carril. Lo que toca
 * los datos vive en `usarGrupos` y `usarNotas`; aquí solo se encadena. */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { anotarGrupos, archivarGrupoGuardado, leerGruposArchivados } from '../logica/grupos';
import { idDeNota, type Panel } from '../logica/paneles';
import type { usarGrupos } from './usarGrupos';
import type { usarNotas } from './usarNotas';
import type { usarPaneles } from './usarPaneles';

export interface AccionesPaneles {
  archivarGrupo: (nombre: string) => void;
  borrarGrupo: (nombre: string, conFilas: boolean) => void;
  desarchivarGrupo: (nombre: string) => void;
  borrarNota: (panel: string) => void;
  archivarNota: (panel: string) => void;
  renombrarPanel: (panel: Panel, titulo: string) => void;
}

interface Entrada {
  notas: ReturnType<typeof usarNotas>;
  paneles: ReturnType<typeof usarPaneles>;
  grupos: ReturnType<typeof usarGrupos>;
  ordenPestanas: string[];
  setGruposConocidos: Dispatch<SetStateAction<string[]>>;
  setGruposArchivados: Dispatch<SetStateAction<string[]>>;
}

export function usarAccionesPaneles({
  notas,
  paneles,
  grupos,
  ordenPestanas,
  setGruposConocidos,
  setGruposArchivados,
}: Entrada): AccionesPaneles {
  const { renombrarGrupo, borrarGrupo: borrarGrupoBase, archivarGrupo: archivarGrupoBase } = grupos;

  /** Archivar un grupo también se ve en la lista de archivados. Su caja sale del carril. */
  const archivarGrupo = useCallback(
    (nombre: string) => {
      archivarGrupoBase(nombre);
      setGruposArchivados(leerGruposArchivados());
      paneles.olvidarPanel(nombre);
    },
    [archivarGrupoBase, paneles, setGruposArchivados],
  );

  /** Borrar un grupo también retira su caja de las pilas. */
  const borrarGrupo = useCallback(
    (nombre: string, conFilas: boolean) => {
      borrarGrupoBase(nombre, conFilas);
      paneles.olvidarPanel(nombre);
    },
    [borrarGrupoBase, paneles],
  );

  /** Desarchivar no toca las filas: el grupo vuelve a tener panel, al final. */
  const desarchivarGrupo = useCallback(
    (nombre: string) => {
      archivarGrupoGuardado(nombre, false);
      setGruposArchivados(leerGruposArchivados());
    },
    [setGruposArchivados],
  );

  /** Borrar una nota es borrar su panel: el orden guardado se limpia con él
   *  para que el id no quede vivo esperando a otra nota con el mismo uuid. */
  const borrarNota = useCallback(
    (panel: string) => {
      const id = idDeNota({ id: panel } as Panel);
      if (!id) return;
      notas.borrar(id);
      paneles.olvidarPanel(panel);
    },
    [notas, paneles],
  );

  /** Archivar una nota es sacarla de los paneles, igual que borrarla: su orden
   *  guardado también se retira y la pestaña abierta vuelve a «Tareas». */
  const archivarNota = (panel: string) => {
    const id = idDeNota({ id: panel } as Panel);
    if (!id) return;
    notas.archivar(id);
    paneles.olvidarPanel(panel);
  };

  /** Renombrar un panel: el grupo muda sus filas y su orden guardado; una nota
   *  solo cambia su título. Un grupo que no existe en los datos ni en el orden no
   *  es más que una nota (`usarGrupos` lo ignoraría sin avisar). */
  const renombrarPanel = (panel: Panel, titulo: string) => {
    const id = idDeNota(panel);
    if (id) {
      notas.renombrar(id, titulo);
      return;
    }
    if (panel.fija) return;
    const renombrable = paneles.nombresConocidos.has(panel.id) || ordenPestanas.includes(panel.id);
    if (renombrable) {
      renombrarGrupo(panel.id, titulo);
      return;
    }
    if (!titulo || titulo === panel.id) return;
    setGruposConocidos((previos) => (previos.includes(titulo) ? previos : [...previos, titulo]));
    anotarGrupos([titulo]);
  };

  return { archivarGrupo, borrarGrupo, desarchivarGrupo, borrarNota, archivarNota, renombrarPanel };
}

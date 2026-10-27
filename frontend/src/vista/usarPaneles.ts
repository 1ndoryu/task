/* Paneles de la vista, fuera de `usarLista`: qué pestañas hay, en qué orden,
 * cuál está abierta y cómo se mueven. Todo lo de aquí es disposición, no datos:
 * mover un panel no toca ninguna fila y olvidar uno solo escribe en el
 * `localStorage`. Vive aparte para que `usarLista` se lea como lo que hace
 * —cargar y escribir— y no como la suma de las dos cosas. */
import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import { aplanar, apilar, columnasDe, separar, sin, type Columnas } from '../logica/columnas';
import type { Movimiento } from '../logica/destinoArrastre';
import { guardarOrdenPaneles } from '../logica/grupos';
import type { ModoOrden } from '../logica/orden';
import { moverA, PANEL_ARCHIVADOS, panelesDe, type Panel } from '../logica/paneles';
import { guardarPreferencias, type Preferencias } from '../logica/preferencias';
import type { ResumenNota } from '../logica/notas';
import type { Estado } from './tiposLista';

export interface Disposicion {
  paneles: Panel[];
  /** Solo los grupos, por su nombre: para menús que no admiten notas. */
  grupos: string[];
  /** Pestaña activa, ya saneada: una que no existe cae a «Tareas». */
  grupoActivo: string;
  /** Grupos de ejecución que existen: los guardados y los de las filas. */
  nombresConocidos: Set<string>;
  /** Las cajas agrupadas en columnas (una pila = varias en la misma columna). */
  columnas: Columnas;
  /** Mueve una caja en vivo: a columna propia junto a otra, o dentro de su pila. */
  moverPanel: (movido: string, movimiento: Movimiento) => void;
  moverPestana: (movido: string, hasta: string) => void;
  /** Termina un arrastre: aplica el apilado pendiente, si lo hay, y fija el
   *  orden y las pilas tal como quedaron. */
  soltarPanel: (movido: string, apilado: Movimiento | null) => void;
  /** Quita un panel del orden guardado y vuelve a «Tareas» si estaba abierto. */
  olvidarPanel: (panel: string) => void;
}

interface Dependencias {
  estado: Estado;
  ajustes: Preferencias;
  notas: ResumenNota[];
  gruposConocidos: string[];
  gruposArchivados: string[];
  ordenPestanas: string[];
  setOrdenPestanas: Dispatch<SetStateAction<string[]>>;
  setAjustes: Dispatch<SetStateAction<Preferencias>>;
  /** Hay hábitos aplazados: la caja «Aplazado» solo vive mientras los haya. */
  hayAplazados: boolean;
  grupo: string;
  setGrupo: Dispatch<SetStateAction<string>>;
}

/** Los paneles, su orden y sus movimientos. */
export function usarPaneles(d: Dependencias): Disposicion {
  const { estado, ajustes, notas, gruposConocidos, gruposArchivados, ordenPestanas, hayAplazados, grupo } = d;

  // Los paneles incluyen los grupos que hoy solo existen en memoria (guardados),
  // los que aparecen en los datos y las notas, en una sola lista ordenada: para
  // la vista no hay diferencia entre una fuente de paneles y otra.
  const paneles = useMemo(() => {
    const presentes =
      estado.fase === 'listo'
        ? [...estado.datos.tareas, ...estado.datos.habitos].map((f) => f.grupoEjecucion ?? null)
        : [];
    return panelesDe(
      presentes,
      gruposConocidos,
      notas,
      ordenPestanas,
      gruposArchivados,
      ajustes.separarHabitos,
      hayAplazados,
      ajustes.mostrarCompletados,
      ajustes.mostrarDiario,
    );
  }, [
    estado,
    gruposConocidos,
    notas,
    ordenPestanas,
    gruposArchivados,
    ajustes.separarHabitos,
    hayAplazados,
    ajustes.mostrarCompletados,
    ajustes.mostrarDiario,
  ]);

  // Solo los grupos: los menús de la fila y el alta no admiten una nota.
  const grupos = useMemo(() => paneles.filter((p) => p.tipo === 'tareas' && !p.fija).map((p) => p.id), [paneles]);

  // Una pestaña recordada que ya no existe (grupo renombrado, nota borrada)
  // dejaría la lista en blanco: se cae a «Tareas». «Archivados» no es panel y se
  // acepta siempre; si está apagado en Ajustes, la vista ya cae a la primera.
  const grupoActivo = grupo === PANEL_ARCHIVADOS || paneles.some((p) => p.id === grupo) ? grupo : '';

  /** Grupos de ejecución que existen: los nombres del orden guardado, los de las
   *  filas que llegan y los recordados. Es la fuente para saber si un renombrado
   *  tiene que mudar filas. */
  const nombresConocidos = useMemo(() => {
    const nombres = new Set(gruposConocidos);
    if (estado.fase === 'listo') {
      for (const fila of [...estado.datos.tareas, ...estado.datos.habitos]) {
        if (fila.grupoEjecucion) nombres.add(fila.grupoEjecucion);
      }
    }
    return nombres;
  }, [estado, gruposConocidos]);

  /** El orden de todos los paneles, tal como se ven. Es el espacio en el que se
   *  mueven: también entran «Tareas», «Completados» y los de sistema, que se
   *  arrastran igual. Los que no se pueden mover quedan fuera (`mueve`). */
  const movibles = useMemo(() => paneles.filter((p) => p.mueve).map((p) => p.id), [paneles]);

  /** Las cajas en columnas: el orden plano de siempre y, aparte, cuáles van
   *  debajo de la anterior. Sin pilas es una caja por columna. */
  const columnas = useMemo(() => columnasDe(movibles, ajustes.apiladas), [movibles, ajustes.apiladas]);

  /** Columnas tras un movimiento (la misma si no hay dónde ponerlo). */
  const aplicar = useCallback(
    (movido: string, m: Movimiento): Columnas =>
      m.modo === 'apilar'
        ? apilar(columnas, movido, m.referencia, m.despues)
        : separar(columnas, movido, m.referencia, m.despues),
    [columnas],
  );

  /** Cambio en vivo: solo la pantalla; se guarda al soltar, no a cada paso. */
  const poner = useCallback(
    (nuevas: Columnas) => {
      const { orden, apiladas } = aplanar(nuevas);
      d.setOrdenPestanas(orden);
      d.setAjustes((previas) => ({ ...previas, apiladas }));
    },
    [d],
  );

  const moverPanel = useCallback((movido: string, m: Movimiento) => poner(aplicar(movido, m)), [poner, aplicar]);

  const soltarPanel = useCallback(
    (movido: string, apilado: Movimiento | null) => {
      const finales = apilado ? aplicar(movido, apilado) : columnas;
      if (apilado) poner(finales);
      const { orden, apiladas } = aplanar(finales);
      guardarOrdenPaneles(orden);
      guardarPreferencias({ apiladas });
    },
    [aplicar, columnas, poner],
  );

  /** Orden desde la fila de pestañas: se guarda en el acto, porque no hay
   *  gesto que diga cuándo terminó. */
  const moverPestana = useCallback(
    (movido: string, hasta: string) => {
      if (movido === hasta) return;
      // El índice de destino es el del panel que se cruza.
      const destino = movibles.indexOf(hasta);
      if (destino < 0) return;
      const nuevo = moverA(movibles, movido, destino);
      d.setOrdenPestanas(nuevo);
      guardarOrdenPaneles(nuevo);
    },
    [movibles, d],
  );

  /** Un panel borrado o archivado sale del orden guardado y, si estaba abierto,
   *  la lista vuelve a «Tareas»: su id no puede quedar vivo esperando a otra
   *  nota con el mismo uuid. */
  const olvidarPanel = useCallback(
    (panel: string) => {
      const resto = ordenPestanas.filter((guardado) => guardado !== panel);
      d.setOrdenPestanas(resto);
      guardarOrdenPaneles(resto);
      // Las pilas se rehacen sin la caja: si era la de arriba, la de debajo pasa a
      // ser cabeza de su columna; con su marca de apilada intacta, `columnasDe` la
      // subiría a la columna de al lado.
      const { apiladas } = aplanar(sin(columnas, panel));
      d.setAjustes((previas) => ({ ...previas, apiladas }));
      guardarPreferencias({ apiladas });
      if (grupoActivo === panel) {
        d.setGrupo('');
        guardarPreferencias({ grupo: '' });
      }
    },
    [ordenPestanas, grupoActivo, columnas, d],
  );

  return {
    paneles,
    grupos,
    grupoActivo,
    nombresConocidos,
    columnas,
    moverPanel,
    moverPestana,
    soltarPanel,
    olvidarPanel,
  };
}

/** El orden de cada caja, que vive en las preferencias y no en un estado aparte. */
export function usarOrdenCajas(
  ajustes: Preferencias,
  setAjustes: Dispatch<SetStateAction<Preferencias>>,
  orden: ModoOrden,
): { ordenDe: (pestana: string) => ModoOrden; cambiarOrdenCaja: (pestana: string, modo: ModoOrden) => void } {
  /** El modo de cada caja sale de las preferencias: un solo sitio que leer y
   *  que guardar. */
  const ordenDe = useCallback(
    (pestana: string): ModoOrden => (ajustes.ordenes[pestana] as ModoOrden | undefined) ?? orden,
    [ajustes.ordenes, orden],
  );

  /** Cambiar el orden de una caja solo escribe su entrada: la general queda
   *  como estaba y sigue sirviendo de herencia a las que no tienen la suya. */
  const cambiarOrdenCaja = useCallback(
    (pestana: string, modo: ModoOrden) => {
      const ordenes = { ...ajustes.ordenes, [pestana]: modo };
      setAjustes((previas) => ({ ...previas, ordenes }));
      guardarPreferencias({ ordenes });
    },
    [ajustes.ordenes, setAjustes],
  );

  return { ordenDe, cambiarOrdenCaja };
}

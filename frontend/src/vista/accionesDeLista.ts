/* Las acciones que la vista pasa a sus cajas y el guardado del modal, en un
 * solo sitio: es el pegamento entre `usarLista` y los componentes de fila, y
 * no depende de ninguna rama de la vista, así que no tiene por qué vivir en
 * ella. Se arma una vez por render con la lista como única entrada. */
import { importanciaDeHabito } from '../logica/importancia';
import { grupoDe, type AccionesFila } from './accionesFila';
import type { CambiosFilaForm } from './opcionesFila';
import type { Editando, Lista } from './usarLista';

export interface AccionesDeLista {
  acciones: AccionesFila;
  /** Guarda el modal en el tipo que corresponda. */
  guardarCambios: (fila: NonNullable<Editando>, cambios: CambiosFilaForm) => void;
}

export function accionesDeLista(lista: Lista): AccionesDeLista {
  /** Guarda el modal en el tipo que corresponda. */
  const guardarCambios = (fila: NonNullable<Editando>, cambios: CambiosFilaForm): void => {
    // El subhábito no tiene formulario: sus ajustes son los del padre.
    if (fila.tipo === 'subhabito') return;
    const grupo = cambios.grupoEjecucion.trim() || null;
    if (fila.tipo === 'tarea') {
      lista.editarTarea(fila.tarea.id, {
        texto: cambios.texto,
        prioridad: cambios.prioridad,
        urgencia: cambios.urgencia,
        proyectoId: cambios.proyectoId,
        fechaMaxima: cambios.fechaMaxima,
        momentos: cambios.momentos,
        grupoEjecucion: grupo,
      });
    } else {
      lista.editarHabito(fila.habito.id, {
        texto: cambios.texto,
        prioridad: cambios.prioridad,
        grupoEjecucion: grupo,
        momentos: cambios.momentos,
        frecuencia: cambios.frecuencia,
        subhabitos: cambios.subhabitos,
      });
    }
  };

  const acciones: AccionesFila = {
    completar: lista.completar,
    editar: lista.abrirEdicion,
    borrar: (fila) => {
      if (fila.tipo === 'tarea') lista.borrarTarea(fila.tarea.id);
      else if (fila.tipo === 'habito') lista.borrarHabito(fila.habito.id);
      else lista.borrarSubhabito(fila.padre.id, fila.subhabito.id);
    },
    prioridad: (fila, prioridad) => {
      // El subhábito hereda el nivel: se cambia en el padre, no aquí.
      if (fila.tipo === 'subhabito') return;
      // El menú elige en ids; el hábito los guarda como texto (`Muy Alta`).
      const nivel = prioridad ?? 'media';
      guardarCambios(fila, {
        texto: fila.tipo === 'tarea' ? fila.tarea.texto : fila.habito.nombre,
        prioridad: fila.tipo === 'tarea' ? nivel : importanciaDeHabito(nivel),
        urgencia: fila.tipo === 'tarea' ? (fila.tarea.urgencia ?? 'normal') : 'normal',
        proyectoId: fila.tipo === 'tarea' ? (fila.tarea.proyectoId ?? null) : null,
        fechaMaxima: fila.tipo === 'tarea' ? (fila.tarea.configuracion?.fechaMaxima ?? '') : '',
        grupoEjecucion: grupoDe(fila) ?? '',
      });
    },
    mover: lista.moverGrupo,
    aplazar: lista.aplazar,
    reordenar: lista.reordenar,
  };

  return { acciones, guardarCambios };
}

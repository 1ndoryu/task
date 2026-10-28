/* Mutaciones de fila de la lista: alta, completar, mover de grupo y aplazar.
 * Comparten las mismas dependencias —los datos vivos, el estado, la escritura—
 * y no tocan paneles ni preferencias; viven aparte para que `usarLista` quede
 * como lo que es: el pegamento entre la carga, la disposición y estas acciones. */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { hoyLogico } from '../logica/fechas';
import { anotarGrupos } from '../logica/grupos';
import { ordenesNuevos } from '../logica/reordenar';
import { desmarcarHabito, editarHabito, guardarHabito, marcarHabito } from '../logica/habitos';
import { importanciaDeHabito } from '../logica/importancia';
import { hechoHoy } from '../logica/seleccion';
import { faltaAntes } from './requisitos';
import type { Pendientes } from '../logica/store';
import { alternarCompletado, editarTarea, guardarTarea } from '../logica/tareas';
import type { Dashboard, Habito, RefDependencia, Tarea } from '../logica/tipos';
import type { NuevaFila } from './NuevaFila';
import { claveFila, idNuevo, type Editando, type Estado } from './tiposLista';

interface Dependencias {
  /** Última foto de los datos: una acción tarde no trabaja sobre una copia vieja. */
  datosRef: { current: Dashboard };
  /** Cambios sin confirmar: lo que no llegó al servidor. */
  pendientesRef: { current: Pendientes };
  setEstado: Dispatch<SetStateAction<Estado>>;
  setGruposConocidos: Dispatch<SetStateAction<string[]>>;
  /** Filas saliendo tras completarse, para la animación de salida. */
  setSaliendo: Dispatch<SetStateAction<ReadonlySet<string>>>;
  anotar: (cambios: Partial<Pendientes>) => void;
  escribirTarea: (id: number, cambiar: (tarea: Tarea) => Tarea) => Promise<void>;
  escribirHabito: (id: number, cambiar: (habito: Habito) => Habito) => Promise<void>;
  hoy: string;
}

/** Las acciones que cambian una fila, ya atadas a sus dependencias. */
export function usarFilas(d: Dependencias) {
  const { datosRef, pendientesRef, setEstado, setGruposConocidos, setSaliendo, anotar, escribirTarea, escribirHabito, hoy } = d;

  /** Recuerda el grupo de una fila, para que la pestaña no desaparezca al mover
   * la última fila. */
  const anotarGrupo = useCallback((nombre: string | null) => {
    if (!nombre) return;
    setGruposConocidos((previos) => {
      if (previos.includes(nombre)) return previos;
      anotarGrupos([nombre]);
      return [...previos, nombre];
    });
  }, []);

  const moverGrupo = useCallback(
    (fila: NonNullable<Editando>, destino: string | null) => {
      if (fila.tipo === 'tarea') void escribirTarea(fila.tarea.id, (t) => editarTarea(t, { texto: t.texto, grupoEjecucion: destino }));
      else if (fila.tipo === 'habito') void escribirHabito(fila.habito.id, (h) => editarHabito(h, { nombre: h.nombre, grupoEjecucion: destino }));
      // El subhábito manda el grupo de su padre: no tiene uno propio.
      else void escribirHabito(fila.padre.id, (h) => editarHabito(h, { nombre: h.nombre, grupoEjecucion: destino }));
      anotarGrupo(destino);
    },
    [escribirTarea, escribirHabito, anotarGrupo],
  );

  /** Alta: la fila aparece ya en la lista y se manda con el mismo PUT que un
   * cambio, porque el backend no tiene POST de creación (una fila con id
   * nuevo es un upsert). Si el envío falla, queda como pendiente. */
  const crear = useCallback(
    (nueva: NuevaFila) => {
      const id = idNuevo();
      const grupoNuevo = nueva.grupo;
      anotarGrupo(grupoNuevo);
      const previas = datosRef.current;
      // Va al final del grupo: el orden manual no se reescribe al dar de alta.
      const ordenAlta = Math.max(-1, ...previas.tareas.map((t) => t.orden ?? 0), ...previas.habitos.map((h) => h.orden ?? 0)) + 1;
      const fecha = hoyLogico();
      if (nueva.tipo === 'tarea') {
        const tarea: Tarea = {
          id,
          texto: nueva.texto,
          completado: false,
          prioridad: nueva.prioridad,
          urgencia: 'normal',
          orden: ordenAlta,
          grupoEjecucion: grupoNuevo,
          fechaCreacion: fecha,
          configuracion: {},
        };
        setEstado((previo) =>
          previo.fase === 'listo' ? { fase: 'listo', datos: { ...previo.datos, tareas: [...previo.datos.tareas, tarea] } } : previo,
        );
        datosRef.current = { ...previas, tareas: [...previas.tareas, tarea] };
        anotar({ tareas: { ...pendientesRef.current.tareas, [id]: tarea } });
        void guardarTarea(tarea).catch(() => {
          /* Queda pendiente en el navegador y se reenvía al recargar. */
        });
        return;
      }
      const habito: Habito = {
        id,
        nombre: nueva.texto,
        // El hábito guarda su escala como texto (`Muy Alta`), no como id.
        importancia: importanciaDeHabito(nueva.prioridad),
        orden: ordenAlta,
        grupoEjecucion: grupoNuevo,
        frecuencia: { ...nueva.frecuencia },
        historialCompletados: [],
      };
      setEstado((previo) =>
        previo.fase === 'listo' ? { fase: 'listo', datos: { ...previo.datos, habitos: [...previo.datos.habitos, habito] } } : previo,
      );
      datosRef.current = { ...previas, habitos: [...previas.habitos, habito] };
      anotar({ habitos: { ...pendientesRef.current.habitos, [id]: habito } });
      void guardarHabito(habito).catch(() => {
        /* Queda pendiente en el navegador y se reenvía al recargar. */
      });
    },
    [anotar, anotarGrupo],
  );

  const completar = useCallback(
    (fila: NonNullable<Editando>) => {
      const clave = claveFila(fila);
      // El subhábito no tiene fila en el backend: la ruta de historial solo
      // existe para hábitos de verdad. Se marca dentro del payload del padre,
      // que es donde vive, con un solo PUT.
      if (fila.tipo === 'subhabito') {
        const { id: idSub } = fila.subhabito;
        void escribirHabito(fila.padre.id, (h) => {
          const historial = new Set(fila.subhabito.historialCompletados ?? []);
          if (historial.has(hoy)) historial.delete(hoy);
          else historial.add(hoy);
          const fechas = [...historial].sort();
          const subhabitos = (h.subhabitos ?? []).map((s) =>
            s.id === idSub ? { ...s, historialCompletados: fechas, ultimoCompletado: fechas.at(-1) ?? null } : s,
          );
          return { ...h, subhabitos };
        });
        return;
      }
      const quedaHecha = fila.tipo === 'tarea' ? !fila.tarea.completado : !hechoHoy(fila.habito, hoy);
      // Un requisito sin hacer impide completar; desmarcar siempre se puede. La fila ya muestra el «antes: …».
      const ref: RefDependencia = fila.tipo === 'tarea' ? { tipo: 'tarea', id: fila.tarea.id } : { tipo: 'habito', id: fila.habito.id };
      if (quedaHecha && faltaAntes(datosRef.current, ref, hoy).length) return;
      // Solo sale de la lista la tarea: el hábito se queda todo el día, tachado,
      // así que animarle la salida sería un parpadeo sin efecto.
      if (quedaHecha && fila.tipo === 'tarea') {
        // Se queda en pantalla el tiempo de la animación y luego se retira.
        setSaliendo((previo) => new Set(previo).add(clave));
        window.setTimeout(() => {
          setSaliendo((previo) => {
            const resto = new Set(previo);
            resto.delete(clave);
            return resto;
          });
        }, 320);
      }
      if (fila.tipo === 'tarea') {
        void escribirTarea(fila.tarea.id, (t) => alternarCompletado(t, hoy));
        return;
      }
      // El hábito marca el día de hoy en su historial, no el campo `completado`.
      const id = fila.habito.id;
      void escribirHabito(id, (h) => {
        const historial = new Set(h.historialCompletados ?? []);
        if (quedaHecha) historial.add(hoy);
        else historial.delete(hoy);
        const fechas = [...historial].sort();
        // `ultimoCompletado` se mantiene junto al historial: lo lee el respaldo
        // de `ultimoHecho` y el panel de Actividad del resto de la app.
        return { ...h, historialCompletados: fechas, ultimoCompletado: fechas.at(-1) ?? null };
      });
      // El historial es su propia ruta; el cambio del payload no lo escribe.
      const peticion = quedaHecha ? marcarHabito(id, hoy, 'completado') : desmarcarHabito(id, hoy);
      void peticion.catch(() => {
        /* Queda en memoria: la próxima carga lo trae del servidor. */
      });
    },
    [escribirTarea, escribirHabito, hoy],
  );

  /** Aplazar escribe las dos mitades que el legacy dejó: la fecha de vuelta en
   * el payload y el día de hoy en el historial de pospuestos. La fila sale de
   * su pestaña en el acto —`seleccionar` mira `pospuestoHasta`— y aparece en la
   * caja «Aplazado». Quitarlo deshace las dos. */
  const aplazar = useCallback(
    (fila: NonNullable<Editando>, hasta: string | null) => {
      if (fila.tipo !== 'habito') return;
      const id = fila.habito.id;
      void escribirHabito(id, (h) => {
        const historial = new Set(h.historialPospuestos ?? []);
        if (hasta === null) historial.delete(hoy);
        else historial.add(hoy);
        const base: Habito = { ...h, historialPospuestos: [...historial].sort() };
        // El campo se borra del payload al quitarlo: dejarlo vacío no es lo
        // mismo que no tenerlo, y el legacy interpreta la ausencia.
        if (hasta === null) delete base.pospuestoHasta;
        else base.pospuestoHasta = hasta;
        return base;
      });
      // El historial detallado es su propia ruta; el payload no lo escribe.
      const peticion = hasta === null ? desmarcarHabito(id, hoy) : marcarHabito(id, hoy, 'pospuesto');
      void peticion.catch(() => {
        /* Queda en memoria: la próxima carga lo trae del servidor. */
      });
    },
    [escribirHabito, hoy],
  );

  /** Orden manual: `filas` ya viene en su orden nuevo. Reparte entre ellas los
   * mismos números de `orden` que tenían (tareas y hábitos comparten espacio) y
   * solo escribe a las que cambian de número. */
  const reordenar = useCallback(
    (filas: NonNullable<Editando>[]) => {
      const propias = filas.flatMap((f) => (f.tipo === 'tarea' || f.tipo === 'habito' ? [f] : []));
      const { tareas, habitos } = datosRef.current;
      const actuales = propias.map((f) =>
        f.tipo === 'tarea' ? (tareas.find((t) => t.id === f.tarea.id)?.orden ?? 0) : (habitos.find((h) => h.id === f.habito.id)?.orden ?? 0),
      );
      const nuevos = ordenesNuevos(actuales);
      propias.forEach((f, i) => {
        if (nuevos[i] === actuales[i]) return;
        if (f.tipo === 'tarea') void escribirTarea(f.tarea.id, (t) => ({ ...t, orden: nuevos[i] }));
        else void escribirHabito(f.habito.id, (h) => ({ ...h, orden: nuevos[i] }));
      });
    },
    [escribirTarea, escribirHabito],
  );
  /** Lo que debe hacerse antes de una fila: va en su payload, así que viaja con
   * el mismo PUT que cualquier cambio. Vacío borra el campo, no lo deja en `[]`. */
  const dependencias = useCallback(
    (objetivo: RefDependencia, lista: RefDependencia[]) => {
      const poner = <T extends { dependencias?: RefDependencia[] }>(fila: T): T => {
        const { dependencias: _previas, ...resto } = fila;
        return (lista.length ? { ...resto, dependencias: lista } : resto) as T;
      };
      if (objetivo.tipo === 'tarea') void escribirTarea(objetivo.id, poner);
      else void escribirHabito(objetivo.id, poner);
    },
    [escribirTarea, escribirHabito],
  );
  return { anotarGrupo, moverGrupo, crear, completar, aplazar, reordenar, dependencias };
}

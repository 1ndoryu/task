/* Estado de la lista: carga, orden, filtro, pestaña de grupo y las mutaciones.
 * Tareas y hábitos se tratan igual: ambos tienen grupo, menú y configuración.
 * La lógica de datos vive en `logica/`; aquí solo se guarda y se encadena. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { leerDashboard } from '../logica/dashboard';
import { fechaLocal } from '../logica/fechas';
import { codificarFiltro, decodificarFiltro, type Filtro } from '../logica/filtros';
import { anotarGrupos, leerGruposConocidos } from '../logica/grupos';
import {
  borrarHabito,
  desmarcarHabito,
  editarHabito,
  guardarHabito,
  marcarHabito,
} from '../logica/habitos';
import { pestanasDeGrupos, type ModoOrden } from '../logica/orden';
import { guardarPreferencias, leerPreferencias, type Preferencias } from '../logica/preferencias';
import { hechoHoy, seleccionar, type Vista } from '../logica/seleccion';
import { asegurarSesionLocal } from '../logica/sesion';
import { fusionarPendientes, guardarPendientes, leerPendientes, type Pendientes } from '../logica/store';
import { alternarCompletado, borrarTarea, editarTarea, guardarTarea } from '../logica/tareas';
import type { Dashboard, Habito, Tarea } from '../logica/tipos';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; datos: Dashboard }
  | { fase: 'error'; mensaje: string };

/** Lo que el modal de configuración puede abrir: una tarea o un hábito. */
export type Editando = { tipo: 'tarea'; tarea: Tarea } | { tipo: 'habito'; habito: Habito } | null;

/** Cambios comunes de una fila. `grupoEjecucion` llega desde el modal. */
export interface CambiosFila {
  texto: string;
  prioridad?: string | null;
  urgencia?: string | null;
  proyectoId?: number | null;
  fechaMaxima?: string;
  grupoEjecucion?: string | null;
}

export interface Lista {
  estado: Estado;
  filtro: Filtro;
  orden: ModoOrden;
  /** Pestaña de grupo activa; `''` es «Tareas» (lo que no tiene grupo). */
  grupo: string;
  /** Pestañas: «Tareas» más un grupo por nombre conocido. */
  pestanas: { id: string; etiqueta: string }[];
  /** Ajustes de lectura: privacidad, fuente, altura y separador. */
  preferencias: Preferencias;
  /** Filas que están saliendo de la lista tras completarse. */
  saliendo: ReadonlySet<string>;
  ajustesAbiertos: boolean;
  vista: Vista | null;
  hoy: string;
  cambiarFiltro: (filtro: Filtro) => void;
  cambiarOrden: (modo: ModoOrden) => void;
  cambiarGrupo: (grupo: string) => void;
  cambiarPreferencias: (cambios: Partial<Preferencias>) => void;
  abrirAjustes: (abiertos: boolean) => void;
  /** Fila abierta en el modal de configuración; `null` si está cerrado. */
  editando: Editando;
  abrirEdicion: (fila: Editando) => void;
  /** Marca o desmarca, según su estado de hoy. */
  completar: (fila: NonNullable<Editando>) => void;
  editarTarea: (id: number, cambios: CambiosFila) => void;
  editarHabito: (id: number, cambios: CambiosFila) => void;
  borrarTarea: (id: number) => void;
  borrarHabito: (id: number) => void;
  /** Mueve una fila de grupo desde el menú de la fila. */
  moverGrupo: (fila: NonNullable<Editando>, grupo: string | null) => void;
}

/** Clave de una fila en el conjunto de salidas: tareas y hábitos comparten id. */
export const claveFila = (fila: NonNullable<Editando>) =>
  `${fila.tipo}${fila.tipo === 'tarea' ? fila.tarea.id : fila.habito.id}`;

export function usarLista(): Lista {
  const preferencias = useMemo(leerPreferencias, []);
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [filtro, setFiltro] = useState<Filtro>(() => decodificarFiltro(preferencias.filtro));
  const [orden, setOrden] = useState(preferencias.orden as ModoOrden);
  const [grupo, setGrupo] = useState(preferencias.grupo);
  const [ajustes, setAjustes] = useState<Preferencias>(preferencias);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [editando, setEditando] = useState<Editando>(null);
  const [hoy] = useState(() => fechaLocal());
  const [gruposConocidos, setGruposConocidos] = useState<string[]>(leerGruposConocidos);
  // Filas completadas que siguen en la lista mientras termina su animación.
  const [saliendo, setSaliendo] = useState<ReadonlySet<string>>(() => new Set());
  // El correo separa los cambios de cada cuenta; llega con la carga.
  const correoRef = useRef('');
  // Cambios sin confirmar: solo se mutan en el manejador, nunca se leen del estado.
  const pendientesRef = useRef<Pendientes>({ tareas: {}, habitos: {} });

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        correoRef.current = (await asegurarSesionLocal()) ?? '';
        const datos = await leerDashboard();
        if (!vigente) return;
        const guardados = leerPendientes(correoRef.current);
        pendientesRef.current = guardados;
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
  }, []);

  // Última foto de los datos, para que una acción tarde no trabaje sobre una
  // copia vieja: el estado de React no se lee dentro de los manejadores.
  const datosRef = useRef<Dashboard>({ tareas: [], habitos: [], proyectos: [] });
  if (estado.fase === 'listo') datosRef.current = estado.datos;

  const anotar = useCallback((cambios: Partial<Pendientes>) => {
    pendientesRef.current = { ...pendientesRef.current, ...cambios };
    guardarPendientes(correoRef.current, pendientesRef.current);
  }, []);

  /** Única vía de escritura de una tarea: aplica el cambio en memoria, lo anota
   * como pendiente y lo manda. Cada llamada lleva su transformación, así que dos
   * acciones seguidas no se pisan. */
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
    [anotar],
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
    [anotar],
  );

  /** Saca una fila de la vista tras la animación, y recuerda su grupo para que
   * la pestaña no desaparezca al mover la última fila. */
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
      else void escribirHabito(fila.habito.id, (h) => editarHabito(h, { nombre: h.nombre, grupoEjecucion: destino }));
      anotarGrupo(destino);
    },
    [escribirTarea, escribirHabito, anotarGrupo],
  );

  const completar = useCallback(
    (fila: NonNullable<Editando>) => {
      const clave = claveFila(fila);
      const quedaHecha = fila.tipo === 'tarea' ? !fila.tarea.completado : !hechoHoy(fila.habito, hoy);
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
        return { ...h, historialCompletados: [...historial].sort() };
      });
      // El historial es su propia ruta; el cambio del payload no lo escribe.
      const peticion = quedaHecha ? marcarHabito(id, hoy, 'completado') : desmarcarHabito(id, hoy);
      void peticion.catch(() => {
        /* Queda en memoria: la próxima carga lo trae del servidor. */
      });
    },
    [escribirTarea, escribirHabito, hoy],
  );

  // Las pestañas incluyen los grupos que hoy solo existen en memoria (guardados)
  // y los que aparecen en los datos, para que ninguna desaparezca al moverse.
  const pestanas = useMemo(() => {
    const presentes = estado.fase === 'listo'
      ? [...estado.datos.tareas, ...estado.datos.habitos].map((f) => f.grupoEjecucion ?? null)
      : [];
    return pestanasDeGrupos(presentes, gruposConocidos);
  }, [estado, gruposConocidos]);

  // Una pestaña recordada que ya no existe (grupo renombrado o vaciado sin
  // rastro) dejaría la lista en blanco: se cae a «Tareas».
  const grupoActivo = pestanas.some((p) => p.id === grupo) ? grupo : '';

  const vista = useMemo(
    () =>
      estado.fase === 'listo'
        ? seleccionar(estado.datos, { filtro, orden, grupo: grupoActivo || null, hoy, saliendo })
        : null,
    [estado, filtro, orden, grupoActivo, hoy, saliendo],
  );

  return {
    estado,
    filtro,
    orden,
    grupo: grupoActivo,
    pestanas,
    preferencias: ajustes,
    saliendo,
    ajustesAbiertos,
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
    cambiarGrupo: (nuevo: string) => {
      setGrupo(nuevo);
      guardarPreferencias({ grupo: nuevo });
    },
    // Un solo punto de escritura: el estado local y el `localStorage` no se separan.
    cambiarPreferencias: (cambios) => {
      setAjustes((previas) => ({ ...previas, ...cambios }));
      guardarPreferencias(cambios);
    },
    abrirAjustes: setAjustesAbiertos,
    editando,
    abrirEdicion: setEditando,
    completar,
    editarTarea: (id, cambios) => {
      // Un grupo escrito a mano en el modal también estrena pestaña.
      anotarGrupo(cambios.grupoEjecucion ?? null);
      void escribirTarea(id, (t) => editarTarea(t, cambios));
    },
    editarHabito: (id, cambios) => {
      anotarGrupo(cambios.grupoEjecucion ?? null);
      void escribirHabito(id, (h) =>
        editarHabito(h, { nombre: cambios.texto, importancia: cambios.prioridad ?? undefined, grupoEjecucion: cambios.grupoEjecucion }),
      );
    },
    borrarTarea: (id) => {
      // Optimista: la fila desaparece y, si el servidor falla, vuelve al recargar.
      setEstado((previo) =>
        previo.fase === 'listo'
          ? { fase: 'listo', datos: { ...previo.datos, tareas: previo.datos.tareas.filter((t) => t.id !== id) } }
          : previo,
      );
      // La copia de pendientes no debe resucitarla al recargar.
      const resto = { ...pendientesRef.current.tareas };
      delete resto[id];
      anotar({ tareas: resto });
      void borrarTarea(id).catch(() => {
        /* Queda en el servidor: la próxima carga la trae otra vez. */
      });
    },
    borrarHabito: (id) => {
      setEstado((previo) =>
        previo.fase === 'listo'
          ? { fase: 'listo', datos: { ...previo.datos, habitos: previo.datos.habitos.filter((h) => h.id !== id) } }
          : previo,
      );
      const resto = { ...pendientesRef.current.habitos };
      delete resto[id];
      anotar({ habitos: resto });
      void borrarHabito(id).catch(() => {
        /* Queda en el servidor: la próxima carga lo trae otra vez. */
      });
    },
    moverGrupo,
  };
}

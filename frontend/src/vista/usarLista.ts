/* Estado de la lista: carga, orden, pestaña y las mutaciones.
 * Tareas y hábitos se tratan igual: ambos tienen grupo, menú y configuración.
 * La lógica de datos vive en `logica/`; aquí solo se guarda y se encadena.
 * La escritura y las acciones de grupo viven en `usarEscritura` y `usarGrupos`:
 * esta función orquesta, no reescribe filas. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { leerDashboard } from '../logica/dashboard';
import { fechaLocal } from '../logica/fechas';
import { anotarGrupos, guardarOrdenPestanas, leerGruposConocidos, leerOrdenPestanas } from '../logica/grupos';
import { desmarcarHabito, editarHabito, guardarHabito, marcarHabito } from '../logica/habitos';
import { importanciaDeHabito } from '../logica/importancia';
import { PESTANA_COMPLETADOS, pestanasDeGrupos, type ModoOrden } from '../logica/orden';
import { guardarPreferencias, leerPreferencias, type Preferencias } from '../logica/preferencias';
import { hechoHoy, seleccionar, type Vista } from '../logica/seleccion';
import { asegurarSesionLocal } from '../logica/sesion';
import { fusionarPendientes, type Pendientes } from '../logica/store';
import { alternarCompletado, editarTarea, guardarTarea } from '../logica/tareas';
import type { Dashboard, Habito, Tarea } from '../logica/tipos';
import type { NuevaFila } from './NuevaFila';
import { claveFila, idNuevo, type CambiosFila, type Editando, type Estado } from './tiposLista';
import { usarEscritura } from './usarEscritura';
import { usarGrupos } from './usarGrupos';

export type { CambiosFila, Editando } from './tiposLista';
export { claveFila } from './tiposLista';

export interface Lista {
  estado: Estado;
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
  cambiarOrden: (modo: ModoOrden) => void;
  cambiarGrupo: (grupo: string) => void;
  /** Mueve un grupo a otra posición de la fila de pestañas (arrastre). */
  moverPestana: (grupo: string, hasta: string) => void;
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
  /** Da de alta una tarea o un hábito desde el campo de la lista. */
  crear: (fila: NuevaFila) => void;
  crearGrupo: (nombre: string) => void;
  renombrarGrupo: (viejo: string, nuevo: string) => void;
  borrarGrupo: (nombre: string, conFilas: boolean) => void;
}

export function usarLista(): Lista {
  const preferencias = useMemo(leerPreferencias, []);
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [orden, setOrden] = useState(preferencias.orden as ModoOrden);
  const [grupo, setGrupo] = useState(preferencias.grupo);
  const [ajustes, setAjustes] = useState<Preferencias>(preferencias);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [editando, setEditando] = useState<Editando>(null);
  const [hoy] = useState(() => fechaLocal());
  const [gruposConocidos, setGruposConocidos] = useState<string[]>(leerGruposConocidos);
  // Orden manual de las pestañas de grupo; vacío = alfabético.
  const [ordenPestanas, setOrdenPestanas] = useState<string[]>(leerOrdenPestanas);
  // Filas completadas que siguen en la lista mientras termina su animación.
  const [saliendo, setSaliendo] = useState<ReadonlySet<string>>(() => new Set());
  // Cambios sin confirmar: la escritura y las altas anotan en el mismo sitio.
  const pendientesRef = useRef<Pendientes>({ tareas: {}, habitos: {} });

  // Última foto de los datos, para que una acción tarde no trabaje sobre una
  // copia vieja: el estado de React no se lee dentro de los manejadores.
  const datosRef = useRef<Dashboard>({ tareas: [], habitos: [], proyectos: [] });
  const { anotar, abrirCuenta, escribirTarea, escribirHabito, quitarTarea, quitarHabito } = usarEscritura(
    estado,
    setEstado,
    datosRef,
    pendientesRef,
  );

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        const correo = (await asegurarSesionLocal()) ?? '';
        const datos = await leerDashboard();
        if (!vigente) return;
        const guardados = abrirCuenta(correo);
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
    // La carga es única: depende de la sesión que se asegura dentro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      else void escribirHabito(fila.habito.id, (h) => editarHabito(h, { nombre: h.nombre, grupoEjecucion: destino }));
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
      const orden = Math.max(-1, ...previas.tareas.map((t) => t.orden ?? 0), ...previas.habitos.map((h) => h.orden ?? 0)) + 1;
      const fecha = fechaLocal();
      if (nueva.tipo === 'tarea') {
        const tarea: Tarea = {
          id,
          texto: nueva.texto,
          completado: false,
          prioridad: nueva.prioridad,
          urgencia: 'normal',
          orden,
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
        orden,
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

  // Las pestañas incluyen los grupos que hoy solo existen en memoria (guardados)
  // y los que aparecen en los datos, para que ninguna desaparezca al moverse.
  const pestanas = useMemo(() => {
    const presentes = estado.fase === 'listo'
      ? [...estado.datos.tareas, ...estado.datos.habitos].map((f) => f.grupoEjecucion ?? null)
      : [];
    return pestanasDeGrupos(presentes, gruposConocidos, ordenPestanas);
  }, [estado, gruposConocidos, ordenPestanas]);

  // Una pestaña recordada que ya no existe (grupo renombrado o vaciado sin
  // rastro) dejaría la lista en blanco: se cae a «Tareas».
  const grupoActivo = pestanas.some((p) => p.id === grupo) ? grupo : '';

  const vista = useMemo(
    () =>
      estado.fase === 'listo'
        ? seleccionar(estado.datos, {
            orden,
            grupo: grupoActivo || null,
            ocultarHabitos: ajustes.ocultarHabitos,
            hoy,
            saliendo,
          })
        : null,
    [estado, orden, grupoActivo, ajustes.ocultarHabitos, hoy, saliendo],
  );

  const { crearGrupo, renombrarGrupo, borrarGrupo } = usarGrupos({
    datosRef,
    setGruposConocidos,
    setOrdenPestanas,
    setGrupo,
    escribirTarea,
    escribirHabito,
    quitarTarea,
    quitarHabito,
    grupoActivo,
  });

  return {
    estado,
    orden,
    grupo: grupoActivo,
    pestanas,
    preferencias: ajustes,
    saliendo,
    ajustesAbiertos,
    vista,
    hoy,
    cambiarOrden: (modo) => {
      setOrden(modo);
      guardarPreferencias({ orden: modo });
    },
    cambiarGrupo: (nuevo: string) => {
      setGrupo(nuevo);
      guardarPreferencias({ grupo: nuevo });
    },
    moverPestana: (movido: string, hasta: string) => {
      // Solo se reordenan grupos: «Tareas» y «Completados» tienen su sitio.
      const grupos = pestanas.map((p) => p.id).filter((id) => id && id !== PESTANA_COMPLETADOS);
      const desde = grupos.indexOf(movido);
      const destino = grupos.indexOf(hasta);
      if (desde < 0 || destino < 0 || desde === destino) return;
      const nuevo = [...grupos];
      nuevo.splice(desde, 1);
      nuevo.splice(destino, 0, movido);
      setOrdenPestanas(nuevo);
      guardarOrdenPestanas(nuevo);
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
        editarHabito(h, {
          nombre: cambios.texto,
          // El hábito guarda su escala como texto (`Muy Alta`), no como id.
          importancia: cambios.prioridad ? importanciaDeHabito(cambios.prioridad) : undefined,
          grupoEjecucion: cambios.grupoEjecucion,
          frecuencia: cambios.frecuencia,
        }),
      );
    },
    borrarTarea: quitarTarea,
    borrarHabito: quitarHabito,
    moverGrupo,
    crear,
    crearGrupo,
    renombrarGrupo,
    borrarGrupo,
  };
}

/* Estado de la lista: carga, orden, pestaña y las mutaciones.
 * Tareas y hábitos se tratan igual: ambos tienen grupo, menú y configuración.
 * La lógica de datos vive en `logica/`; aquí solo se guarda y se encadena.
 * La escritura y las acciones de grupo viven en `usarEscritura` y `usarGrupos`,
 * y la disposición de los paneles en `usarPaneles`: esta función orquesta y no
 * reescribe filas ni calcula pestañas. */
import { useCallback, useMemo, useRef, useState } from 'react';
import { aplazadoHasta } from '../logica/aplazos';
import type { Columnas } from '../logica/columnas';
import type { Movimiento } from '../logica/destinoArrastre';
import { fijarFinDia, hoyLogico } from '../logica/fechas';
import { editarHabito } from '../logica/habitos';
import { importanciaDeHabito } from '../logica/importancia';
import { leerGruposArchivados, leerGruposConocidos, leerOrdenPestanas } from '../logica/grupos';
import { CLAVES_VISTA, type ModoOrden } from '../logica/orden';
import { idDeNota, type Panel } from '../logica/paneles';
import { guardarPreferencias, leerPreferencias, type Preferencias } from '../logica/preferencias';
import { subirTodo } from '../logica/preferenciasRemotas';
import type { Pendientes } from '../logica/store';
import { editarTarea } from '../logica/tareas';
import type { Dashboard, RefDependencia, SubHabito } from '../logica/tipos';
import type { NuevaFila } from './NuevaFila';
import type { CambiosFila, Editando, Estado } from './tiposLista';
import { usarAccionesPaneles } from './usarAccionesPaneles';
import { usarEscritura } from './usarEscritura';
import { usarFilas } from './usarFilas';
import { usarGrupos } from './usarGrupos';
import { usarNotas, type AccesoDiario } from './usarNotas';
import { usarCarga } from './usarCarga';
import { usarOrdenCajas, usarPaneles } from './usarPaneles';

export type { CambiosFila, Editando } from './tiposLista';
export { claveFila, valorDe } from './tiposLista';

export interface Lista {
  estado: Estado;
  orden: ModoOrden;
  /** Orden propio de una caja: el suyo si lo tiene, si no el general. */
  ordenDe: (pestana: string) => ModoOrden;
  /** Fija el orden de una sola caja, sin tocar el de las demás. */
  cambiarOrdenCaja: (pestana: string, modo: ModoOrden) => void;
  /** Pestaña activa; `''` es «Tareas» (lo que no tiene grupo). */
  grupo: string;
  /** Paneles de la vista: «Tareas», grupos y notas en el orden guardado, y
   *  «Completados». Es lo único que la vista recorre. */
  paneles: Panel[];
  /** Todas las cajas, también las apagadas (explorador de cajas). */
  todosPaneles: Panel[];
  /** Solo los grupos, por su nombre: para menús que no admiten notas. */
  grupos: string[];
  /** Las cajas en columnas (una pila = varias en la misma columna). */
  columnas: Columnas;
  /** Mueve una caja en vivo: a columna propia junto a otra, o dentro de su pila. */
  moverPanel: (movido: string, movimiento: Movimiento) => void;
  /** Termina un arrastre: aplica el apilado pendiente y fija orden y pilas. */
  soltarPanel: (movido: string, apilado: Movimiento | null) => void;
  /** Renombra un panel: el grupo muda sus filas, la nota cambia su título. */
  renombrarPanel: (panel: Panel, titulo: string) => void;
  /** Crea una nota y devuelve su id de panel para centrarlo. */
  crearNota: () => Promise<string | null>;
  borrarNota: (panel: string) => void;
  /** Saca una nota de las cajas sin borrarla: queda en el archivo. */
  archivarNota: (panel: string) => void;
  /** Saca un grupo de las pestañas sin tocar sus filas. */
  archivarGrupo: (nombre: string) => void;
  /** Vuelve a poner un grupo archivado como pestaña, al final. */
  desarchivarGrupo: (nombre: string) => void;
  /** Grupos archivados, para su panel de archivados. */
  gruposArchivados: string[];
  /** Notas archivadas (id y título) para su panel. */
  notasArchivadas: { id: string; titulo: string }[];
  /** Devuelve una nota archivada a las cajas. */
  recuperarNota: (id: string) => void;
  /** Cuerpo y escritura de una nota, por su id de panel. */
  nota: (panel: string) => { texto: string; escribir: (contenido: string) => void; confirmar: () => void } | null;
  /** Entradas del diario por día: la caja «Diario» las lee y escribe por fecha. */
  diario: AccesoDiario;
  /** Ajustes de lectura: privacidad, fuente, altura y separador. */
  preferencias: Preferencias;
  /** Filas que están saliendo de la lista tras completarse. */
  saliendo: ReadonlySet<string>;
  ajustesAbiertos: boolean;
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
  /** Cambia la lista de subhábitos del padre con una operación sobre la copia viva. */
  operarSubhabitos: (padreId: number, operar: (lista: SubHabito[]) => SubHabito[]) => void;
  /** Mueve una fila de grupo desde el menú de la fila. */
  moverGrupo: (fila: NonNullable<Editando>, grupo: string | null) => void;
  /** Aplaza un hábito hasta `hasta`; `null` le quita el aplazo. */
  aplazar: (fila: NonNullable<Editando>, hasta: string | null) => void;
  /** Orden manual: recibe las filas de una caja ya en su orden nuevo. */
  reordenar: (filas: NonNullable<Editando>[]) => void;
  /** Fija lo que debe hacerse antes de una fila; lista vacía las quita. */
  dependencias: (objetivo: RefDependencia, lista: RefDependencia[]) => void;
  /** Da de alta una tarea o un hábito desde el campo de la lista. */
  crear: (fila: NuevaFila) => void;
  crearGrupo: (nombre: string) => void;
  renombrarGrupo: (viejo: string, nuevo: string) => void;
  borrarGrupo: (nombre: string, conFilas: boolean) => void;
}

/** `avisar` lo pone la vista (su aviso breve): aquí solo llega a las filas. */
export function usarLista(avisar: (texto: string) => void): Lista {
  const preferencias = useMemo(leerPreferencias, []);
  const [orden, setOrden] = useState(preferencias.orden as ModoOrden);
  const [grupo, setGrupo] = useState(preferencias.grupo);
  const [ajustes, setAjustes] = useState<Preferencias>(preferencias);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [editando, setEditando] = useState<Editando>(null);
  // «Hoy» sigue la hora de fin de día: cambiarla en ajustes lo recalcula.
  const hoy = useMemo(() => {
    fijarFinDia(ajustes.finDia);
    return hoyLogico();
  }, [ajustes.finDia]);
  const [gruposConocidos, setGruposConocidos] = useState<string[]>(leerGruposConocidos);
  // Grupos archivados: nombres que no son paneles pero siguen en sus filas.
  const [gruposArchivados, setGruposArchivados] = useState<string[]>(leerGruposArchivados);
  // Orden manual de las pestañas de grupo; vacío = alfabético.
  const [ordenPestanas, setOrdenPestanas] = useState<string[]>(leerOrdenPestanas);
  // Filas completadas que siguen en la lista mientras termina su animación.
  const [saliendo, setSaliendo] = useState<ReadonlySet<string>>(() => new Set());
  // Cambios sin confirmar: la escritura y las altas anotan en el mismo sitio.
  const pendientesRef = useRef<Pendientes>({ tareas: {}, habitos: {} });

  // Última foto de los datos, para que una acción tarde no trabaje sobre una
  // copia vieja: el estado de React no se lee dentro de los manejadores.
  const datosRef = useRef<Dashboard>({ tareas: [], habitos: [], proyectos: [] });
  // La carga necesita `abrirCuenta`, que nace en `usarEscritura`, y esta recibe
  // el estado que crea aquella: el ref rompe el círculo. La carga ocurre en un
  // efecto, ya tras el primer render, así que para entonces está puesto.
  const abrirCuentaRef = useRef<((correo: string) => Pendientes) | null>(null);
  // Siembra del respaldo: en el primer arranque tras actualizar, el servidor
  // todavía no tiene copia de esta vista. Se sube una vez lo que ya está en el
  // equipo para que, si el webview se vacía, haya de dónde volver. Los valores
  // salen del `localStorage` y no de los estados de arriba porque estos se
  // leen una sola vez, antes de esta carga.
  const sembrado = useRef(false);
  const [estado, setEstado] = usarCarga(
    useCallback((correo: string) => abrirCuentaRef.current?.(correo) ?? { tareas: {}, habitos: {} }, []),
    useCallback(() => {
      if (sembrado.current) return;
      sembrado.current = true;
      const leer = (clave: string): unknown => {
        try {
          const crudo = localStorage.getItem(clave);
          return crudo === null ? undefined : (JSON.parse(crudo) as unknown);
        } catch {
          return undefined;
        }
      };
      subirTodo({
        preferencias: leer(CLAVES_VISTA.preferencias),
        orden: leer(CLAVES_VISTA.orden),
        grupos: leer(CLAVES_VISTA.grupos),
      });
    }, []),
  );
  const { anotar, abrirCuenta, escribirTarea, escribirHabito, quitarTarea, quitarHabito } = usarEscritura(
    estado,
    setEstado,
    datosRef,
    pendientesRef,
    avisar,
  );
  abrirCuentaRef.current = abrirCuenta;

  // Las mutaciones de fila (alta, completar, mover, aplazar) viven en
  // `usarFilas`: comparten las mismas dependencias y no tocan los paneles.
  const { anotarGrupo, moverGrupo, crear, completar, aplazar, reordenar, dependencias } = usarFilas({
    datosRef, pendientesRef,
    setEstado,
    setGruposConocidos,
    setSaliendo,
    anotar,
    escribirTarea, escribirHabito, avisar,
    hoy,
  });

  const notas = usarNotas();

  // La caja «Aplazado» solo existe si el ajuste lo permite y hay algo dentro: se
  // pregunta a los datos, no a la pestaña, porque recoge los aplazados de todos
  // los grupos.
  const hayAplazados = useMemo(
    () =>
      ajustes.mostrarAplazados &&
      estado.fase === 'listo' &&
      estado.datos.habitos.some((h) => aplazadoHasta(h, hoy) !== null),
    [estado, hoy, ajustes.mostrarAplazados],
  );

  const paneles = usarPaneles({
    estado,
    ajustes,
    notas: notas.lista,
    gruposConocidos,
    gruposArchivados,
    ordenPestanas,
    setOrdenPestanas,
    setAjustes,
    hayAplazados,
    grupo,
    setGrupo,
  });
  const { ordenDe, cambiarOrdenCaja } = usarOrdenCajas(ajustes, setAjustes, orden);

  const grupos = usarGrupos({
    datosRef,
    setGruposConocidos,
    setOrdenPestanas,
    setGrupo,
    escribirTarea,
    escribirHabito,
    quitarTarea,
    quitarHabito,
    grupoActivo: paneles.grupoActivo,
  });

  const { crearGrupo, renombrarGrupo } = grupos;
  const acciones = usarAccionesPaneles({
    notas,
    paneles,
    grupos,
    ordenPestanas,
    setGruposConocidos,
    setGruposArchivados,
  });

  return {
    estado,
    orden,
    ordenDe,
    cambiarOrdenCaja,
    grupo: paneles.grupoActivo,
    paneles: paneles.paneles,
    todosPaneles: paneles.todos,
    grupos: paneles.grupos,
    columnas: paneles.columnas,
    moverPanel: paneles.moverPanel,
    soltarPanel: paneles.soltarPanel,
    crearNota: notas.crear,
    ...acciones,
    gruposArchivados,
    notasArchivadas: notas.archivadas,
    recuperarNota: notas.recuperar,
    nota: (panel: string) => {
      const id = idDeNota({ id: panel } as Panel);
      if (!id) return null;
      return {
        texto: notas.cuerpos[id] ?? '',
        escribir: (contenido: string) => notas.escribir(id, contenido),
        confirmar: () => notas.confirmar(id),
      };
    },
    diario: notas.diario,
    preferencias: ajustes,
    saliendo,
    ajustesAbiertos,
    hoy,
    cambiarOrden: (modo) => {
      setOrden(modo);
      guardarPreferencias({ orden: modo });
    },
    cambiarGrupo: (nuevo: string) => {
      setGrupo(nuevo);
      guardarPreferencias({ grupo: nuevo });
    },
    moverPestana: paneles.moverPestana,
    // Un solo punto de escritura: el estado local y el `localStorage` no se separan.
    cambiarPreferencias: (cambios) => {
      setAjustes((previas) => ({ ...previas, ...cambios }));
      guardarPreferencias(cambios);
    },
    abrirAjustes: setAjustesAbiertos,
    editando,
    // Un subhábito no abre formulario: sus ajustes están en el del padre.
    abrirEdicion: (fila) => setEditando(fila?.tipo === 'subhabito' ? null : fila),
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
          momentos: cambios.momentos,
          frecuencia: cambios.frecuencia,
        }),
      );
    },
    borrarTarea: quitarTarea,
    borrarHabito: quitarHabito,
    // El subhábito solo existe dentro del payload del padre: cada cambio es un
    // PUT de ese padre. La operación se aplica sobre el hábito vivo y no sobre
    // una copia del modal, así no pisa lo que otra pestaña ya marcó.
    operarSubhabitos: (padreId, operar) => {
      void escribirHabito(padreId, (h) => ({ ...h, subhabitos: operar(h.subhabitos ?? []) }));
    },
    moverGrupo,
    aplazar,
    reordenar,
    dependencias,
    crear,
    crearGrupo,
    renombrarGrupo,
  };
}

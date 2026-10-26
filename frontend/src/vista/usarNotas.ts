/* Estado de las notas y de la operación en curso. Cada nota es una caja del
 * carril (o una pestaña en modo lista), así que aquí vive lo que la vista
 * necesita: la lista, los cuerpos ya cargados y las cuatro acciones.
 *
 * La escritura del cuerpo va con retardo: escribir no debe mandar un PUT por
 * tecla. El retardo se cancela al salir de la nota y se fuerza al cerrar el
 * campo, para que no se pierda la última pulsación. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  archivarNota,
  borrarNota,
  crearNota,
  fechaDeDiario,
  guardarNota,
  leerNotas,
  resumen,
  TITULO_NOTA,
  tituloDiario,
  type Nota,
} from '../logica/notas';

/** Cuánto se espera tras la última tecla antes de guardar. */
const ESPERA_GUARDADO = 600;

/** Lo que la caja «Diario» necesita de una entrada: leer y escribir por día. */
export interface AccesoDiario {
  /** Texto de un día; vacío si todavía no se ha escrito nada. */
  textoDe: (fecha: string) => string;
  escribir: (fecha: string, contenido: string) => void;
  /** Fuerza el guardado pendiente de un día (al cerrar el campo). */
  confirmar: (fecha: string) => void;
}

export interface Notas {
  /** Entradas del diario por día. No son cajas: no entran en `lista`. */
  diario: AccesoDiario;
  /** Resúmenes en orden de carga: id y título, lo que pinta el carril. */
  lista: { id: string; titulo: string }[];
  /** Cuerpo de cada nota, por id; solo las que se han abierto. */
  cuerpos: Record<string, string>;
  cargando: boolean;
  /** La última escritura falló: la caja lo dice sin perder lo escrito. */
  fallo: string | null;
  /** Escribe el cuerpo en memoria y programa el guardado. */
  escribir: (id: string, contenido: string) => void;
  /** Fuerza el guardado pendiente de una nota (al cerrar el campo). */
  confirmar: (id: string) => void;
  renombrar: (id: string, titulo: string) => void;
  /** Crea una nota vacía y devuelve su id para centrar la caja. */
  crear: () => Promise<string | null>;
  borrar: (id: string) => void;
  /** La saca de las cajas sin borrarla: aparece en el panel de archivados. */
  archivar: (id: string) => void;
  /** Archivadas, para su panel: id y título, sin cuerpo. */
  archivadas: { id: string; titulo: string }[];
  /** La devuelve al final de las cajas y la quita de archivadas. */
  recuperar: (id: string) => void;
}

export function usarNotas(): Notas {
  const [lista, setLista] = useState<{ id: string; titulo: string }[]>([]);
  const [cuerpos, setCuerpos] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);
  const [archivadas, setArchivadas] = useState<{ id: string; titulo: string }[]>([]);
  // Temporizadores por nota: cada caja tiene su propia espera.
  const pendientes = useRef(new Map<string, number>());
  // Último texto de cada nota, para mandar lo escrito sin depender del estado.
  const textos = useRef(new Map<string, string>());
  // Diario: texto por día para pintar, id de la nota de cada día y creaciones en
  // curso. Una entrada nace con la primera letra, no al abrir el día.
  const [diarioTextos, setDiarioTextos] = useState<Record<string, string>>({});
  const diarioTexto = useRef(new Map<string, string>());
  const diarioIds = useRef(new Map<string, string>());
  const diarioCreando = useRef(new Map<string, Promise<string | null>>());

  useEffect(() => {
    let vigente = true;
    leerNotas()
      .then((notas) => {
        if (!vigente) return;
        // Las entradas del diario se separan: no son cajas, pero su cuerpo también llega aquí.
        const cajas: Nota[] = [];
        const dias: Record<string, string> = {};
        for (const nota of notas) {
          textos.current.set(nota.id, nota.content);
          const fecha = fechaDeDiario(nota.title);
          if (!fecha) {
            cajas.push(nota);
            continue;
          }
          diarioIds.current.set(fecha, nota.id);
          diarioTexto.current.set(fecha, nota.content);
          dias[fecha] = nota.content;
        }
        setLista(cajas.map(resumen));
        setDiarioTextos(dias);
        // El cuerpo llega con la lista: no hay una segunda petición por caja.
        setCuerpos(Object.fromEntries(notas.map((n) => [n.id, n.content])));
      })
      .catch(() => {
        if (vigente) setFallo('No se pudieron leer las notas.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  // Las archivadas no son cajas: se cargan aparte, solo para su panel.
  useEffect(() => {
    let vigente = true;
    leerNotas(true)
      .then((notas) => {
        if (vigente) setArchivadas(notas.map(resumen));
      })
      .catch(() => {
        if (vigente) setFallo('No se pudieron leer las notas archivadas.');
      });
    return () => {
      vigente = false;
    };
  }, []);

  /** Manda lo escrito; si falla, se dice y el texto sigue en pantalla. */
  const enviar = useCallback(async (id: string) => {
    pendientes.current.delete(id);
    const contenido = textos.current.get(id);
    if (contenido === undefined) return;
    try {
      await guardarNota(id, { contenido });
      setFallo(null);
    } catch {
      setFallo('Una nota no se pudo guardar.');
    }
  }, []);

  const escribir = useCallback(
    (id: string, contenido: string) => {
      textos.current.set(id, contenido);
      setCuerpos((previos) => ({ ...previos, [id]: contenido }));
      const anterior = pendientes.current.get(id);
      if (anterior) window.clearTimeout(anterior);
      pendientes.current.set(id, window.setTimeout(() => void enviar(id), ESPERA_GUARDADO));
    },
    [enviar],
  );

  const confirmar = useCallback(
    (id: string) => {
      const pendiente = pendientes.current.get(id);
      if (!pendiente) return;
      window.clearTimeout(pendiente);
      void enviar(id);
    },
    [enviar],
  );

  // Al desmontar, lo pendiente se manda igual: cerrar la lista no pierde texto.
  useEffect(() => {
    const enCurso = pendientes.current;
    return () => {
      for (const [id, temporizador] of enCurso) {
        window.clearTimeout(temporizador);
        void enviar(id);
      }
    };
  }, [enviar]);

  /** Id de la entrada de un día, creándola si no existe. Se pide una vez por día:
   *  las pulsaciones seguidas esperan a la misma creación y no abren dos notas. */
  const asegurarDiario = useCallback((fecha: string): Promise<string | null> => {
    const id = diarioIds.current.get(fecha);
    if (id) return Promise.resolve(id);
    const enCurso = diarioCreando.current.get(fecha);
    if (enCurso) return enCurso;
    const creacion = crearNota(tituloDiario(fecha))
      .then((nota) => {
        diarioIds.current.set(fecha, nota.id);
        textos.current.set(nota.id, nota.content);
        setCuerpos((previos) => ({ ...previos, [nota.id]: nota.content }));
        return nota.id;
      })
      .catch(() => {
        setFallo('No se pudo crear la entrada del diario.');
        return null;
      })
      .finally(() => diarioCreando.current.delete(fecha));
    diarioCreando.current.set(fecha, creacion);
    return creacion;
  }, []);

  /** Escribe el día: si la entrada ya existe, va por el mismo guardado con retardo
   *  que las notas; si no, primero se crea y luego se guarda lo escrito. */
  const escribirDiario = useCallback(
    (fecha: string, contenido: string) => {
      diarioTexto.current.set(fecha, contenido);
      setDiarioTextos((previos) => ({ ...previos, [fecha]: contenido }));
      const id = diarioIds.current.get(fecha);
      if (id) {
        escribir(id, contenido);
        return;
      }
      // Un día en blanco no crea nota: no ensucia el diario con días vacíos.
      if (!contenido) return;
      void asegurarDiario(fecha).then((nuevo) => {
        if (nuevo) escribir(nuevo, diarioTexto.current.get(fecha) ?? '');
      });
    },
    [escribir, asegurarDiario],
  );

  const confirmarDiario = useCallback(
    (fecha: string) => {
      const id = diarioIds.current.get(fecha);
      if (id) confirmar(id);
    },
    [confirmar],
  );

  const diario = useMemo<AccesoDiario>(
    () => ({
      textoDe: (fecha) => diarioTextos[fecha] ?? '',
      escribir: escribirDiario,
      confirmar: confirmarDiario,
    }),
    [diarioTextos, escribirDiario, confirmarDiario],
  );

  const renombrar = useCallback((id: string, titulo: string) => {
    const limpio = titulo.trim() || TITULO_NOTA;
    setLista((previas) => previas.map((n) => (n.id === id ? { ...n, titulo: limpio } : n)));
    void guardarNota(id, { titulo: limpio }).catch(() => setFallo('Una nota no se pudo renombrar.'));
  }, []);

  const crear = useCallback(async () => {
    try {
      const nota = await crearNota();
      setLista((previas) => [...previas, resumen(nota)]);
      setCuerpos((previos) => ({ ...previos, [nota.id]: nota.content }));
      textos.current.set(nota.id, nota.content);
      return nota.id;
    } catch {
      setFallo('No se pudo crear la nota.');
      return null;
    }
  }, []);

  /** Quita la nota de la vista conservando su cuerpo en memoria: si el archivo
   *  falla, vuelve a donde estaba con lo escrito intacto. */
  const archivar = useCallback(
    (id: string) => {
      const previa = lista.find((n) => n.id === id);
      setLista((previas) => previas.filter((n) => n.id !== id));
      archivarNota(id)
        .then(() => {
          if (previa) setArchivadas((previas) => [...previas, previa]);
          setCuerpos((previos) => {
            const resto = { ...previos };
            delete resto[id];
            return resto;
          });
          textos.current.delete(id);
        })
        .catch(() => {
          // Se deshace la salida: la nota sigue ahí y lo escrito no se perdió.
          if (previa) setLista((previas) => [...previas, previa]);
          setFallo('Una nota no se pudo archivar.');
        });
    },
    [lista],
  );

  /** Vuelve a ser una caja, al final, con el cuerpo que trajo el servidor. Si
   *  falla, sigue en el panel de archivados y se dice. */
  const recuperar = useCallback(
    (id: string) => {
      const previa = archivadas.find((n) => n.id === id);
      setArchivadas((previas) => previas.filter((n) => n.id !== id));
      archivarNota(id, false)
        .then((nota) => {
          setLista((previas) => [...previas, resumen(nota)]);
          setCuerpos((previos) => ({ ...previos, [nota.id]: nota.content }));
          textos.current.set(nota.id, nota.content);
        })
        .catch(() => {
          if (previa) setArchivadas((previas) => [...previas, previa]);
          setFallo('Una nota no se pudo recuperar.');
        });
    },
    [archivadas],
  );

  const borrar = useCallback((id: string) => {
    setLista((previas) => previas.filter((n) => n.id !== id));
    setCuerpos((previos) => {
      const resto = { ...previos };
      delete resto[id];
      return resto;
    });
    textos.current.delete(id);
    void borrarNota(id).catch(() => setFallo('Una nota no se pudo borrar.'));
  }, []);

  return {
    diario,
    lista,
    cuerpos,
    cargando,
    fallo,
    escribir,
    confirmar,
    renombrar,
    crear,
    borrar,
    archivar,
    archivadas,
    recuperar,
  };
}

export type { Nota };

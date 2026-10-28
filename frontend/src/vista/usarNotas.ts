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
  entradaDeDiario,
  guardarNota,
  leerNotas,
  resumen,
  TITULO_NOTA,
  tituloDiario,
  type Nota,
} from '../logica/notas';
import { claveCapitulo, ordenados } from './notasTipos';
import type { AccesoDiario, Notas } from './notasTipos';

export type { AccesoDiario, Notas } from './notasTipos';

/** Cuánto se espera tras la última tecla antes de guardar. */
const ESPERA_GUARDADO = 600;

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
  // Diario: texto por capítulo para pintar, id de la nota de cada capítulo y
  // creaciones en curso. Un capítulo nace con la primera letra, no al abrir el día.
  // Las claves son `día#capítulo`; `diarioCaps` lista los capítulos de cada día.
  const [diarioTextos, setDiarioTextos] = useState<Record<string, string>>({});
  const [diarioCaps, setDiarioCaps] = useState<Record<string, number[]>>({});
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
        const caps: Record<string, number[]> = {};
        for (const nota of notas) {
          textos.current.set(nota.id, nota.content);
          const entrada = entradaDeDiario(nota.title);
          if (!entrada) {
            cajas.push(nota);
            continue;
          }
          const clave = claveCapitulo(entrada.fecha, entrada.capitulo);
          diarioIds.current.set(clave, nota.id);
          diarioTexto.current.set(clave, nota.content);
          dias[clave] = nota.content;
          caps[entrada.fecha] = [...(caps[entrada.fecha] ?? []), entrada.capitulo];
        }
        for (const fecha of Object.keys(caps)) caps[fecha] = ordenados(caps[fecha]);
        setLista(cajas.map(resumen));
        setDiarioTextos(dias);
        setDiarioCaps(caps);
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

  /** Id de un capítulo, creándolo si no existe. Se pide una vez por capítulo:
   *  las pulsaciones seguidas esperan a la misma creación y no abren dos notas. */
  const asegurarCapitulo = useCallback((fecha: string, capitulo: number): Promise<string | null> => {
    const clave = claveCapitulo(fecha, capitulo);
    const id = diarioIds.current.get(clave);
    if (id) return Promise.resolve(id);
    const enCurso = diarioCreando.current.get(clave);
    if (enCurso) return enCurso;
    const creacion = crearNota(tituloDiario(fecha, capitulo))
      .then((nota) => {
        diarioIds.current.set(clave, nota.id);
        textos.current.set(nota.id, nota.content);
        setCuerpos((previos) => ({ ...previos, [nota.id]: nota.content }));
        return nota.id;
      })
      .catch(() => {
        setFallo('No se pudo crear la entrada del diario.');
        return null;
      })
      .finally(() => diarioCreando.current.delete(clave));
    diarioCreando.current.set(clave, creacion);
    return creacion;
  }, []);

  /** Escribe el capítulo: si la entrada ya existe, va por el mismo guardado con
   *  retardo que las notas; si no, primero se crea y luego se guarda lo escrito. */
  const escribirDiario = useCallback(
    (fecha: string, capitulo: number, contenido: string) => {
      const clave = claveCapitulo(fecha, capitulo);
      diarioTexto.current.set(clave, contenido);
      setDiarioTextos((previos) => ({ ...previos, [clave]: contenido }));
      const id = diarioIds.current.get(clave);
      if (id) {
        escribir(id, contenido);
        return;
      }
      // Un capítulo en blanco no crea nota: no ensucia el diario con vacíos.
      if (!contenido) return;
      void asegurarCapitulo(fecha, capitulo).then((nuevo) => {
        if (nuevo) escribir(nuevo, diarioTexto.current.get(clave) ?? '');
      });
    },
    [escribir, asegurarCapitulo],
  );

  const confirmarDiario = useCallback(
    (fecha: string, capitulo: number) => {
      const id = diarioIds.current.get(claveCapitulo(fecha, capitulo));
      if (id) confirmar(id);
    },
    [confirmar],
  );

  /** Añade el capítulo siguiente. Se crea ya, vacío, para que sobreviva a recargar. */
  const nuevoCapitulo = useCallback(
    (fecha: string): number => {
      const numero = Math.max(...(diarioCaps[fecha] ?? [1])) + 1;
      setDiarioCaps((previos) => ({ ...previos, [fecha]: ordenados([...(previos[fecha] ?? []), numero]) }));
      void asegurarCapitulo(fecha, numero);
      return numero;
    },
    [diarioCaps, asegurarCapitulo],
  );

  /** Quita un capítulo: su nota se borra y su texto se olvida. El 1 no desaparece
   *  (`ordenados` lo devuelve), así que un día siempre tiene un capítulo que escribir. */
  const borrarCapitulo = useCallback((fecha: string, capitulo: number) => {
    const clave = claveCapitulo(fecha, capitulo);
    const id = diarioIds.current.get(clave);
    diarioIds.current.delete(clave);
    diarioTexto.current.delete(clave);
    setDiarioTextos((previos) => {
      const resto = { ...previos };
      delete resto[clave];
      return resto;
    });
    setDiarioCaps((previos) => ({
      ...previos,
      [fecha]: ordenados((previos[fecha] ?? [1]).filter((n) => n !== capitulo)),
    }));
    if (!id) return;
    // Lo pendiente de guardar se cancela: escribir después a una nota borrada daría error.
    window.clearTimeout(pendientes.current.get(id));
    pendientes.current.delete(id);
    textos.current.delete(id);
    void borrarNota(id).catch(() => setFallo('Un capítulo no se pudo borrar.'));
  }, []);

  const diario = useMemo<AccesoDiario>(
    () => ({
      capitulos: (fecha) => diarioCaps[fecha] ?? [1],
      // La clave es `fecha#cap`: basta la fecha de las que tienen texto.
      diasEscritos: () => new Set(Object.keys(diarioTextos).filter((c) => diarioTextos[c].trim()).map((c) => c.split('#')[0])),
      textoDe: (fecha, capitulo) => diarioTextos[claveCapitulo(fecha, capitulo)] ?? '',
      escribir: escribirDiario,
      confirmar: confirmarDiario,
      nuevo: nuevoCapitulo,
      borrar: borrarCapitulo,
    }),
    [diarioCaps, diarioTextos, escribirDiario, confirmarDiario, nuevoCapitulo, borrarCapitulo],
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

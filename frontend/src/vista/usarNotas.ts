/* Estado de las notas y de la operación en curso. Cada nota es una caja del
 * carril (o una pestaña en modo lista), así que aquí vive lo que la vista
 * necesita: la lista, los cuerpos ya cargados y las cuatro acciones.
 *
 * La escritura del cuerpo va con retardo: escribir no debe mandar un PUT por
 * tecla. El retardo se cancela al salir de la nota y se fuerza al cerrar el
 * campo, para que no se pierda la última pulsación. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  archivarNota,
  borrarNota,
  crearNota,
  guardarNota,
  leerNotas,
  resumen,
  TITULO_NOTA,
  type Nota,
} from '../logica/notas';

/** Cuánto se espera tras la última tecla antes de guardar. */
const ESPERA_GUARDADO = 600;

export interface Notas {
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
  /** La saca de las cajas sin borrarla: se podrá recuperar desde el archivo. */
  archivar: (id: string) => void;
}

export function usarNotas(): Notas {
  const [lista, setLista] = useState<{ id: string; titulo: string }[]>([]);
  const [cuerpos, setCuerpos] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);
  // Temporizadores por nota: cada caja tiene su propia espera.
  const pendientes = useRef(new Map<string, number>());
  // Último texto de cada nota, para mandar lo escrito sin depender del estado.
  const textos = useRef(new Map<string, string>());

  useEffect(() => {
    let vigente = true;
    leerNotas()
      .then((notas) => {
        if (!vigente) return;
        setLista(notas.map(resumen));
        // El cuerpo llega con la lista: no hay una segunda petición por caja.
        setCuerpos(Object.fromEntries(notas.map((n) => [n.id, n.content])));
        for (const nota of notas) textos.current.set(nota.id, nota.content);
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

  return { lista, cuerpos, cargando, fallo, escribir, confirmar, renombrar, crear, borrar, archivar };
}

export type { Nota };

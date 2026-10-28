/* Modo invitado: la app entera sin cuenta ni servidor. Los datos viven en
 * IndexedDB de este equipo y `pedir` (cliente.ts) les contesta a las mismas
 * rutas que el backend, así que ninguna pantalla sabe en qué modo está.
 * El estado se guarda entero en un solo registro: es poco y evita desajustes. */
import type { Habito, Proyecto, Tarea } from './tipos';
import type { Nota } from './notas';

const CLAVE_MODO = 'tareas-nuevo:v1:modo';
const BASE = 'tareas-invitado';
const ALMACEN = 'estado';

interface Estado {
  tareas: Record<string, Tarea>;
  habitos: Record<string, Habito>;
  proyectos: Proyecto[];
  notas: Record<string, Nota>;
  preferencias: Record<string, unknown>;
}

const vacio = (): Estado => ({ tareas: {}, habitos: {}, proyectos: [], notas: {}, preferencias: {} });

let estado: Estado = vacio();

export const esInvitado = (): boolean => localStorage.getItem(CLAVE_MODO) === 'invitado';

/** Entra o sale del modo invitado; el que sale deja sus datos guardados. */
export function fijarInvitado(activo: boolean): void {
  if (activo) localStorage.setItem(CLAVE_MODO, 'invitado');
  else localStorage.removeItem(CLAVE_MODO);
}

function abrirBase(): Promise<IDBDatabase | null> {
  return new Promise((resolver) => {
    if (typeof indexedDB === 'undefined') return resolver(null);
    const peticion = indexedDB.open(BASE, 1);
    peticion.onupgradeneeded = () => peticion.result.createObjectStore(ALMACEN);
    peticion.onsuccess = () => resolver(peticion.result);
    // Sin IndexedDB (navegación privada, por ejemplo) se sigue en memoria.
    peticion.onerror = () => resolver(null);
  });
}

/** Trae lo guardado a memoria; llamar una vez antes de montar la vista. */
export async function cargarInvitado(): Promise<void> {
  const base = await abrirBase();
  if (!base) return;
  const guardado = await new Promise<Partial<Estado> | undefined>((resolver) => {
    const lectura = base.transaction(ALMACEN).objectStore(ALMACEN).get('datos');
    lectura.onsuccess = () => resolver(lectura.result as Partial<Estado> | undefined);
    lectura.onerror = () => resolver(undefined);
  });
  estado = { ...vacio(), ...guardado };
  base.close();
}

async function guardar(): Promise<void> {
  const base = await abrirBase();
  if (!base) return;
  await new Promise<void>((resolver) => {
    const escritura = base.transaction(ALMACEN, 'readwrite');
    escritura.objectStore(ALMACEN).put(estado, 'datos');
    escritura.oncomplete = () => resolver();
    escritura.onerror = () => resolver();
  });
  base.close();
}

/** Mismo error que el backend, para que la vista lo trate igual. */
function noEncontrada(ruta: string): never {
  // Sin importar `ErrorApi`: cliente.ts importa este archivo y no debe haber ciclo.
  throw Object.assign(new Error(`El modo invitado no sabe «${ruta}»`), { name: 'ErrorApi', estado: 404 });
}

const ahora = (): string => new Date().toISOString();

/** Quita `fecha` de las listas del historial y la pone en la que toca. */
function marcarDia(habito: Habito, fecha: string, estadoDia: string | null): void {
  const sinFecha = (lista?: string[]) => (lista ?? []).filter((dia) => dia !== fecha);
  habito.historialCompletados = sinFecha(habito.historialCompletados);
  habito.historialPospuestos = sinFecha(habito.historialPospuestos);
  if (estadoDia === 'completado') habito.historialCompletados.push(fecha);
  if (estadoDia === 'pospuesto') habito.historialPospuestos.push(fecha);
}

type Cuerpo = Record<string, unknown>;

/** Las rutas de notas: lista paginada, alta, cambio, archivo y borrado. */
function rutaNotas(metodo: string, partes: string[], consulta: URLSearchParams, cuerpo: Cuerpo): unknown {
  const [, id, sub] = partes;
  if (!id) {
    if (metodo === 'GET') {
      const archivadas = consulta.get('archivadas') === 'true';
      const todas = Object.values(estado.notas).filter((nota) => Boolean(nota.archived_at) === archivadas);
      const por = Number(consulta.get('per_page') ?? 100);
      const desde = (Number(consulta.get('page') ?? 1) - 1) * por;
      return { items: todas.slice(desde, desde + por), total: todas.length };
    }
    const nota: Nota = {
      id: crypto.randomUUID(),
      folder_id: null,
      title: String(cuerpo.title ?? 'Nota'),
      content: String(cuerpo.content ?? ''),
      archived_at: null,
      created_at: ahora(),
      updated_at: ahora(),
    };
    estado.notas[nota.id] = nota;
    return nota;
  }
  const nota = estado.notas[id];
  if (!nota) noEncontrada(partes.join('/'));
  if (metodo === 'DELETE') {
    delete estado.notas[id];
    return undefined;
  }
  if (sub === 'archivo') nota.archived_at = cuerpo.archivada ? ahora() : null;
  else {
    if (typeof cuerpo.title === 'string') nota.title = cuerpo.title;
    if (typeof cuerpo.content === 'string') nota.content = cuerpo.content;
  }
  nota.updated_at = ahora();
  return nota;
}

/** Contesta una petición de `pedir` con los datos locales y los guarda. */
export async function pedirInvitado<T>(ruta: string, metodo: string, cuerpoTexto?: string): Promise<T> {
  const [camino, texto = ''] = ruta.split('?');
  const partes = camino.split('/').filter(Boolean);
  const consulta = new URLSearchParams(texto);
  const cuerpo = (cuerpoTexto ? JSON.parse(cuerpoTexto) : {}) as Cuerpo;
  const [recurso, id, sub, fecha] = partes;
  let salida: unknown;

  if (recurso === 'dashboard' && !id) {
    salida = {
      data: {
        tareas: Object.values(estado.tareas),
        habitos: Object.values(estado.habitos),
        proyectos: estado.proyectos,
        configuracion: { preferencias: estado.preferencias },
      },
    };
  } else if (recurso === 'dashboard' && id === 'settings') {
    Object.assign(estado.preferencias, cuerpo.preferencias as Cuerpo);
  } else if (recurso === 'tasks' && id) {
    if (metodo === 'DELETE') delete estado.tareas[id];
    else estado.tareas[id] = { ...(cuerpo.payload as Tarea), id: Number(id) };
    salida = metodo === 'DELETE' ? undefined : { updatedAt: ahora() };
  } else if (recurso === 'habits' && id && !sub) {
    if (metodo === 'DELETE') delete estado.habitos[id];
    else estado.habitos[id] = { ...(cuerpo.payload as Habito), id: Number(id) };
  } else if (recurso === 'habits' && id && sub === 'history') {
    const habito = estado.habitos[id];
    if (!habito) noEncontrada(ruta);
    if (metodo === 'DELETE') marcarDia(habito, fecha, null);
    else marcarDia(habito, String(cuerpo.date), String(cuerpo.status));
  } else if (recurso === 'notes') {
    salida = rutaNotas(metodo, partes, consulta, cuerpo);
  } else {
    noEncontrada(ruta);
  }
  await guardar();
  return salida as T;
}

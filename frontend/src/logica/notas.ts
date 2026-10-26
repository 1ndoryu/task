/* Notas: reutiliza el dominio `notes` que el backend ya tenía (`/api/notes`,
 * con su tabla, servicio y handler) en vez de inventar otro sitio donde
 * guardar texto. La vista solo pide lo justo: listar, crear, renombrar,
 * escribir el cuerpo y borrar. Las carpetas del dominio no se usan aquí: la
 * caja es la carpeta. */
import { pedir } from './cliente';

/** Una nota tal como la devuelve el backend (nombres en `snake_case`). */
export interface Nota {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  /** Cuándo se archivó; `null` mientras está viva. Archivar no borra. */
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Lo que necesita la vista para nombrar una caja sin traerse el cuerpo. */
export interface ResumenNota {
  id: string;
  titulo: string;
}

const TODO = 100;

/** Todas las notas del usuario, sin paginar: aquí la nota *es* una caja, y una
 *  caja que no se ve no existe. El tope del backend es 100 por página.
 *  Archivadas aparte: una nota archivada no es una caja, es historia. */
export async function leerNotas(archivadas = false): Promise<Nota[]> {
  const notas: Nota[] = [];
  for (let pagina = 1; ; pagina++) {
    const parte = await pedir<{ items: Nota[]; total: number }>(
      `/notes?page=${pagina}&per_page=${TODO}&archivadas=${archivadas}`,
    );
    notas.push(...parte.items);
    if (parte.items.length < TODO || notas.length >= parte.total) break;
  }
  return notas;
}

/** Título que se muestra: el de la nota o uno por defecto si está vacío. La
 *  base exige un título, así que una nota «sin título» se guarda como «Nota». */
export const TITULO_NOTA = 'Nota';

export function resumen(nota: Nota): ResumenNota {
  return { id: nota.id, titulo: nota.title.trim() || TITULO_NOTA };
}

/** Una entrada del diario es una nota con título reservado, `diario:AAAA-MM-DD`:
 *  así no hace falta una tabla nueva y las cajas la dejan fuera. Un día puede
 *  tener capítulos: el 1 es el título a secas (así cuadra con lo ya escrito) y
 *  los demás llevan `#n` al final. */
const PREFIJO_DIARIO = 'diario:';
const ENTRADA_DIARIO = /^diario:(\d{4}-\d{2}-\d{2})(?:#(\d+))?$/;

export const tituloDiario = (fecha: string, capitulo = 1): string =>
  capitulo === 1 ? `${PREFIJO_DIARIO}${fecha}` : `${PREFIJO_DIARIO}${fecha}#${capitulo}`;

/** Día y capítulo de una entrada del diario, o `null` si la nota es una caja normal. */
export function entradaDeDiario(titulo: string): { fecha: string; capitulo: number } | null {
  const partes = ENTRADA_DIARIO.exec(titulo);
  return partes ? { fecha: partes[1], capitulo: Number(partes[2] ?? 1) } : null;
}

export async function crearNota(titulo = TITULO_NOTA, contenido = ''): Promise<Nota> {
  return pedir<Nota>('/notes', {
    method: 'POST',
    body: JSON.stringify({ title: titulo, content: contenido, folder_id: null }),
  });
}

/** Escribe título y/o cuerpo. El backend rechaza un título vacío, así que el
 *  vacío se queda en el valor por defecto en vez de fallar. */
export async function guardarNota(
  id: string,
  cambios: { titulo?: string; contenido?: string },
): Promise<Nota> {
  const cuerpo: Record<string, string> = {};
  if (cambios.titulo !== undefined) cuerpo.title = cambios.titulo.trim() || TITULO_NOTA;
  if (cambios.contenido !== undefined) cuerpo.content = cambios.contenido;
  return pedir<Nota>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
}

/** Archiva o recupera. La nota no se pierde: deja de ser una caja y pasa a la
 *  lista de archivadas, que se verá cuando haya dónde verla. */
export async function archivarNota(id: string, archivada = true): Promise<Nota> {
  return pedir<Nota>(`/notes/${id}/archivo`, {
    method: 'PUT',
    body: JSON.stringify({ archivada }),
  });
}

export async function borrarNota(id: string): Promise<void> {
  await pedir<void>(`/notes/${id}`, { method: 'DELETE' });
}

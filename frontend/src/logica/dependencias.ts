/* Dependencias entre filas: «esto va antes que aquello». Una tarea o un hábito
 * guarda en su payload la lista de lo que debe estar hecho primero. Lógica
 * pura, sin importar otros módulos de valor para poder probarla. */
import type { Dashboard, RefDependencia } from './tipos';

/** Clave de una fila en el DOM y en el mapa de hilos: `tarea12`, `habito5`. */
export function claveDep(ref: RefDependencia): string {
  return `${ref.tipo}${ref.id}`;
}

/** Lee lo guardado descartando lo que no sea una referencia válida (el legacy
 *  añadió campos que aquí no hacen falta y datos viejos pueden venir rotos). */
export function leerDependencias(crudo: unknown): RefDependencia[] {
  if (!Array.isArray(crudo)) return [];
  const vistas = new Set<string>();
  const lista: RefDependencia[] = [];
  for (const r of crudo as Record<string, unknown>[]) {
    const tipo = r?.tipo;
    if ((tipo !== 'tarea' && tipo !== 'habito') || typeof r.id !== 'number') continue;
    const ref: RefDependencia = { tipo, id: r.id };
    if (vistas.has(claveDep(ref))) continue;
    vistas.add(claveDep(ref));
    lista.push(ref);
  }
  return lista;
}

/** Marca o desmarca una dependencia: si ya está, la quita. */
export function alternarDependencia(lista: RefDependencia[], ref: RefDependencia): RefDependencia[] {
  const clave = claveDep(ref);
  return lista.some((r) => claveDep(r) === clave) ? lista.filter((r) => claveDep(r) !== clave) : [...lista, ref];
}

/** Dependencias de una fila del tablero, o `[]` si no existe. */
export function dependenciasDe(datos: Dashboard, ref: RefDependencia): RefDependencia[] {
  const crudo = ref.tipo === 'tarea' ? datos.tareas.find((t) => t.id === ref.id)?.dependencias : datos.habitos.find((h) => h.id === ref.id)?.dependencias;
  return leerDependencias(crudo);
}

/** Si apuntar `origen` → `destino` cierra un ciclo: ocurre cuando `destino` ya
 *  depende, directa o indirectamente, de `origen` (o es el mismo). */
export function cierraCiclo(datos: Dashboard, origen: RefDependencia, destino: RefDependencia): boolean {
  const meta = claveDep(origen);
  const pendientes = [destino];
  const vistos = new Set<string>();
  while (pendientes.length) {
    const actual = pendientes.pop() as RefDependencia;
    const clave = claveDep(actual);
    if (clave === meta) return true;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    pendientes.push(...dependenciasDe(datos, actual));
  }
  return false;
}

/** Los hilos que hay que pintar: cada par «fila → lo que debe ir antes» con el
 *  requisito aún sin hacer. `hecho` dice si un requisito está cumplido y
 *  devuelve `undefined` si ya no existe (se ignora, no bloquea). */
export function hilosPendientes(
  datos: Dashboard,
  hecho: (ref: RefDependencia) => boolean | undefined,
): { desde: RefDependencia; hasta: RefDependencia }[] {
  const hilos: { desde: RefDependencia; hasta: RefDependencia }[] = [];
  const filas: RefDependencia[] = [
    ...datos.tareas.filter((t) => !t.completado).map((t) => ({ tipo: 'tarea' as const, id: t.id })),
    ...datos.habitos.map((h) => ({ tipo: 'habito' as const, id: h.id })),
  ];
  for (const desde of filas) {
    for (const hasta of dependenciasDe(datos, desde)) {
      if (hecho(hasta) === false) hilos.push({ desde, hasta });
    }
  }
  return hilos;
}

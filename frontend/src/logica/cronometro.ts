/* Cronómetro de una fila: el tiempo que se le dedica, en el equipo.
 *
 * Es el modelo del legacy (`stores/timeTrackerStore.ts`), sin zustand: una
 * sesión con su instante de inicio, sus pausas y un ajuste manual, y el tiempo
 * efectivo se calcula con la hora del sistema. Así el reloj sigue corriendo
 * aunque la app esté cerrada, y una recarga no pierde ni un segundo.
 *
 * Vive en `localStorage` porque es una medida del equipo, no un dato de la
 * cuenta: el servidor no tiene campo de tiempo, igual que en el legacy. */

/** Tarea o hábito; el subhábito se mide contra su padre, que es donde vive. */
export type EntidadMedida = 'tarea' | 'habito';

export interface Pausa {
  /** Instante en ms; `fin` falta mientras la pausa sigue abierta. */
  inicio: number;
  fin?: number;
}

export interface Sesion {
  tipo: EntidadMedida;
  id: number;
  /** Nombre de la fila al empezar: la pastilla lo lee aunque la fila ya no esté. */
  nombre: string;
  inicio: number;
  fin?: number;
  pausas: Pausa[];
  /** Corrección a mano, en ms (negativa resta). */
  ajusteMs: number;
  /** Objetivo en minutos; 0 es sin objetivo. */
  objetivoMin: number;
}

export interface Cronometro {
  /** La sesión en curso; `null` si no hay ninguna. */
  sesion: Sesion | null;
  /** Pausada: la sesión sigue, pero el tiempo no avanza. */
  pausado: boolean;
}

export const SIN_CRONOMETRO: Cronometro = { sesion: null, pausado: false };

const CLAVE = 'tareas-nuevo:v1:cronometro';

/** Lo que marcaría el reloj sin el ajuste: desde el inicio hasta ahora, menos
 *  lo que estuvo en pausa. */
function tiempoBase(sesion: Sesion, ahora: number): number {
  const bruto = (sesion.fin ?? ahora) - sesion.inicio;
  const pausado = sesion.pausas.reduce((total, pausa) => total + ((pausa.fin ?? ahora) - pausa.inicio), 0);
  return bruto - pausado;
}

/** Tiempo efectivo en ms: la base más el ajuste, nunca negativo. */
export function tiempoEfectivo(sesion: Sesion, ahora: number): number {
  return Math.max(0, tiempoBase(sesion, ahora) + sesion.ajusteMs);
}

/** `MM:SS`, o `HH:MM:SS` pasada la hora, como el legacy. */
export function formatearTiempo(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const reloj = (n: number) => String(n).padStart(2, '0');
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  return horas > 0 ? `${reloj(horas)}:${reloj(minutos)}:${reloj(segundos)}` : `${reloj(minutos)}:${reloj(segundos)}`;
}

/** Una sesión nueva arrancando ahora. */
export function empezar(tipo: EntidadMedida, id: number, nombre: string, ahora = Date.now()): Cronometro {
  // `fin` y `ajusteMs: 0` van explícitos: el tipo los pide, y así la sesión
  // guardada no depende de valores por defecto al releerla.
  const sesion: Sesion = { tipo, id, nombre, inicio: ahora, fin: undefined, pausas: [], ajusteMs: 0, objetivoMin: 0 };
  return { sesion, pausado: false };
}

export function pausar(c: Cronometro, ahora = Date.now()): Cronometro {
  // Solo una sesión que corre se pausa; pausar dos veces no abre dos pausas.
  if (!c.sesion || c.pausado) return c;
  return { sesion: { ...c.sesion, pausas: [...c.sesion.pausas, { inicio: ahora }] }, pausado: true };
}

export function reanudar(c: Cronometro, ahora = Date.now()): Cronometro {
  if (!c.sesion || !c.pausado) return c;
  const pausas = c.sesion.pausas.map((pausa, i) => (i === c.sesion!.pausas.length - 1 && pausa.fin === undefined ? { ...pausa, fin: ahora } : pausa));
  return { sesion: { ...c.sesion, pausas }, pausado: false };
}

/** Cierra la sesión con su tiempo total y la quita: lo que queda es `null`. */
export function cerrar(c: Cronometro, ahora = Date.now()): Sesion | null {
  if (!c.sesion) return null;
  // Una pausa abierta se cierra al cerrar: si no, contaría hasta el infinito.
  const pausas = c.sesion.pausas.map((pausa) => (pausa.fin === undefined ? { ...pausa, fin: ahora } : pausa));
  return { ...c.sesion, pausas, fin: ahora };
}

/** La vista cierra la sesión al completar la fila que mide: el reloj de una
 *  tarea hecha no sigue sumando. Devuelve la sesión cerrada (con su tiempo) o
 *  `null` si no era esa. */
export function cerrarSiMide(c: Cronometro, tipo: EntidadMedida, id: number, ahora = Date.now()): Sesion | null {
  return mideA(c, tipo, id) ? cerrar(c, ahora) : null;
}

/** Suma o resta tiempo al total corriendo; el ajuste es lo que lo recuerda.
 *  Se guarda como diferencia sobre lo que marcaría el reloj: así sigue valiendo
 *  cuando el tiempo continúe, y restar de más se queda en cero en vez de deber
 *  segundos al reloj. */
export function ajustar(c: Cronometro, deltaMs: number, ahora = Date.now()): Cronometro {
  if (!c.sesion || deltaMs === 0) return c;
  const objetivo = Math.max(0, tiempoEfectivo(c.sesion, ahora) + deltaMs);
  return { sesion: { ...c.sesion, ajusteMs: objetivo - tiempoBase(c.sesion, ahora) }, pausado: c.pausado };
}

/** Si la sesión mide esa fila: lo usa la fila para pintarse en marcha. */
export function mideA(c: Cronometro, tipo: EntidadMedida, id: number): boolean {
  return c.sesion?.tipo === tipo && c.sesion.id === id;
}

/* --- lectura y escritura ------------------------------------------------- */

/** Una sesión guardada vale si tiene lo justo para calcular el tiempo; lo demás
 *  se descarta en vez de romper la pastilla. */
function leerSesion(crudo: unknown): Sesion | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const s = crudo as Partial<Sesion>;
  if (s.tipo !== 'tarea' && s.tipo !== 'habito') return null;
  if (typeof s.id !== 'number' || typeof s.inicio !== 'number' || typeof s.nombre !== 'string') return null;
  const pausas = Array.isArray(s.pausas)
    ? s.pausas.filter((p): p is Pausa => !!p && typeof p === 'object' && typeof (p as Pausa).inicio === 'number')
    : [];
  return {
    tipo: s.tipo,
    id: s.id,
    nombre: s.nombre,
    inicio: s.inicio,
    fin: typeof s.fin === 'number' ? s.fin : undefined,
    pausas: pausas.map((p) => ({ inicio: p.inicio, ...(typeof p.fin === 'number' ? { fin: p.fin } : {}) })),
    ajusteMs: typeof s.ajusteMs === 'number' ? s.ajusteMs : 0,
    objetivoMin: typeof s.objetivoMin === 'number' ? s.objetivoMin : 0,
  };
}

export function leerCronometro(): Cronometro {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return SIN_CRONOMETRO;
    const datos = JSON.parse(crudo) as { sesion?: unknown; pausado?: unknown };
    const sesion = leerSesion(datos.sesion);
    if (!sesion) return SIN_CRONOMETRO;
    // Una sesión ya cerrada no vuelve a la pastilla: se descarta como las viejas.
    if (sesion.fin !== undefined) return SIN_CRONOMETRO;
    return { sesion, pausado: datos.pausado === true };
  } catch {
    return SIN_CRONOMETRO;
  }
}

export function guardarCronometro(c: Cronometro): void {
  if (!c.sesion) localStorage.removeItem(CLAVE);
  else localStorage.setItem(CLAVE, JSON.stringify(c));
}

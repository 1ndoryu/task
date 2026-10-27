/* Paneles de la vista: lo que la lista pinta, sea una caja del carril o una
 * pestaña. Un panel tiene un tipo y un id estable; la vista no pregunta por
 * clases ni por forma, solo por `tipo`.
 *
 * Añadir un tipo de caja nuevo = añadir un valor a `TipoPanel`, un constructor
 * en `panelesDe` y su vista. Nada de lo demás cambia.
 *
 * El orden es una sola lista de ids, con los mismos nombres que el panel: los
 * grupos por su nombre, las notas por `nota:<id>` y los de sistema por su id
 * fijo (`''`, `sistema:*`, `completados`). Todos se arrastran, también los de
 * sistema: lo único que no se puede de ellos es renombrarlos o borrarlos, y
 * eso lo dice `fija`, que solo habla de la identidad, no del sitio.
 * Lógica pura: sin React y sin tocar el `localStorage`. */
import type { ResumenNota } from './notas';
import { PESTANA_COMPLETADOS, type Grupo } from './orden';
import type { Proyecto } from './tipos';

/** Qué pinta un panel. Cada tipo trae su propia vista y sus propias acciones. */
export type TipoPanel = 'tareas' | 'habitos' | 'completados' | 'nota' | 'aplazados' | 'diario';

/** Prefijo del id de los paneles que no son grupos: así un grupo no puede
 *  llamarse igual que una nota y el orden guardado no se confunde. */
export const PREFIJO_NOTA = 'nota:';
/** Panel de hábitos: separa la caja «Tareas» en dos. Lleva prefijo de sistema
 *  para que un grupo con ese nombre no choque con él. */
export const PANEL_HABITOS = 'sistema:habitos';
/** Panel de lo aplazado. No es una pestaña de nada: recoge los hábitos de
 *  todos los grupos cuya vuelta aún no ha llegado. */
export const PANEL_APLAZADOS = 'sistema:aplazados';
/** Panel del diario: una caja con una entrada por día, movida con ← y →. */
export const PANEL_DIARIO = 'sistema:diario';
/** Pestaña «Archivados» del modo sin separar: no es un panel de la lista, sino la
 *  vista de lo archivado. Sin prefijo de nota ni de grupo, y con prefijo de sistema. */
export const PANEL_ARCHIVADOS = 'sistema:archivados';

export interface Panel {
  /** Id estable: `''` (Tareas), el nombre del grupo, `completados`, `nota:<id>`. */
  id: string;
  tipo: TipoPanel;
  /** Nombre visible. En los paneles de nota es el título de la nota. */
  etiqueta: string;
  /** Panel de sistema: no se renombra ni se borra. Del sitio no habla esto:
   *  también se arrastra, como cualquier otro (`mueve` dice los que hoy se
   *  pueden mover, que por ahora son todos). */
  fija: boolean;
  /** Se puede cambiar de sitio. Separado de `fija` porque una caja puede ser de
   *  sistema y aun así moverse: antes iban juntos y «Tareas» quedaba clavada. */
  mueve: boolean;
  /** Grupo de ejecución que filtra la caja; `null` donde no filtra. */
  grupo: Grupo;
  /** Proyecto que filtra la caja: sus tareas, de cualquier grupo. Ausente en el resto. */
  proyectoId?: number;
}

/** Un panel de nota tal como lo ve esta capa: lo justo para nombrarlo. */
export type NotaResumen = ResumenNota;

/** Prefijo del id de la pestaña de un proyecto (21AC-1): una pestaña por proyecto. */
export const PREFIJO_PROYECTO = 'proyecto:';

export const panelDeNota = (id: string) => `${PREFIJO_NOTA}${id}`;
export const panelDeProyecto = (id: number) => `${PREFIJO_PROYECTO}${id}`;

/** Id de nota de un panel, o `null` si no es una nota. */
export function idDeNota(panel: Panel): string | null {
  return panel.id.startsWith(PREFIJO_NOTA) ? panel.id.slice(PREFIJO_NOTA.length) : null;
}

/** Los paneles en el orden guardado: los de sistema y los demás en una sola
 *  lista, porque todos se arrastran. Lo que no está en el orden guardado entra
 *  al final en su sitio de fábrica: los de sistema primero (Tareas, Hábitos,
 *  Aplazado) y luego los grupos y notas en alfabético. Así una lista vieja
 *  —guardada antes de que los de sistema se movieran— sigue abriendo igual que
 *  antes. */
export function panelesDe(
  gruposDeFilas: Iterable<Grupo>,
  gruposConocidos: Iterable<string>,
  notas: Iterable<NotaResumen>,
  ordenGuardado: Iterable<string> = [],
  /** Grupos archivados: siguen en sus filas, pero no son paneles. */
  archivados: Iterable<string> = [],
  /** Partir «Tareas» en dos: lo suelto por un lado y los hábitos sin grupo por
   *  otro. El panel de hábitos es de sistema, así que va pegado a «Tareas». */
  separarHabitos = false,
  /** Hay hábitos aplazados: la caja «Aplazado» solo existe mientras haya algo
   *  dentro. Vacía no se pinta, y así no ocupa sitio en la vista de nadie. */
  hayAplazados = false,
  /** La caja «Completados» se puede esconder: apagada no es un panel, y su
   *  pestaña desaparece con ella. */
  mostrarCompletados = true,
  /** La caja «Diario» se puede esconder, igual que «Completados». */
  mostrarDiario = false,
  /** Proyectos con pestaña propia: sus tareas salen ahí y no en «Tareas». */
  proyectos: Iterable<Proyecto> = [],
): Panel[] {
  const grupos = new Set<string>(gruposConocidos);
  for (const grupo of gruposDeFilas) if (grupo) grupos.add(grupo);
  for (const nombre of archivados) grupos.delete(nombre);
  const listaNotas = new Map<string, string>();
  for (const nota of notas) listaNotas.set(panelDeNota(nota.id), nota.titulo);

  const porId = new Map<string, Panel>();
  for (const nombre of grupos) {
    porId.set(nombre, { id: nombre, tipo: 'tareas', etiqueta: nombre, fija: false, mueve: true, grupo: nombre });
  }
  for (const [id, titulo] of listaNotas) {
    porId.set(id, { id, tipo: 'nota', etiqueta: titulo, fija: false, mueve: true, grupo: null });
  }
  for (const proyecto of proyectos) {
    const id = panelDeProyecto(proyecto.id);
    porId.set(id, { id, tipo: 'tareas', etiqueta: proyecto.nombre, fija: false, mueve: true, grupo: null, proyectoId: proyecto.id });
  }
  // Los de sistema aparte: sin orden guardado van delante, en este orden de
  // fábrica, y los grupos y notas detrás, alfabéticos.
  const sistema: Panel[] = [
    { id: '', tipo: 'tareas', etiqueta: 'Tareas', fija: true, mueve: true, grupo: null },
    ...(separarHabitos
      ? [{ id: PANEL_HABITOS, tipo: 'habitos' as const, etiqueta: 'Hábitos', fija: true, mueve: true, grupo: null }]
      : []),
    ...(hayAplazados
      ? [{ id: PANEL_APLAZADOS, tipo: 'aplazados' as const, etiqueta: 'Aplazado', fija: true, mueve: true, grupo: null }]
      : []),
    ...(mostrarCompletados
      ? [
          // Sin grupo: este panel no filtra por grupo, recoge lo hecho de todos.
          // Si llevara uno, `seleccionar` no Marcaría la pestaña de completados.
          {
            id: PESTANA_COMPLETADOS,
            tipo: 'completados' as const,
            etiqueta: 'Completados',
            fija: true,
            mueve: true,
            grupo: null,
          },
        ]
      : []),
    ...(mostrarDiario
      ? [{ id: PANEL_DIARIO, tipo: 'diario' as const, etiqueta: 'Diario', fija: true, mueve: true, grupo: null }]
      : []),
  ];
  for (const panel of sistema) porId.set(panel.id, panel);

  const guardados = [...new Set(ordenGuardado)].filter((id) => porId.has(id));
  const sinSitio = [...porId.values()].filter((panel) => !guardados.includes(panel.id));
  // Los de sistema conservan su orden de fábrica; los demás van alfabéticos.
  const deSistema = sistema.filter((panel) => sinSitio.includes(panel));
  const resto = sinSitio
    .filter((panel) => !panel.fija)
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
  return [...guardados.map((id) => porId.get(id) as Panel), ...deSistema, ...resto];
}

/** Mueve un panel a una posición de la lista completa. El índice es el de esa
 *  lista, que es el mismo espacio que usa el carril al soltar. Un índice fuera
 *  de rango se recorta. */
export function moverA(orden: string[], movido: string, indice: number): string[] {
  const desde = orden.indexOf(movido);
  if (desde < 0) return orden;
  const nuevo = [...orden];
  nuevo.splice(desde, 1);
  nuevo.splice(Math.min(nuevo.length, Math.max(0, indice)), 0, movido);
  return nuevo;
}

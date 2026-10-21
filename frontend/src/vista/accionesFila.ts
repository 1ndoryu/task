/* Lo que una fila ofrece en su menú contextual y las acciones que la vista le
 * pasa. Separa el «qué se puede hacer» del componente que lo pinta. */
import type { OpcionMenu } from './Menu';
import type { Editando } from './usarLista';

export interface AccionesFila {
  completar: (fila: NonNullable<Editando>) => void;
  editar: (fila: NonNullable<Editando>) => void;
  borrar: (fila: NonNullable<Editando>) => void;
  prioridad: (fila: NonNullable<Editando>, prioridad: string | null) => void;
  mover: (fila: NonNullable<Editando>, grupo: string | null) => void;
}

/* Las cinco prioridades del `payload` (la importancia del hábito usa la misma
 * escala); el menú de la fila las ofrece como elección rápida. */
const PRIORIDADES = [
  { id: 'muy_alta', etiqueta: 'Muy alta' },
  { id: 'alta', etiqueta: 'Alta' },
  { id: 'media', etiqueta: 'Media' },
  { id: 'baja', etiqueta: 'Baja' },
  { id: 'muy_baja', etiqueta: 'Muy baja' },
];

/** Prioridad o importancia según el tipo de fila. */
export function prioridadDe(fila: NonNullable<Editando>): string {
  return (fila.tipo === 'tarea' ? fila.tarea.prioridad : fila.habito.importancia) ?? 'media';
}

export function grupoDe(fila: NonNullable<Editando>): string | null {
  return (fila.tipo === 'tarea' ? fila.tarea.grupoEjecucion : fila.habito.grupoEjecucion) ?? null;
}

/** Menú de una fila: lo justo para no salir de la lista. Vale para tarea y hábito.
 * Las categorías abren su propio panel al lado, como el menú del front original:
 * así la primera lista se queda en cinco entradas pase lo que pase. */
export function opcionesFila(fila: NonNullable<Editando>, grupos: string[]): OpcionMenu[] {
  const actual = prioridadDe(fila);
  const grupoActual = grupoDe(fila);
  const nombre = fila.tipo === 'tarea' ? 'la tarea' : 'el hábito';
  return [
    { id: 'editar', etiqueta: `Configurar ${nombre}`, accion: true },
    {
      id: 'grupo',
      etiqueta: 'Grupo',
      hijos: [
        { id: 'grupo-', etiqueta: 'Sin grupo', activo: grupoActual === null },
        // Solo los grupos que ya existen: mover es elegir, no inventar.
        ...grupos.map((grupo) => ({
          id: `grupo-${grupo}`,
          etiqueta: grupo,
          activo: grupoActual === grupo,
        })),
      ],
    },
    {
      id: 'prioridad',
      etiqueta: 'Prioridad',
      hijos: PRIORIDADES.map((p) => ({
        id: `prioridad-${p.id}`,
        etiqueta: p.etiqueta,
        activo: actual === p.id,
      })),
    },
    { id: 'borrar', etiqueta: `Eliminar ${nombre}`, accion: true, peligro: true },
  ];
}
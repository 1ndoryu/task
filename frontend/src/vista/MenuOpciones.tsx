/* Iconos y constructores de opciones de los menús. Vive aparte de
 * `accionesFila` porque el alta rápida también los usa, y aquel archivo no debe
 * arrastrar componentes para poder probarse sin pintar nada.
 * Cada opción lleva su trazo: en una lista de texto monoespaciado, el icono es
 * lo que se reconoce antes de leer. */
import type { ReactNode } from 'react';
import type { NivelPrioridad } from '../logica/importancia';
import type { ColoresNivel } from '../logica/preferencias';
import { IconoCarpeta } from './Iconos';
import type { OpcionMenu } from './Menu';
import { PRIORIDADES } from './opcionesFila';

/* Iconos propios de las opciones, en el mismo trazo de 2px que el resto de la
 * vista. Los genéricos (editar, borrar, hábito, tarea, carpeta) ya están en
 * `Iconos.tsx`. */
function Trazo({ children }: { children: ReactNode }) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Lápiz: configurar la fila. */
export function IconoEditar() {
  return (
    <Trazo>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="M14.5 6.5l3 3" />
    </Trazo>
  );
}

/** Papelera: eliminar la fila. */
export function IconoBorrar() {
  return (
    <Trazo>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
      <path d="M10 11v5M14 11v5" />
    </Trazo>
  );
}

/** Carpeta vacía: «sin grupo». */
export function IconoSinGrupo() {
  return (
    <Trazo>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17.5z" />
      <path d="M9.5 12.5h5" />
    </Trazo>
  );
}

/** Flecha que baja a una línea: orden manual, el que pone la usuaria. */
export function IconoOrdenManual() {
  return (
    <Trazo>
      <path d="M4 6h10M4 12h7M4 18h4" />
      <path d="M17 9v9M14 15l3 3 3-3" />
    </Trazo>
  );
}

/** Brújula de agujas: el orden que decide la app. */
export function IconoOrdenInteligente() {
  return (
    <Trazo>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </Trazo>
  );
}

/** Calendario: la fecha límite. */
export function IconoFecha() {
  return (
    <Trazo>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10.5h17" />
    </Trazo>
  );
}

/** Barras de nivel: ordenar por prioridad. */
export function IconoPrioridad() {
  return (
    <Trazo>
      <path d="M5 20V14M12 20V9M19 20V4" />
    </Trazo>
  );
}

/** Grupos con el suyo marcado. La carpeta delata que es un cajón, no un
 * valor más de la línea. */
export function gruposMenu(grupos: string[], actual: string | null): OpcionMenu[] {
  return [
    { id: 'grupo-', etiqueta: 'Sin grupo', activo: actual === null, icono: <IconoSinGrupo /> },
    // Solo los grupos que ya existen: mover es elegir, no inventar.
    ...grupos.map((nombre) => ({
      id: `grupo-${nombre}`,
      etiqueta: nombre,
      activo: actual === nombre,
      icono: <IconoCarpeta />,
    })),
  ];
}

/** Los cinco niveles con su círculo de color; el vigente lo confirma el aro. */
export function prioridadesMenu(colores: ColoresNivel, actual?: string): OpcionMenu[] {
  return PRIORIDADES.map((nivel) => ({
    id: `prioridad-${nivel.id}`,
    etiqueta: nivel.etiqueta,
    color: colores[nivel.id as NivelPrioridad],
    activo: actual === nivel.id,
  }));
}

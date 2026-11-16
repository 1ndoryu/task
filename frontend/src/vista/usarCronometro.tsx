/* El cronómetro de la vista: una sesión a la vez, con su pausa y su pastilla.
 *
 * La lógica vive en `logica/cronometro.ts`; aquí se guarda el estado, se
 * persiste en cada cambio y se reparte por contexto, porque la pastilla y todas
 * las filas lo comparten sin pasarlo de mano en mano por cada caja.
 *
 * El reloj de un segundo NO vive en este estado: si viviera aquí, cada tic
 * repintaría la lista entera. Late cada componente que necesita el número —la
 * pastilla y la fila medida—, que son uno cada uno. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  SIN_CRONOMETRO,
  ajustar,
  cerrarSiMide,
  empezar,
  formatearTiempo,
  guardarCronometro,
  leerCronometro,
  mideA,
  pausar,
  reanudar,
  tiempoEfectivo,
  type Cronometro,
  type EntidadMedida,
} from '../logica/cronometro';

export interface ControlCronometro {
  /** La sesión en curso; `null` si no hay ninguna. */
  sesion: Cronometro['sesion'];
  pausado: boolean;
  /** Arranca con esa fila; si había otra, la otra se cierra antes. */
  iniciar: (tipo: EntidadMedida, id: number, nombre: string) => void;
  pausar: () => void;
  reanudar: () => void;
  /** Completa la fila medida y cierra el reloj. */
  completar: () => void;
  cancelar: () => void;
  ajustar: (deltaMs: number) => void;
  /** Si la sesión en curso mide esa fila. */
  mide: (tipo: EntidadMedida, id: number) => boolean;
  /** Cierra la sesión si medía esa fila; lo llama completar de una fila. */
  cerrarSiMide: (tipo: EntidadMedida, id: number) => void;
}

const Contexto = createContext<ControlCronometro | null>(null);

/** Crea el estado del cronómetro. `completarFila` es la marca de la vista: al
 *  cerrar desde la pastilla, la fila se completa como si se hubiera pulsado.
 *  Devuelve `false` si no se pudo —un requisito sin hacer—: entonces el reloj
 *  sigue, porque la fila sigue pendiente. */
export function usarCronometro(completarFila: (tipo: EntidadMedida, id: number) => boolean): ControlCronometro {
  const [cronometro, setCronometro] = useState<Cronometro>(leerCronometro);
  // El último estado, para leerlo dentro de los manejadores sin recrearlos.
  const actual = useRef(cronometro);
  actual.current = cronometro;

  // Cada cambio se guarda: una recarga no pierde la sesión ni su pausa.
  const aplicar = useCallback((cambio: (c: Cronometro) => Cronometro) => {
    setCronometro((previo) => {
      const siguiente = cambio(previo);
      if (siguiente !== previo) guardarCronometro(siguiente);
      return siguiente;
    });
  }, []);

  const iniciar = useCallback(
    (tipo: EntidadMedida, id: number, nombre: string) => aplicar((c) => (mideA(c, tipo, id) ? c : empezar(tipo, id, nombre))),
    [aplicar],
  );

  const cerrarSesion = useCallback(
    (completar: boolean) => {
      const abierta = actual.current.sesion;
      if (!abierta) return;
      // Completa primero: si la vista lo rechaza, el reloj sigue corriendo.
      if (completar && !completarFila(abierta.tipo, abierta.id)) return;
      guardarCronometro(SIN_CRONOMETRO);
      actual.current = SIN_CRONOMETRO;
      setCronometro(SIN_CRONOMETRO);
    },
    [completarFila],
  );

  const cerrarSiMideFila = useCallback((tipo: EntidadMedida, id: number) => {
    if (!cerrarSiMide(actual.current, tipo, id)) return;
    guardarCronometro(SIN_CRONOMETRO);
    actual.current = SIN_CRONOMETRO;
    setCronometro(SIN_CRONOMETRO);
  }, []);

  return useMemo<ControlCronometro>(
    () => ({
      sesion: cronometro.sesion,
      pausado: cronometro.pausado,
      iniciar,
      pausar: () => aplicar((c) => pausar(c)),
      reanudar: () => aplicar((c) => reanudar(c)),
      completar: () => cerrarSesion(true),
      cancelar: () => cerrarSesion(false),
      ajustar: (deltaMs: number) => aplicar((c) => ajustar(c, deltaMs)),
      mide: (tipo, id) => mideA(actual.current, tipo, id),
      cerrarSiMide: cerrarSiMideFila,
    }),
    [cronometro, aplicar, iniciar, cerrarSesion, cerrarSiMideFila],
  );
}

/** Reparte el control por contexto. Las filas y la pastilla lo leen solos. */
export function ProveedorCronometro({ control, children }: { control: ControlCronometro; children: ReactNode }) {
  return <Contexto.Provider value={control}>{children}</Contexto.Provider>;
}

/** El control del cronómetro; fuera del proveedor no hay pastilla ni play en
 *  la fila, así que el gancho es tolerante a propósito. */
export function usarCronometroDeVista(): ControlCronometro | null {
  return useContext(Contexto);
}

/** Milisegundos de la sesión, al día cada segundo mientras corre. Lo usa cada
 *  componente que enseña el tiempo: el latido no sube a la lista. */
export function usarTiempoCronometro(sesion: Cronometro['sesion'], pausado: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());
  const inicio = sesion?.inicio ?? 0;
  useEffect(() => {
    setAhora(Date.now());
    if (!inicio || pausado) return;
    const latido = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(latido);
    // Basta el inicio de la sesión: el nombre o las pausas cerradas no cambian
    // el temporizador, y `pausado` sí lo desarma.
  }, [inicio, pausado]);
  return sesion ? tiempoEfectivo(sesion, ahora) : 0;
}

/** Título de la ventana con el tiempo y el nombre, como el legacy: es lo que se
 *  ve con la app de fondo. Componente aparte para que solo él lata. */
export function TituloCronometro() {
  const control = usarCronometroDeVista();
  const sesion = control?.sesion ?? null;
  const tiempo = usarTiempoCronometro(sesion, control?.pausado ?? false);
  const original = useRef(document.title);
  const formateado = formatearTiempo(tiempo);
  useEffect(() => {
    document.title = sesion ? `${formateado} · ${sesion.nombre}` : original.current;
  }, [sesion, formateado]);
  return null;
}

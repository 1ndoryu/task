/* Aviso breve de la lista: un texto que aparece abajo y se retira solo. Un aviso
 * nuevo sustituye al anterior y reinicia el tiempo. */
import { useCallback, useEffect, useRef, useState } from 'react';

/** Cuánto se queda el aviso en pantalla. */
const DURACION_MS = 3500;

export function usarAviso(): [string | null, (texto: string) => void] {
  const [aviso, setAviso] = useState<string | null>(null);
  const temporizador = useRef<number | undefined>(undefined);

  const avisar = useCallback((texto: string) => {
    window.clearTimeout(temporizador.current);
    setAviso(texto);
    temporizador.current = window.setTimeout(() => setAviso(null), DURACION_MS);
  }, []);

  // Al desmontar no queda un temporizador pendiente que escriba en el vacío.
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  return [aviso, avisar];
}

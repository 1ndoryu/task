/* Sincronía entre pestañas: al volver a la pestaña, al enfocarla o cuando otra
 * pestaña avisa de un cambio, se relee el dashboard y se sustituyen las filas que
 * no tienen escritura en curso (`sincronizar`). Así lo pintado converge sin
 * recargar, y una pestaña vieja no vuelve a escribir sobre datos ya cambiados. */
import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { leerDashboard } from '../logica/dashboard';
import type { Escritura } from './usarEscritura';
import type { Estado } from './tiposLista';

const CANAL = 'tareas-nuevo:v1:sincronia';
// Como mucho una relectura por intervalo; lo que llegue dentro se junta en la última.
const INTERVALO_MS = 5000;

let emisor: BroadcastChannel | null = null;

/** Avisa a las demás pestañas de que el servidor cambió. Sin BroadcastChannel no hace nada. */
export function avisarOtrasPestanas(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  // Un solo canal de envío: abrir y cerrar uno por aviso puede perder el mensaje.
  emisor ??= new BroadcastChannel(CANAL);
  emisor.postMessage('cambio');
}

export function usarSincronia(setEstado: Dispatch<SetStateAction<Estado>>, sincronizar: Escritura['sincronizar']): void {
  useEffect(() => {
    let vivo = true;
    let ultima = 0;
    let espera: ReturnType<typeof setTimeout> | undefined;

    const releer = async () => {
      let servidor;
      try {
        servidor = await leerDashboard();
      } catch {
        return; // Sin red: la próxima señal (foco, aviso) vuelve a intentarlo.
      }
      if (!vivo) return;
      setEstado((previo) => {
        if (previo.fase !== 'listo') return previo;
        const { tareas, habitos } = sincronizar(previo.datos, servidor);
        // Sin cambios, el estado previo se conserva: no hay repintado.
        if (tareas === previo.datos.tareas && habitos === previo.datos.habitos) return previo;
        return { fase: 'listo', datos: { ...previo.datos, tareas, habitos } };
      });
    };

    const pedir = () => {
      const restante = INTERVALO_MS - (Date.now() - ultima);
      if (restante <= 0) {
        ultima = Date.now();
        void releer();
        return;
      }
      espera ??= setTimeout(() => {
        espera = undefined;
        ultima = Date.now();
        void releer();
      }, restante);
    };

    const alVolver = () => {
      if (document.visibilityState === 'visible') pedir();
    };

    const receptor = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CANAL);
    if (receptor) receptor.onmessage = pedir;
    window.addEventListener('focus', pedir);
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      vivo = false;
      clearTimeout(espera);
      receptor?.close();
      window.removeEventListener('focus', pedir);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [setEstado, sincronizar]);
}

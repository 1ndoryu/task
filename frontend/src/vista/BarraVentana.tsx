/* Controles de la ventana en la app de escritorio: la ventana de Tauri no lleva
 * decoración de Windows, así que minimizar, maximizar y cerrar los pone la
 * propia página. Arrastrarla es cosa de `data-tauri-drag-region`, que se pone
 * en el fondo del marco, no aquí.
 *
 * [por que] En el navegador este componente no pinta nada: ahí los botones los
 * pone el sistema operativo y Tauri no existe. La app de escritorio carga el
 * front desde su backend (127.0.0.1:4190) y Tauri inyecta su API global en ese
 * documento; la presencia de `window.__TAURI__.window` es la señal. */
import { useEffect, useState } from 'react';
import { IconoCerrar, IconoMaximizar, IconoMinimizar, IconoRestaurar } from './Iconos';

/** Lo que se usa del API global de Tauri. Se declara aquí, sin importar el
 * paquete: el front del navegador no lo lleva y no debe llevarlo. */
interface VentanaTauri {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onResized(manejador: () => void): Promise<() => void>;
}

function ventanaTauri(): VentanaTauri | null {
  const tauri = (globalThis as { __TAURI__?: { window?: { getCurrentWindow?: () => VentanaTauri } } }).__TAURI__;
  return tauri?.window?.getCurrentWindow?.() ?? null;
}

export function BarraVentana() {
  const [ventana, setVentana] = useState<VentanaTauri | null>(null);
  const [maximizada, setMaximizada] = useState(false);

  useEffect(() => {
    const v = ventanaTauri();
    if (!v) return;
    setVentana(v);
    let quitar: (() => void) | undefined;
    // [por que] Maximizar puede venir de Windows (Win+flechas, doble clic en
    // la franja): el icono se lee del estado real y no del último clic.
    // [por que] Si Tauri no responde, el icono se queda como estaba: el fallo
    // no puede tumbar el resto de la ventana.
    const leer = () => void v.isMaximized().then(setMaximizada, () => {});
    leer();
    void v
      .onResized(leer)
      .then((desuscribir) => {
        quitar = desuscribir;
      })
      .catch(() => {});
    return () => quitar?.();
  }, []);

  if (!ventana) return null;

  return (
    <div className="ventana">
      <button
        type="button"
        className="ventana__boton"
        aria-label="Minimizar"
        title="Minimizar"
        onClick={() => void ventana.minimize()}
      >
        <IconoMinimizar />
      </button>
      <button
        type="button"
        className="ventana__boton"
        aria-label={maximizada ? 'Restaurar' : 'Maximizar'}
        title={maximizada ? 'Restaurar' : 'Maximizar'}
        onClick={() => void ventana.toggleMaximize()}
      >
        {maximizada ? <IconoRestaurar /> : <IconoMaximizar />}
      </button>
      <button
        type="button"
        className="ventana__boton"
        aria-label="Cerrar"
        title="Cerrar"
        onClick={() => void ventana.close()}
      >
        <IconoCerrar tam={10} />
      </button>
    </div>
  );
}

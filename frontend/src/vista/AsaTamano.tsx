/* Asa de tamaño de una caja: el tirador de la esquina, el gesto de puntero y el
 * imán al tamaño de fábrica. Vive aparte de `Caja` porque es un gesto, no una
 * parte del contenido, y así la caja sigue sabiendo solo recortar y colocar.
 *
 * El ancho es libre dentro de su suelo y el de la ventana; el alto no pasa del
 * de fábrica. Al soltar cerca del de fábrica, la caja encaja exacta en él: es
 * la asistencia para volver. El doble clic también vuelve al de fábrica. */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { ALTO_CAJA_MINIMO, ANCHO_CAJA_MINIMO, type TamanoCaja } from '../logica/preferencias';
import { IMAN_DEFECTO, tamanoDefecto } from './tamano';

interface Entrada {
  /** La caja que se redimensiona: se escribe en ella durante el gesto. */
  caja: RefObject<HTMLElement>;
  /** Con `undefined` la caja vuelve al tamaño de fábrica. */
  onTamano: (tamano: TamanoCaja | undefined) => void;
}

/** Lo que se fija al empezar un gesto: de dónde se parte y hasta dónde llega. */
interface Medida {
  x: number;
  y: number;
  anchoInicio: number;
  altoInicio: number;
  defecto: { ancho: number; alto: number };
  /** Tope del ancho: la ventana menos el aire del carril. */
  anchoTope: number;
}

export function AsaTamano({ caja, onTamano }: Entrada) {
  const asa = useRef<HTMLDivElement>(null);
  const [redimensionando, setRedimensionando] = useState(false);
  // El callback se lee por referencia: cambiar de caja no debe reenganchar el
  // gesto a mitad de un arrastre.
  const avisar = useRef(onTamano);
  useEffect(() => {
    avisar.current = onTamano;
  });

  useEffect(() => {
    const nodo = asa.current;
    const pieza = caja.current;
    if (!nodo || !pieza) return;

    let medida: Medida | null = null;

    /** Lleva el tamaño a lo que se puede pedir; al soltar, además, lo imanta. */
    const acotar = (dx: number, dy: number, soltar: boolean) => {
      if (!medida) return null;
      const { anchoInicio, altoInicio, defecto, anchoTope } = medida;
      let ancho = Math.min(anchoTope, Math.max(ANCHO_CAJA_MINIMO, anchoInicio + dx));
      let alto = Math.min(defecto.alto, Math.max(ALTO_CAJA_MINIMO, altoInicio + dy));
      if (soltar) {
        if (Math.abs(ancho - defecto.ancho) <= IMAN_DEFECTO) ancho = defecto.ancho;
        if (Math.abs(alto - defecto.alto) <= IMAN_DEFECTO) alto = defecto.alto;
      }
      return { ancho: Math.round(ancho), alto: Math.round(alto), defecto };
    };

    const escribir = (ancho: number, alto: number, defecto: { ancho: number }) => {
      pieza.style.setProperty('--ancho-usuario', `${ancho}px`);
      pieza.style.setProperty('--alto-caja-usuario', `${alto}px`);
      // Mientras el ancho pase del de fábrica, la caja no necesita el aire de
      // los extremos del carril: esa asistencia solo sirve para centrar una
      // caja estrecha, y en una ancha desplazaría todo el carril a cada cuadro.
      pieza.classList.toggle('caja--crecida', ancho > defecto.ancho + 1);
    };

    const desenganchar = () => {
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', alSoltar);
      window.removeEventListener('pointercancel', alSoltar);
    };

    const alMover = (evento: PointerEvent) => {
      if (!medida) return;
      const acotado = acotar(evento.clientX - medida.x, evento.clientY - medida.y, false);
      if (acotado) escribir(acotado.ancho, acotado.alto, acotado.defecto);
    };

    const alSoltar = (evento: PointerEvent) => {
      if (!medida) return;
      const acotado = acotar(evento.clientX - medida.x, evento.clientY - medida.y, true);
      medida = null;
      desenganchar();
      setRedimensionando(false);
      if (!acotado) return;
      // Lo que vale el de fábrica no se guarda: la caja vuelve a la hoja, y así
      // sigue al tamaño de siempre aunque la ventana cambie.
      const siguiente: TamanoCaja = {};
      const grueso = acotado.ancho !== Math.round(acotado.defecto.ancho);
      if (grueso) siguiente.ancho = acotado.ancho;
      if (acotado.alto !== Math.round(acotado.defecto.alto)) siguiente.alto = acotado.alto;
      // `crecido` se guarda porque decide el margen del carril: sin él, la caja
      // ancha volvería a pedir su aire al recargarse.
      if (grueso && acotado.ancho > acotado.defecto.ancho) siguiente.crecido = true;
      avisar.current(siguiente.ancho === undefined && siguiente.alto === undefined ? undefined : siguiente);
    };

    const alPulsar = (evento: PointerEvent) => {
      if (evento.button !== 0) return;
      // La caja del carril se arrastra desde cualquier punto libre; el asa no
      // es zona de arrastre, es su borde.
      evento.preventDefault();
      evento.stopPropagation();
      const rect = pieza.getBoundingClientRect();
      medida = {
        x: evento.clientX,
        y: evento.clientY,
        anchoInicio: rect.width,
        altoInicio: rect.height,
        defecto: tamanoDefecto(pieza),
        anchoTope: Math.max(ANCHO_CAJA_MINIMO, document.documentElement.clientWidth - 40),
      };
      setRedimensionando(true);
      window.addEventListener('pointermove', alMover);
      window.addEventListener('pointerup', alSoltar);
      window.addEventListener('pointercancel', alSoltar);
    };

    nodo.addEventListener('pointerdown', alPulsar);
    return () => {
      nodo.removeEventListener('pointerdown', alPulsar);
      desenganchar();
      medida = null;
    };
  }, [caja]);

  /** Doble clic: vuelve al de fábrica, igual que soltar encima del imán. */
  const restablecer = () => {
    const pieza = caja.current;
    if (!pieza) return;
    pieza.style.removeProperty('--ancho-usuario');
    pieza.style.removeProperty('--alto-caja-usuario');
    pieza.classList.remove('caja--crecida');
    avisar.current(undefined);
  };

  return (
    <div
      ref={asa}
      className={`caja__asa${redimensionando ? ' caja__asa--activa' : ''}`}
      role="separator"
      aria-label="Cambiar el tamaño de la caja"
      title="Arrastra para cambiar el tamaño · doble clic para el de siempre"
      // El carril se agarra desde cualquier punto libre de la caja; el asa no.
      data-sin-arrastre
      onDoubleClick={restablecer}
    />
  );
}

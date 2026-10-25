/* Talla de letra elegida con un número: el ajuste enseña el valor actual y un
 * modal con contador para afinarlo. La escala cerrada de antes (pequeña,
 * normal, grande) no dejaba afinar; aquí se escribe el número y se ve a qué
 * sabe antes de aceptar.
 *
 * El modal lleva además los atajos de siempre: el valor por defecto y un paso
 * arriba o abajo. La mayoría de las veces se quiere volver o moverse un punto,
 * no pensar un número. */
import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  /** Título del ajuste en el panel de ajustes. */
  titulo: string;
  valor: number;
  minima: number;
  maxima: number;
  porDefecto: number;
  /** Texto de muestra: se ve la talla antes de aceptar. */
  muestra: string;
  onElegir: (valor: number) => void;
  nota?: string;
}

/** Deja el valor dentro de lo que se puede pedir y lo redondea a píxeles. */
const acotar = (valor: number, minima: number, maxima: number) =>
  Math.min(maxima, Math.max(minima, Math.round(valor)));

/** El ajuste: un disparador con el número actual y el modal que lo cambia. */
export function CampoTamano({ titulo, valor, minima, maxima, porDefecto, muestra, onElegir, nota }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="campo">
      <p className="campo__titulo">{titulo}</p>
      <button type="button" className="campo__valor" onClick={() => setAbierto(true)}>
        <span className="campo__muestra" style={{ fontSize: valor }}>
          {muestra}
        </span>
        <span className="campo__cifra">
          {valor}
          <span className="campo__unidad">px</span>
        </span>
      </button>
      {nota && <p className="campo__nota">{nota}</p>}
      {abierto && (
        <ModalNumero
          titulo={titulo}
          valor={valor}
          minima={minima}
          maxima={maxima}
          porDefecto={porDefecto}
          muestra={muestra}
          onAceptar={(elegido) => {
            onElegir(elegido);
            setAbierto(false);
          }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </div>
  );
}

/** El modal de verdad: contador, campo y muestra. Se abre ya con el foco en el
 *  campo y el texto seleccionado, para escribir encima sin borrar. */
function ModalNumero({
  titulo,
  valor,
  minima,
  maxima,
  porDefecto,
  muestra,
  onAceptar,
  onCerrar,
}: Omit<Props, 'onElegir' | 'nota'> & {
  valor: number;
  onAceptar: (valor: number) => void;
  onCerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  // Borrador: mientras no se acepta, la lista no cambia.
  const [borrador, setBorrador] = useState(String(valor));
  const idTitulo = useId();

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    nodo.showModal();
    const entrada = campo.current;
    entrada?.focus();
    entrada?.select();
    const alCerrar = () => onCerrar();
    // Escape y el cierre nativo avisan por aquí; `onCerrar` solo desmonta.
    nodo.addEventListener('cancel', alCerrar);
    return () => nodo.removeEventListener('cancel', alCerrar);
  }, [onCerrar]);

  const numero = Number(borrador.replace(',', '.'));
  const valido = Number.isFinite(numero) && borrador.trim() !== '';
  const elegido = valido ? acotar(numero, minima, maxima) : valor;
  const fuera = valido && (numero < minima || numero > maxima);

  const mover = (paso: number) => setBorrador(String(acotar(elegido + paso, minima, maxima)));

  return (
    <dialog
      ref={dialogo}
      className="modal modal--numero"
      aria-labelledby={idTitulo}
      onClose={onCerrar}
      onClick={(evento) => {
        if (evento.target === dialogo.current) dialogo.current?.close();
      }}
    >
      <div className="modal__caja">
        <p className="modal__titulo" id={idTitulo}>
          {titulo}
        </p>
        {/* La muestra cambia con el borrador: se decide viendo, no imaginando. */}
        <p className="numero__muestra" style={{ fontSize: elegido }} aria-live="polite">
          {muestra}
        </p>
        <div className="numero__fila">
          <button
            type="button"
            className="numero__paso"
            aria-label="Un punto menos"
            disabled={elegido <= minima}
            onClick={() => mover(-1)}
          >
            −
          </button>
          <label className="numero__caja">
            <input
              ref={campo}
              className="numero__campo"
              type="number"
              inputMode="numeric"
              min={minima}
              max={maxima}
              step={1}
              value={borrador}
              aria-label="Tamaño en píxeles"
              onChange={(evento) => setBorrador(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' && valido) onAceptar(elegido);
              }}
            />
            <span className="numero__unidad">px</span>
          </label>
          <button
            type="button"
            className="numero__paso"
            aria-label="Un punto más"
            disabled={elegido >= maxima}
            onClick={() => mover(1)}
          >
            +
          </button>
        </div>
        <p className="campo__nota">
          {fuera
            ? `Se queda en ${elegido} px: aquí va de ${minima} a ${maxima}.`
            : `De ${minima} a ${maxima} px.`}
        </p>
        <div className="modal__pie">
          <button type="button" className="boton" onClick={() => setBorrador(String(porDefecto))}>
            El de siempre ({porDefecto})
          </button>
          <button type="button" className="boton" onClick={() => dialogo.current?.close()}>
            Cancelar
          </button>
          <button
            type="button"
            className="boton boton--principal"
            disabled={!valido}
            onClick={() => onAceptar(elegido)}
          >
            Aplicar
          </button>
        </div>
      </div>
    </dialog>
  );
}

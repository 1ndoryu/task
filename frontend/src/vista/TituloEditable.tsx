/* Título editable de un panel: texto que se ve como el título y pasa a ser un
 * campo al pulsarlo. Un solo componente para las cajas y para las pestañas, así
 * el renombrado se comporta igual en las dos formas de la vista.
 *
 * Enter y Escape cierran y guardan; el clic fuera también guarda, porque perder
 * lo escrito es peor que un cambio no deseado (y se ve al momento). Un título
 * vacío no se acepta: vuelve al que había. */
import { useEffect, useRef, useState } from 'react';

interface Props {
  valor: string;
  /** Falso en los paneles de sistema, que no se renombran. */
  editable: boolean;
  onRenombrar: (titulo: string) => void;
  /** Clase del texto visible; el campo hereda su talla y su color. */
  clase: string;
  /** Texto accesible del disparador. */
  etiqueta?: string;
  /** Contador que abre el campo desde fuera (el menú contextual): cada valor
   *  nuevo es una petición, así pedirlo dos veces seguidas también funciona. */
  forzar?: number;
  /** Gesto que abre el campo. «Doble» en las pestañas: ahí el primer clic ya
   *  tiene dueño —elegir la pestaña— y renombrar no puede llevárselo. */
  abrir?: 'clic' | 'doble';
}

export function TituloEditable({
  valor,
  editable,
  onRenombrar,
  clase,
  etiqueta,
  forzar = 0,
  abrir = 'clic',
}: Props) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(valor);
  const campo = useRef<HTMLInputElement>(null);

  // Al abrir, el campo nace con el título entero seleccionado: escribir
  // reemplaza, y quien quiera retocarlo ya tiene el cursor donde toca.
  useEffect(() => {
    if (!editando) return;
    setBorrador(valor);
    const nodo = campo.current;
    if (!nodo) return;
    nodo.focus();
    nodo.select();
  }, [editando, valor]);

  // Petición desde fuera: se abre al llegar un contador nuevo. No depende de
  // `editando` a propósito: pedirlo otra vez con el campo ya abierto lo reabre.
  useEffect(() => {
    if (forzar > 0) setEditando(true);
  }, [forzar]);

  /** Cierra guardando solo si hay un título distinto y con contenido. */
  const cerrar = (guardar: boolean) => {
    setEditando(false);
    const limpio = borrador.trim();
    if (guardar && limpio && limpio !== valor) onRenombrar(limpio);
  };

  // Las tres formas llevan `titulo`: la letra, el margen y el color son los
  // mismos se pinte lo que se pinte, y el alto no cambia al empezar a editar.
  if (!editable) return <p className={`${clase} titulo`}>{valor}</p>;

  if (editando) {
    return (
      <input
        ref={campo}
        className={`${clase} titulo titulo--campo`}
        value={borrador}
        aria-label={etiqueta ?? `Renombrar «${valor}»`}
        maxLength={255}
        onChange={(evento) => setBorrador(evento.target.value)}
        onBlur={() => cerrar(true)}
        onKeyDown={(evento) => {
          // El teclado del carril y de las pestañas no debe ver estas teclas.
          evento.stopPropagation();
          if (evento.key === 'Enter') cerrar(true);
          if (evento.key === 'Escape') cerrar(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`${clase} titulo titulo--editable`}
      // El gesto de arrastre de la caja no debe nacer aquí: pulsar para
      // renombrar es pulsar, no agarrar.
      data-sin-arrastre
      title={abrir === 'doble' ? `Renombrar «${valor}» (doble clic)` : `Renombrar «${valor}»`}
      onClick={(evento) => {
        // [por que] Con «doble», el clic del ratón es de la pestaña; el botón
        // solo abre con el teclado (Enter y Espacio llegan con `detail` 0).
        if (abrir === 'doble' && evento.detail > 0) return;
        setEditando(true);
      }}
      onDoubleClick={() => {
        if (abrir === 'doble') setEditando(true);
      }}
    >
      {valor}
    </button>
  );
}

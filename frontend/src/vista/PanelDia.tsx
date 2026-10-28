/* Pestaña «Día» de los ajustes: a qué hora acaba el día. Con 3, a las 02:59 se
 * sigue en el día de ayer (hábitos, completados, diario). No mueve las horas de
 * temprano, tarde y noche: esas viven en «Algoritmo». Hora entera, 0–23. */
import { useState } from 'react';

export function PanelDia({ finDia, onCambiar }: { finDia: number; onCambiar: (hora: number) => void }) {
  // Se teclea como texto y se confirma al soltar, como en «Algoritmo».
  const [texto, setTexto] = useState<string | null>(null);
  const confirmar = () => {
    const hora = Number(texto);
    if (texto !== null && texto.trim() !== '' && Number.isInteger(hora) && hora >= 0 && hora <= 23) onCambiar(hora);
    setTexto(null);
  };
  return (
    <div className="campo">
      <p className="campo__titulo">Fin del día</p>
      <ul className="algoritmo">
        <li className="algoritmo__fila">
          <label className="algoritmo__etiqueta" htmlFor="fin-dia">
            El día termina a las
          </label>
          <input
            id="fin-dia"
            className="algoritmo__entrada"
            type="number"
            inputMode="numeric"
            min={0}
            max={23}
            step={1}
            value={texto ?? String(finDia)}
            data-cambiado={finDia !== 0}
            onChange={(evento) => setTexto(evento.target.value)}
            onBlur={confirmar}
            onKeyDown={(evento) => evento.key === 'Enter' && evento.currentTarget.blur()}
          />
          <span className="algoritmo__unidad">h</span>
        </li>
      </ul>
      <p className="campo__nota">
        0 es la medianoche de siempre. Con 3, hasta las 02:59 sigues en el día anterior. No cambia las horas de
        temprano, tarde y noche.
      </p>
    </div>
  );
}

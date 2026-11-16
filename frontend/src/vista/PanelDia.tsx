/* Pestaña «Día» de los ajustes: a qué hora acaba el día. Con 3, a las 02:59 se
 * sigue en el día de ayer (hábitos, completados, diario). No mueve las horas de
 * temprano, tarde y noche: esas viven en «Algoritmo». Hora entera, 0–23. */
import { useEffect, useMemo, useState } from 'react';
import { fechaEnPalabras, fechaLocal, hoyLogico } from '../logica/fechas';

/** Hora del sistema, al día cada medio minuto: el aviso de abajo tiene que
 *  decir lo mismo que el reloj del equipo, no lo que había al abrir ajustes. */
function usarAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(reloj);
  }, []);
  return ahora;
}

export function PanelDia({ finDia, onCambiar }: { finDia: number; onCambiar: (hora: number) => void }) {
  const ahora = usarAhora();
  // Lo que ve la app frente a lo que dice el sistema: si no coinciden es por la
  // hora de fin de día, y se dice cuánto falta para que cambie.
  const dia = useMemo(() => {
    const logico = hoyLogico(ahora, finDia);
    const natural = fechaLocal(ahora);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), finDia, 0, 0, 0);
    if (fin.getTime() <= ahora.getTime()) fin.setDate(fin.getDate() + 1);
    const minutos = Math.max(1, Math.round((fin.getTime() - ahora.getTime()) / 60_000));
    const horas = Math.floor(minutos / 60);
    const resto = `${horas > 0 ? `${horas} h ` : ''}${minutos % 60} min`;
    return { logico, natural, resto };
  }, [ahora, finDia]);
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
        El día de la app es: <strong>{fechaEnPalabras(dia.logico)}</strong>. Cambia en {dia.resto}.
        {dia.logico === dia.natural
          ? ' Coincide con la fecha del sistema.'
          : ` El sistema ya está en ${fechaEnPalabras(dia.natural)}: la app va un día atrás hasta esa hora, y es lo que pide este ajuste.`}
      </p>
      <p className="campo__nota">
        0 es la medianoche de siempre. Con 3, hasta las 02:59 sigues en el día anterior. No cambia las horas de
        temprano, tarde y noche.
      </p>
    </div>
  );
}

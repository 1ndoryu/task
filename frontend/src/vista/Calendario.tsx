/* Calendario reutilizable: elige un día. Lo usan el aplazo de una fila, la
 * fecha límite de una tarea y el selector de día del diario. Es un panel
 * diálogo modal como los demás (`Dialogo`: fondo oscuro, foco, Escape y clic
 * fuera los pone el navegador); no sabe para qué se elige, solo devuelve la
 * fecha. */
import { useState } from 'react';
import { dentroDeLimites, mesDe, moverMes, rejillaMes } from '../logica/calendario';
import { Dialogo } from './Dialogo';

interface Props {
  titulo: string;
  /** Día elegido ahora, si lo hay; también decide el mes con que abre. */
  valor?: string | null;
  /** Día de hoy: se marca y es el mes de arranque si no hay valor. */
  hoy: string;
  /** Primer y último día elegibles (inclusivos). */
  min?: string;
  max?: string;
  /** Días con algo dentro (por ejemplo, entradas del diario): llevan un punto. */
  marcados?: ReadonlySet<string>;
  onElegir: (fecha: string) => void;
  onCerrar: () => void;
}

const SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function Calendario({ titulo, valor, hoy, min, max, marcados, onElegir, onCerrar }: Props) {
  const [visible, setVisible] = useState(() => mesDe(valor ?? hoy));

  const nombreMes = new Date(visible.anio, visible.mes, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });

  return (
    <Dialogo clase="modal--calendario" etiqueta={titulo} onCerrar={onCerrar}>
      <div className="modal__caja">
        <div className="modal__cuerpo">
          <p className="calendario__titulo">{titulo}</p>
          <div className="calendario__mes">
            <button type="button" className="barra__boton" aria-label="Mes anterior" onClick={() => setVisible(moverMes(visible, -1))}>
              ‹
            </button>
            <span className="calendario__nombre">{nombreMes}</span>
            <button type="button" className="barra__boton" aria-label="Mes siguiente" onClick={() => setVisible(moverMes(visible, 1))}>
              ›
            </button>
          </div>
          <div className="calendario__rejilla" role="grid">
            {SEMANA.map((d) => (
              <span key={d} className="calendario__cabecera">
                {d}
              </span>
            ))}
            {rejillaMes(visible).map((dia) => {
              const delMes = mesDe(dia).mes === visible.mes;
              const libre = dentroDeLimites(dia, min, max);
              return (
                <button
                  key={dia}
                  type="button"
                  className={`calendario__dia${delMes ? '' : ' calendario__dia--fuera'}${dia === hoy ? ' calendario__dia--hoy' : ''}${dia === valor ? ' calendario__dia--elegido' : ''}${marcados?.has(dia) ? ' calendario__dia--marcado' : ''}`}
                  disabled={!libre}
                  aria-pressed={dia === valor}
                  aria-label={dia}
                  onClick={() => onElegir(dia)}
                >
                  {Number(dia.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Dialogo>
  );
}

/* «Cuándo es mejor hacer» en el modal de una fila: se pueden elegir varios
 * momentos del día (o ninguno). Usa la receta de `.segmento`, pero cada opción
 * es una casilla suelta y no un valor excluyente como en `Opciones`. */
import { alternarMomento, MOMENTOS, type Momento } from '../logica/momentos';

interface Props {
  momentos: readonly Momento[];
  onCambiar: (momentos: Momento[]) => void;
}

export function MomentosCampo({ momentos, onCambiar }: Props) {
  return (
    <div className="campo">
      <p className="campo__titulo">Cuándo es mejor hacer</p>
      <div className="opciones" role="group" aria-label="Cuándo es mejor hacer">
        {MOMENTOS.map((momento) => {
          const activo = momentos.includes(momento.id);
          return (
            <button
              key={momento.id}
              type="button"
              role="checkbox"
              aria-checked={activo}
              className={`segmento${activo ? ' segmento--activo' : ''}`}
              onClick={() => onCambiar(alternarMomento(momentos, momento.id))}
            >
              {momento.etiqueta}
            </button>
          );
        })}
      </div>
    </div>
  );
}

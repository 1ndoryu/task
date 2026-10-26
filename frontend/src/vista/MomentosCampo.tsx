/* «Cuándo es mejor hacer» en el modal de una fila: se elige un solo momento del
 * día, o ninguno. Usa la receta de `.segmento` y de un grupo de opción única. */
import { elegirMomento, leerMomentos, MOMENTOS, type Momento } from '../logica/momentos';

interface Props {
  momentos: readonly Momento[];
  onCambiar: (momentos: Momento[]) => void;
}

export function MomentosCampo({ momentos, onCambiar }: Props) {
  const [activo] = leerMomentos(momentos);
  return (
    <div className="campo">
      <p className="campo__titulo">Cuándo es mejor hacer</p>
      <div className="opciones" role="radiogroup" aria-label="Cuándo es mejor hacer">
        {MOMENTOS.map((momento) => {
          const marcado = activo === momento.id;
          return (
            <button
              key={momento.id}
              type="button"
              role="radio"
              aria-checked={marcado}
              className={`segmento${marcado ? ' segmento--activo' : ''}`}
              onClick={() => onCambiar(elegirMomento(activo, momento.id))}
            >
              {momento.etiqueta}
            </button>
          );
        })}
      </div>
    </div>
  );
}

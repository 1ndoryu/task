/* Fila de valores excluyentes: el activo lleva el punto. La usan el modal de
 * configuración para prioridad, urgencia y frecuencia, y el panel de ajustes.
 * Receta visual: `estilos/modal.css` (`.segmento`). */
interface Props {
  titulo?: string;
  valor: string;
  opciones: { id: string; etiqueta: string }[];
  onElegir: (id: string) => void;
}

export function Opciones({ titulo, valor, opciones, onElegir }: Props) {
  return (
    <div className="opciones" role="radiogroup" aria-label={titulo}>
      {opciones.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          role="radio"
          aria-checked={valor === opcion.id}
          className={`segmento${valor === opcion.id ? ' segmento--activo' : ''}`}
          onClick={() => onElegir(opcion.id)}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}

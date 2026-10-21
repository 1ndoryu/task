/* Pestañas en columna, para agrupar un formulario largo en bloques que se ven
 * de uno en uno. Se montan sobre la misma receta que las pestañas de arriba
 * (`pestanas.css`) y añaden el teclado vertical del tablist: flechas arriba y
 * abajo, además de Inicio y Fin, que es lo que espera quien navega sin ratón. */
interface Props<T extends string> {
  /** Texto accesible del grupo. */
  titulo: string;
  valor: T;
  opciones: { id: T; etiqueta: string }[];
  onElegir: (id: T) => void;
  /** Raíz de los ids: la pestaña n lleva `${idBase}-${n}`. El padre la necesita
   * para etiquetar el panel con la pestaña activa. */
  idBase: string;
}

export function PestanasLaterales<T extends string>({
  titulo,
  valor,
  opciones,
  onElegir,
  idBase,
}: Props<T>) {
  const indiceActivo = Math.max(
    0,
    opciones.findIndex((opcion) => opcion.id === valor),
  );

  return (
    <div className="pestanas pestanas--lateral" role="tablist" aria-label={titulo} aria-orientation="vertical">
      {opciones.map((opcion, indice) => {
        const activa = opcion.id === valor;
        return (
          <button
            key={opcion.id}
            type="button"
            role="tab"
            id={`${idBase}-${indice}`}
            aria-selected={activa}
            aria-controls={`${idBase}-panel`}
            tabIndex={activa ? 0 : -1}
            className={`pestana pestana--bloque${activa ? ' pestana--activa' : ''}`}
            // El foco sigue a la elección: al moverse con flechas se ve dónde está.
            onClick={(evento) => {
              onElegir(opcion.id);
              evento.currentTarget.focus();
            }}
            onKeyDown={(evento) => {
              const paso =
                evento.key === 'ArrowDown' ? 1
                : evento.key === 'ArrowUp' ? -1
                : evento.key === 'Home' ? -indiceActivo
                : evento.key === 'End' ? opciones.length - 1 - indiceActivo
                : 0;
              if (!paso) return;
              evento.preventDefault();
              const siguiente = opciones[(indice + paso + opciones.length) % opciones.length];
              onElegir(siguiente.id);
              // La pestaña nueva aún no existía con `tabIndex=0` en este pintado.
              const nodo = document.getElementById(
                `${idBase}-${(indice + paso + opciones.length) % opciones.length}`,
              );
              nodo?.focus();
            }}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

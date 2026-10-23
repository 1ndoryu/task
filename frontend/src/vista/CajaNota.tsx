/* Caja de nota: un panel de texto libre en lugar de una lista de tareas. Usa la
 * misma `Caja` que el resto (misma cabecera, mismo scroll, mismos ajustes de
 * lectura), así que una nota no es un caso especial de la vista: es otro tipo
 * de panel con otro contenido.
 *
 * El texto se escribe en un `<textarea>` que crece con la caja, no con el
 * texto: el scroll es el de la caja, como en una lista. El guardado va con
 * retardo desde `usarNotas`; aquí solo se avisa al cerrar el campo y al salir
 * de la nota. */
import { useEffect, useRef, type ReactNode } from 'react';
import type { Preferencias } from '../logica/preferencias';

interface Props {
  preferencias: Preferencias;
  /** Id del panel dueño de la caja, para que el arrastre sepa a quién mueve. */
  idPanel?: string;
  /** Qué lleva la cabecera: la pone la vista, como en cualquier caja. */
  cabecera: ReactNode;
  titulo: string;
  texto: string;
  onEscribir: (contenido: string) => void;
  /** Guarda lo pendiente al salir del campo (blur o desmontaje). */
  onConfirmar: () => void;
  /** Clic derecho fuera del campo: el menú del panel. Dentro del texto no,
   *  porque ahí el clic derecho es del campo (cortar, pegar). */
  onContexto?: (punto: { x: number; y: number }) => void;
}

export function CajaNota({
  preferencias,
  idPanel,
  cabecera,
  titulo,
  texto,
  onEscribir,
  onConfirmar,
  onContexto,
}: Props) {
  const campo = useRef<HTMLTextAreaElement>(null);
  // La confirmación se lee por referencia: desmontar no debe avisar con una
  // versión vieja del guardado.
  const confirmar = useRef(onConfirmar);
  useEffect(() => {
    confirmar.current = onConfirmar;
  });

  // Al desmontar la nota (se cierra el carril, cambia la pestaña), lo que se
  // estaba escribiendo se manda igual.
  useEffect(() => () => confirmar.current(), []);

  return (
    <section
      className={[
        'caja',
        'caja--nota',
        preferencias.privacidad && 'caja--privacidad',
        preferencias.fuente === 'pequena' && 'caja--fuente-pequena',
        preferencias.fuente === 'grande' && 'caja--fuente-grande',
        preferencias.fuenteNota === 'pequena' && 'caja--nota-fuente-pequena',
        preferencias.fuenteNota === 'grande' && 'caja--nota-fuente-grande',
        preferencias.altura === 'compacta' && 'caja--altura-compacta',
        preferencias.altura === 'amplia' && 'caja--altura-amplia',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={titulo}
      // Mismo gancho que la caja de lista: el carril agarra por aquí.
      data-panel={idPanel}
      onContextMenu={(evento) => {
        if (!onContexto) return;
        if ((evento.target as HTMLElement).closest('textarea, input, [role="menu"]')) return;
        evento.preventDefault();
        onContexto({ x: evento.clientX, y: evento.clientY });
      }}
    >
      {cabecera}
      <div className="scroll">
        <label className="nota">
          <textarea
            ref={campo}
            className="nota__campo"
            value={texto}
            placeholder="Escribe aquí…"
            aria-label={`Texto de «${titulo}»`}
            spellCheck
            onChange={(evento) => onEscribir(evento.target.value)}
            onBlur={() => onConfirmar()}
          />
        </label>
      </div>
    </section>
  );
}

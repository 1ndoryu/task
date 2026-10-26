/* Caja de nota: un panel de texto libre en lugar de una lista de tareas. Usa la
 * misma `Caja` que el resto (misma cabecera, mismo scroll, mismos ajustes de
 * lectura), así que una nota no es un caso especial de la vista: es otro tipo
 * de panel con otro contenido.
 *
 * El texto se escribe en un `<textarea>` que crece con la caja, no con el
 * texto: el scroll es el de la caja, como en una lista. El guardado va con
 * retardo desde `usarNotas`; aquí solo se avisa al cerrar el campo y al salir
 * de la nota. */
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { Preferencias, TamanoCaja } from '../logica/preferencias';
import { AsaTamano } from './AsaTamano';
import { altoUsuario, anchoUsuario } from './tamano';

interface Props {
  preferencias: Preferencias;
  /** Id del panel dueño de la caja, para que el arrastre sepa a quién mueve. */
  idPanel?: string;
  /** Qué lleva la cabecera: la pone la vista, como en cualquier caja. */
  cabecera: ReactNode;
  /** Franja fija al final de la caja, bajo el texto (las flechas del diario). */
  pie?: ReactNode;
  titulo: string;
  texto: string;
  onEscribir: (contenido: string) => void;
  /** Guarda lo pendiente al salir del campo (blur o desmontaje). */
  onConfirmar: () => void;
  /** Clic derecho fuera del campo: el menú del panel. Dentro del texto no,
   *  porque ahí el clic derecho es del campo (cortar, pegar). */
  onContexto?: (punto: { x: number; y: number }) => void;
  /** Tamaño propio de la caja; sin él, el de fábrica. */
  tamano?: TamanoCaja;
  /** Con esto la caja lleva asa y se puede redimensionar. */
  onTamano?: (tamano: TamanoCaja | undefined) => void;
  /** Solo se ve la cabecera: el campo sigue montado, así no se pierde lo escrito. */
  minimizada?: boolean;
}

export function CajaNota({
  preferencias,
  idPanel,
  cabecera,
  pie,
  titulo,
  texto,
  onEscribir,
  onConfirmar,
  onContexto,
  tamano,
  onTamano,
  minimizada,
}: Props) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const nodo = useRef<HTMLElement>(null);
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
      ref={nodo}
      className={[
        'caja',
        'caja--nota',
        preferencias.privacidad && 'caja--privacidad',
        preferencias.interlineadoNota === 'ajustado' && 'caja--nota-interlineado-ajustado',
        preferencias.interlineadoNota === 'amplio' && 'caja--nota-interlineado-amplio',
        preferencias.altura === 'compacta' && 'caja--altura-compacta',
        preferencias.altura === 'amplia' && 'caja--altura-amplia',
        tamano?.crecido && 'caja--crecida',
        minimizada && 'caja--minimizada',
      ]
        .filter(Boolean)
        .join(' ')}
      // La nota lleva su propia talla: cambia el texto del campo, no el de las
      // filas de las otras cajas.
      style={
        {
          '--texto-campo-nota': `${preferencias.fuenteNota}px`,
          '--ancho-usuario': anchoUsuario(tamano),
          '--alto-caja-usuario': altoUsuario(tamano),
        } as CSSProperties
      }
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
      {onTamano && !minimizada && <AsaTamano caja={nodo} onTamano={onTamano} />}
      {/* `data-rueda-propia`: la nota se lee con la rueda sin mover el carril. */}
      <div className="scroll" data-rueda-propia>
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
      {pie}
    </section>
  );
}

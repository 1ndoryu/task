/* Panel de ajustes de lectura: un modal con todos los controles de cómo se ve la
 * lista. El modal y el formulario son recetas compartidas (`estilos/modal.css`);
 * aquí solo se declaran los campos y se avisa del cambio. */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { Altura, AlcancePrivacidad, Fuente, Preferencias } from '../logica/preferencias';
import { IconoCerrar } from './Iconos';

/** Un ajuste: título, valores en fila y una nota opcional que explica el efecto. */
function Campo<T extends string>({
  titulo,
  valor,
  opciones,
  onElegir,
  nota,
}: {
  titulo: string;
  valor: T;
  opciones: { id: T; etiqueta: string }[];
  onElegir: (id: T) => void;
  nota?: ReactNode;
}) {
  const idTitulo = useId();
  return (
    <div className="campo">
      <p className="campo__titulo" id={idTitulo}>
        {titulo}
      </p>
      <div className="opciones" role="radiogroup" aria-labelledby={idTitulo}>
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
      {nota && <p className="campo__nota">{nota}</p>}
    </div>
  );
}

const FUENTES: { id: Fuente; etiqueta: string }[] = [
  { id: 'pequena', etiqueta: 'Pequeña' },
  { id: 'normal', etiqueta: 'Normal' },
  { id: 'grande', etiqueta: 'Grande' },
];

const ALTURAS: { id: Altura; etiqueta: string }[] = [
  { id: 'compacta', etiqueta: 'Compacta' },
  { id: 'normal', etiqueta: 'Normal' },
  { id: 'amplia', etiqueta: 'Amplia' },
];

const ALCANCES: { id: AlcancePrivacidad; etiqueta: string }[] = [
  { id: 'una', etiqueta: 'Solo la del ratón' },
  { id: 'todas', etiqueta: 'Todas' },
];

const SI_NO = [
  { id: 'si' as const, etiqueta: 'Sí' },
  { id: 'no' as const, etiqueta: 'No' },
];

interface Props {
  abierto: boolean;
  preferencias: Preferencias;
  onCambiar: (cambios: Partial<Preferencias>) => void;
  onCerrar: () => void;
}

/** `<dialog>` nativo: el foco, el fondo inerte y Escape los pone el navegador. */
export function Ajustes({ abierto, preferencias, onCambiar, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    if (abierto && !nodo.open) nodo.showModal();
    if (!abierto && nodo.open) nodo.close();
  }, [abierto]);

  // Escape y el botón de cerrar llegan aquí; el estado vive en `usarLista`.
  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    const alCerrar = () => onCerrar();
    nodo.addEventListener('close', alCerrar);
    return () => nodo.removeEventListener('close', alCerrar);
  }, [onCerrar]);

  return (
    <dialog
      className="modal"
      ref={dialogo}
      aria-label="Ajustes de la lista"
      onClick={(evento) => {
        // El clic fuera del contenido solo alcanza al propio `<dialog>`.
        if (evento.target === dialogo.current) onCerrar();
      }}
    >
      <div className="modal__caja">
        <header className="modal__cabecera">
          <h2 className="modal__titulo">Ajustes</h2>
          <button
            type="button"
            className="modal__cerrar"
            aria-label="Cerrar los ajustes"
            title="Cerrar"
            onClick={onCerrar}
          >
            <IconoCerrar />
          </button>
        </header>

        <div className="modal__cuerpo">
          <Campo
            titulo="Tamaño de la fuente"
            valor={preferencias.fuente}
            opciones={FUENTES}
            onElegir={(fuente) => onCambiar({ fuente })}
          />
          <Campo
            titulo="Altura de las filas"
            valor={preferencias.altura}
            opciones={ALTURAS}
            onElegir={(altura) => onCambiar({ altura })}
          />
          <Campo
            titulo="Separador entre filas"
            valor={preferencias.separador ? 'si' : 'no'}
            opciones={SI_NO}
            onElegir={(valor) => onCambiar({ separador: valor === 'si' })}
          />
          <Campo
            titulo="Privacidad"
            valor={preferencias.privacidad ? 'si' : 'no'}
            opciones={SI_NO}
            onElegir={(valor) => onCambiar({ privacidad: valor === 'si' })}
            nota="Con la privacidad activa el texto va borroso hasta que lo miras."
          />
          <Campo
            titulo="Al pasar el ratón"
            valor={preferencias.privacidadAlcance}
            opciones={ALCANCES}
            onElegir={(privacidadAlcance) => onCambiar({ privacidadAlcance })}
            nota={
              preferencias.privacidad
                ? undefined
                : 'Solo se aplica con la privacidad activa.'
            }
          />
        </div>
      </div>
    </dialog>
  );
}

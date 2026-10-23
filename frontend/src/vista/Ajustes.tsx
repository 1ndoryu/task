/* Panel de ajustes: un modal con todos los controles de cómo se ve la lista y
 * qué se esconde. Sin cabecera ni botón de cerrar: cada control se guarda al
 * tocarlo y el modal se va con Escape o con un clic fuera. El modal y el
 * formulario son recetas compartidas (`estilos/modal.css`). */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  COLORES_NIVEL,
  type Altura,
  type AlcancePrivacidad,
  type Fuente,
  type Preferencias,
  type Tema,
} from '../logica/preferencias';
import { ColoresNivel } from './ColoresNivel';
import { PestanasLaterales } from './PestanasLaterales';

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

const TEMAS: { id: Tema; etiqueta: string }[] = [
  { id: 'claro', etiqueta: 'Claro' },
  { id: 'oscuro', etiqueta: 'Oscuro' },
];

/** Los tres bloques del panel: cómo se ve la lista, qué se esconde y los
 * colores. Cada uno cabe en una pantalla, así que no hay que recorrer una
 * tira larga para llegar al último ajuste. */
type Pestana = 'vista' | 'privacidad' | 'colores';

const TABS: { id: Pestana; etiqueta: string }[] = [
  { id: 'vista', etiqueta: 'Vista' },
  { id: 'privacidad', etiqueta: 'Privacidad' },
  { id: 'colores', etiqueta: 'Colores' },
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
  // La pestaña es del panel, no de la sesión: al abrirlo se entra por «Vista».
  const [pestana, setPestana] = useState<Pestana>('vista');
  const idPanel = useId();
  const indicePestana = TABS.findIndex((tab) => tab.id === pestana);

  useEffect(() => {
    if (abierto) setPestana('vista');
  }, [abierto]);

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    if (abierto && !nodo.open) nodo.showModal();
    if (!abierto && nodo.open) nodo.close();
  }, [abierto]);

  // Escape llega aquí; el estado vive en `usarLista`.
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
        <div className="modal__pestanas">
          <PestanasLaterales
            titulo="Bloques de los ajustes"
            valor={pestana}
            opciones={TABS}
            onElegir={setPestana}
            idBase={idPanel}
          />
          {/* Un solo cuerpo: se repinta con el bloque elegido, así los campos
              que no se ven no roban el foco ni el tabulador. */}
          <div
            className="modal__cuerpo"
            id={`${idPanel}-panel`}
            role="tabpanel"
            aria-labelledby={`${idPanel}-${indicePestana}`}
            tabIndex={-1}
          >
            {pestana === 'vista' && (
              <>
                <Campo
                  titulo="Tamaño de la fuente"
                  valor={preferencias.fuente}
                  opciones={FUENTES}
                  onElegir={(fuente) => onCambiar({ fuente })}
                />
                <Campo
                  titulo="Tamaño del texto de las notas"
                  valor={preferencias.fuenteNota}
                  opciones={FUENTES}
                  onElegir={(fuenteNota) => onCambiar({ fuenteNota })}
                  nota="Solo el texto de las notas: se lee de corrido y no tiene por qué seguir la talla de las filas."
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
                  titulo="Separar tareas y hábitos"
                  valor={preferencias.separarHabitos ? 'si' : 'no'}
                  opciones={SI_NO}
                  onElegir={(valor) => onCambiar({ separarHabitos: valor === 'si' })}
                  nota="La caja «Tareas» se parte en dos: las tareas sueltas por un lado y los hábitos sin grupo por otro. En las pestañas, «Hábitos» estrena su propia pestaña."
                />
                <Campo
                  titulo="Separar grupos en cajas"
                  valor={preferencias.separarGrupos ? 'si' : 'no'}
                  opciones={SI_NO}
                  onElegir={(valor) => onCambiar({ separarGrupos: valor === 'si' })}
                  nota="Cada grupo pasa a su propia caja, en fila, con movimiento lateral. El grupo sigue siendo el mismo: cambia dónde se pinta."
                />
                <Campo
                  titulo="Tema"
                  valor={preferencias.tema}
                  opciones={TEMAS}
                  onElegir={(tema) => onCambiar({ tema })}
                  nota="Lo mismo de noche: el oscuro es el claro con otra luz, no su negativo."
                />
              </>
            )}

            {pestana === 'privacidad' && (
              <>
                <Campo
                  titulo="Ocultar hábitos cumplidos"
                  valor={preferencias.ocultarHabitos ? 'si' : 'no'}
                  opciones={SI_NO}
                  onElegir={(valor) => onCambiar({ ocultarHabitos: valor === 'si' })}
                  nota="Solo se ven los que tocan hoy y no están hechos; el resto vuelve cuando su frecuencia lo trae. La pestaña Completados los guarda."
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
                  nota={preferencias.privacidad ? undefined : 'Solo se aplica con la privacidad activa.'}
                />
              </>
            )}

            {pestana === 'colores' && (
              <ColoresNivel
                colores={preferencias.colores}
                // Se guarda la paleta entera: un cambio toca un nivel y conserva el resto.
                onCambiar={(nivel, color) =>
                  onCambiar({ colores: { ...preferencias.colores, [nivel]: color.toLowerCase() } })
                }
                onRestablecer={() => onCambiar({ colores: { ...COLORES_NIVEL } })}
              />
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}

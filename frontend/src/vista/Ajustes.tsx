/* Panel de ajustes: un modal con todos los controles de cómo se ve la lista y
 * qué se esconde. Sin cabecera ni botón de cerrar: cada control se guarda al
 * tocarlo y el modal se va con Escape o con un clic fuera. El modal y el
 * formulario son recetas compartidas (`estilos/modal.css`). */
import { useEffect, useId, useRef, useState } from 'react';
import {
  COLORES_NIVEL,
  FUENTE_MAXIMA,
  FUENTE_MINIMA,
  FUENTE_NOTA_MAXIMA,
  FUENTE_NOTA_MINIMA,
  FUENTE_NOTA_POR_DEFECTO,
  FUENTE_POR_DEFECTO,
  type Altura,
  type AlcancePrivacidad,
  type Interlineado,
  type Preferencias,
  type Tema,
} from '../logica/preferencias';
import { hoyLogico } from '../logica/fechas';
import type { Tolerancia } from '../logica/orden';
import { CajaVisible, Campo } from './AjustesCampos';
import { CampoTamano } from './CampoTamano';
import { ColoresNivel } from './ColoresNivel';
import { PanelAlgoritmo } from './PanelAlgoritmo';
import { PanelDia } from './PanelDia';
import { PestanasLaterales } from './PestanasLaterales';

const ALTURAS: { id: Altura; etiqueta: string }[] = [
  { id: 'compacta', etiqueta: 'Compacta' },
  { id: 'normal', etiqueta: 'Normal' },
  { id: 'amplia', etiqueta: 'Amplia' },
];

const INTERLINEADOS: { id: Interlineado; etiqueta: string }[] = [
  { id: 'ajustado', etiqueta: 'Ajustado' },
  { id: 'normal', etiqueta: 'Normal' },
  { id: 'amplio', etiqueta: 'Amplio' },
];

const ALCANCES: { id: AlcancePrivacidad; etiqueta: string }[] = [
  { id: 'una', etiqueta: 'Solo la del ratón' },
  { id: 'todas', etiqueta: 'Todas' },
];

const TEMAS: { id: Tema; etiqueta: string }[] = [
  { id: 'claro', etiqueta: 'Claro' },
  { id: 'oscuro', etiqueta: 'Oscuro' },
];

/** Los cinco bloques del panel: la lista, las notas, las cajas que se ven,
 * qué se esconde y los colores. Cada uno cabe en una pantalla, así que no hay que
 * recorrer una tira larga para llegar al último ajuste. Las notas tienen bloque
 * propio porque su texto se lee de corrido y no comparte talla ni aire con las filas. */
type Pestana = 'vista' | 'notas' | 'cajas' | 'inteligente' | 'algoritmo' | 'dia' | 'privacidad' | 'colores';

const TABS: { id: Pestana; etiqueta: string }[] = [
  { id: 'vista', etiqueta: 'Vista' },
  { id: 'notas', etiqueta: 'Notas' },
  { id: 'cajas', etiqueta: 'Cajas' },
  { id: 'inteligente', etiqueta: 'Inteligente' },
  { id: 'algoritmo', etiqueta: 'Algoritmo' },
  { id: 'dia', etiqueta: 'Día' },
  { id: 'privacidad', etiqueta: 'Privacidad' },
  { id: 'colores', etiqueta: 'Colores' },
];

/* Los cuatro niveles del legacy, más «Libre», que no sube la urgencia por días. */
const TOLERANCIAS: { id: Tolerancia; etiqueta: string }[] = [
  { id: 'muyEstricto', etiqueta: 'Muy estricto' },
  { id: 'estricto', etiqueta: 'Estricto' },
  { id: 'moderado', etiqueta: 'Moderado' },
  { id: 'relajado', etiqueta: 'Relajado' },
  { id: 'libre', etiqueta: 'Libre' },
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
            {/* Primero el aspecto general, luego las filas y por último cómo se
                parten las cajas: de lo más global a lo más concreto. */}
            {pestana === 'vista' && (
              <>
                <Campo
                  titulo="Tema"
                  valor={preferencias.tema}
                  opciones={TEMAS}
                  onElegir={(tema) => onCambiar({ tema })}
                  nota="Lo mismo de noche: el oscuro es el claro con otra luz, no su negativo."
                />
                <CampoTamano
                  titulo="Tamaño de la fuente de las filas"
                  valor={preferencias.fuente}
                  minima={FUENTE_MINIMA}
                  maxima={FUENTE_MAXIMA}
                  porDefecto={FUENTE_POR_DEFECTO}
                  muestra="Una tarea de la lista, con su subhábito debajo"
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
                  titulo="Separar tareas y hábitos"
                  valor={preferencias.separarHabitos ? 'si' : 'no'}
                  opciones={SI_NO}
                  onElegir={(valor) => onCambiar({ separarHabitos: valor === 'si' })}
                  nota="La caja «Tareas» se parte en dos: las tareas sueltas por un lado y los hábitos sin grupo por otro. En las pestañas, «Hábitos» estrena la suya."
                />
                <Campo
                  titulo="Separar grupos en cajas"
                  valor={preferencias.separarGrupos ? 'si' : 'no'}
                  opciones={SI_NO}
                  onElegir={(valor) => onCambiar({ separarGrupos: valor === 'si' })}
                  nota="Cada grupo pasa a su propia caja, en fila, con movimiento lateral. El grupo sigue siendo el mismo: cambia dónde se pinta."
                />
              </>
            )}

            {pestana === 'cajas' && (
              <div className="campo">
                <p className="campo__titulo">Cajas visibles</p>
                <ul className="casillas">
                  <CajaVisible
                    nombre="Aplazado"
                    visible={preferencias.mostrarAplazados}
                    onCambiar={(visible) => onCambiar({ mostrarAplazados: visible })}
                    nota="Apagada desaparece la caja «Aplazado», también de las pestañas. Lo aplazado sigue aplazado: vuelve solo cuando llega su fecha."
                  />
                  <CajaVisible
                    nombre="Completados"
                    visible={preferencias.mostrarCompletados}
                    onCambiar={(visible) => onCambiar({ mostrarCompletados: visible })}
                    nota="Apagada desaparece la caja «Completados», también de las pestañas. Lo hecho sigue guardado: vuelve a verse al encenderla."
                  />
                  <CajaVisible
                    nombre="Archivados"
                    visible={preferencias.mostrarArchivados}
                    onCambiar={(visible) => onCambiar({ mostrarArchivados: visible })}
                    nota="Apagada desaparece el panel «Archivados», con sus grupos y sus notas. Nada se borra: para recuperar algo, vuelve a encenderla."
                  />
                  <CajaVisible
                    nombre="Diario"
                    visible={preferencias.mostrarDiario}
                    onCambiar={(visible) => onCambiar({ mostrarDiario: visible })}
                    nota="Apagada desaparece la caja «Diario» y su pestaña. Lo escrito en cada día sigue guardado: vuelve al encenderla."
                  />
                </ul>
              </div>
            )}

            {pestana === 'notas' && (
              <>
                <CampoTamano
                  titulo="Tamaño del texto de las notas"
                  valor={preferencias.fuenteNota}
                  minima={FUENTE_NOTA_MINIMA}
                  maxima={FUENTE_NOTA_MAXIMA}
                  porDefecto={FUENTE_NOTA_POR_DEFECTO}
                  muestra="Una nota se lee de corrido, sin filas ni casillas."
                  onElegir={(fuenteNota) => onCambiar({ fuenteNota })}
                  nota="Solo el texto de las notas: se lee de corrido y no tiene por qué seguir la talla de las filas."
                />
                <Campo
                  titulo="Interlineado de las notas"
                  valor={preferencias.interlineadoNota}
                  opciones={INTERLINEADOS}
                  onElegir={(interlineadoNota) => onCambiar({ interlineadoNota })}
                  nota="El aire entre líneas se mide con la talla elegida, así que crece o se aprieta con ella. Las filas no lo usan."
                />
              </>
            )}

            {pestana === 'inteligente' && (
              <>
                <Campo
                  titulo="Nivel de estricto"
                  valor={preferencias.tolerancia}
                  opciones={TOLERANCIAS}
                  onElegir={(tolerancia) => onCambiar({ tolerancia })}
                  nota="Cuántos días sin hacer un hábito lo suben a urgente y a bloqueante. «Libre» no lo sube nunca."
                />
                {/* Reiniciar no borra nada: solo fija desde hoy el conteo de la inactividad. */}
                <div className="campo">
                  <p className="campo__titulo">Valoración de la urgencia</p>
                  <button
                    type="button"
                    className="boton"
                    onClick={() => onCambiar({ reinicioUrgencia: hoyLogico() })}
                  >
                    Reiniciar la valoración
                  </button>
                  <p className="campo__nota">
                    Los hábitos cuentan su inactividad desde hoy. El historial no cambia.
                  </p>
                </div>
              </>
            )}
            {pestana === 'algoritmo' && (
              <PanelAlgoritmo algoritmo={preferencias.algoritmo} onCambiar={(algoritmo) => onCambiar({ algoritmo })} />
            )}
            {pestana === 'dia' && <PanelDia finDia={preferencias.finDia} onCambiar={(finDia) => onCambiar({ finDia })} />}
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
                <Campo
                  titulo="Mostrar siempre la primera"
                  valor={preferencias.primeraVisible ? 'si' : 'no'}
                  opciones={SI_NO}
                  onElegir={(valor) => onCambiar({ primeraVisible: valor === 'si' })}
                  nota="Con la privacidad activa, la primera tarea o hábito de cada caja se lee sin pasar el ratón: sabes por dónde empieza la lista sin enseñar el resto."
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

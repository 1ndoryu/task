/* Alta rápida desde la propia lista: un campo sin caja sobre la primera fila y
 * tres iconos para lo que no se ve (tipo y grupo, importancia, frecuencia).
 * Sin botón: Enter crea y Escape limpia, como el input del front original.
 * El grupo por defecto es la pestaña abierta, así que lo escrito se queda
 * donde se está mirando. La configuración no abre un modal: se ajusta aquí
 * mismo y sobrevive al alta, para dar de alta varias seguidas iguales.
 * El icono de la izquierda dice qué se va a crear: una tarea no lleva la
 * flecha de frecuencia, y el hábito, sí. */
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { usarCierreFuera } from './usarCierreFuera';
import { FRECUENCIAS, frecuenciaDe } from '../logica/frecuencia';
import type { NivelPrioridad } from '../logica/importancia';
import type { ColoresNivel } from '../logica/preferencias';
import type { FrecuenciaDetalle, Habito } from '../logica/tipos';
import { FrecuenciaCampos } from './FrecuenciaCampos';
import { IconoCarpeta, IconoFrecuencia, IconoHabito, IconoTarea } from './Iconos';
import { Menu } from './Menu';
import { gruposMenu, prioridadesMenu } from './MenuOpciones';

/** Lo que basta para dar de alta una fila; el id lo pone `usarLista`. */
export type NuevaFila =
  | { tipo: 'tarea'; texto: string; prioridad: NivelPrioridad; grupo: string | null }
  | { tipo: 'habito'; texto: string; prioridad: NivelPrioridad; grupo: string | null; frecuencia: FrecuenciaDetalle };

/** Un hábito vacío con el que leer los valores por defecto de la frecuencia. */
const SIN_HABITO = { id: 0, nombre: '' } as Habito;

interface Props {
  /** Pestaña abierta; es el grupo por defecto del alta. */
  grupo: string | null;
  grupos: string[];
  /** Paleta de la usuaria: cada nivel se elige viendo su círculo. */
  colores: ColoresNivel;
  onCrear: (fila: NuevaFila) => void;
  /** La pestaña de completados no da de alta: ahí no hay nada que añadir. */
  oculto: boolean;
  /** Caja separada: solo da de alta esa clase de fila y la otra no se ofrece. */
  solo?: 'tareas' | 'habitos';
}

export function NuevaFila({ grupo, grupos, colores, onCrear, oculto, solo }: Props) {
  const [texto, setTexto] = useState('');
  const [elegido, setTipo] = useState<'tarea' | 'habito'>('tarea');
  // Con la caja fijada a una clase, manda la caja: el estado no la cambia (el
  // alta es el mismo componente al saltar de pestaña y conservaría el tipo).
  const tipo = solo === 'habitos' ? 'habito' : solo === 'tareas' ? 'tarea' : elegido;
  const [prioridad, setPrioridad] = useState<NivelPrioridad>('media');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaDetalle>(() => frecuenciaDe(SIN_HABITO));
  // La pestaña manda, pero se puede apuntar a otro grupo sin cambiar de vista.
  const [grupoElegido, setGrupoElegido] = useState<string | null>(grupo);
  useEffect(() => setGrupoElegido(grupo), [grupo]);
  const [panel, setPanel] = useState<'frecuencia' | null>(null);

  if (oculto) return null;

  const crear = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    const base = { texto: limpio, prioridad, grupo: grupoElegido };
    onCrear(tipo === 'tarea' ? { tipo, ...base } : { tipo: 'habito', ...base, frecuencia });
    setTexto('');
  };

  const nombreFrecuencia = FRECUENCIAS.find((f) => f.id === (frecuencia.tipo ?? 'diario'))?.etiqueta ?? '';

  return (
    <div className="alta">
      <input
        className="alta__campo"
        placeholder={tipo === 'tarea' ? 'Nueva tarea…' : 'Nuevo hábito…'}
        aria-label={tipo === 'tarea' ? 'Nueva tarea' : 'Nuevo hábito'}
        maxLength={120}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') crear();
          else if (evento.key === 'Escape') setTexto('');
        }}
      />

      {/* Importancia: los cinco niveles con su círculo de color, el mismo que
          llevará el punto de la fila. La paleta entra como token; el color lo
          pone la hoja, igual que en el menú y en la muestra del nivel. */}
      <Menu
        etiqueta={
          <span className="alta__nivel">
            <span className="alta__punto" style={{ '--color-nivel': colores[prioridad] } as CSSProperties} />
          </span>
        }
        titulo={`Importancia: ${prioridad.replace('_', ' ')}`}
        claseBoton="barra__boton barra__icono"
        items={prioridadesMenu(colores, prioridad)}
        onElegir={(id) => setPrioridad(id.replace('prioridad-', '') as NivelPrioridad)}
      />

      <Menu
        etiqueta={<IconoCarpeta />}
        titulo={`Grupo: ${grupoElegido ?? 'Sin grupo'}`}
        claseBoton="barra__boton barra__icono"
        items={gruposMenu(grupos, grupoElegido)}
        onElegir={(id) => setGrupoElegido(id === 'grupo-' ? null : id.slice('grupo-'.length))}
      />

      {/* La frecuencia solo existe en un hábito: en una tarea el botón no se
          pinta. Apagado ocupaba sitio por algo que no se puede usar. */}
      {tipo === 'habito' && (
        <Panel
          etiqueta={<IconoFrecuencia />}
          titulo={`Frecuencia: ${nombreFrecuencia}`}
          abierto={panel === 'frecuencia'}
          onAbrir={(abierto) => setPanel(abierto ? 'frecuencia' : null)}
        >
          <FrecuenciaCampos
            frecuencia={frecuencia}
            onCambiar={(cambios) => setFrecuencia((previa) => ({ ...previa, ...cambios }))}
          />
        </Panel>
      )}

      {/* Qué se crea, al final de la fila: casilla para tarea, vuelta para
          hábito. Es lo último que se elige, porque lo normal es escribir el
          texto y dejarlo como tarea. En una caja separada no hay elección: el
          icono solo dice qué se va a crear. */}
      {solo ? (
        <span className="alta__tipo" aria-hidden="true">
          {tipo === 'tarea' ? <IconoTarea /> : <IconoHabito />}
        </span>
      ) : (
        <Menu
          etiqueta={tipo === 'tarea' ? <IconoTarea /> : <IconoHabito />}
          titulo={tipo === 'tarea' ? 'Tarea' : 'Hábito'}
          claseBoton="barra__boton barra__icono"
          items={[
            { id: 'tarea', etiqueta: 'Tarea', activo: tipo === 'tarea', icono: <IconoTarea /> },
            { id: 'habito', etiqueta: 'Hábito', activo: tipo === 'habito', icono: <IconoHabito /> },
          ]}
          onElegir={(id) => setTipo(id as 'tarea' | 'habito')}
        />
      )}
    </div>
  );
}

/** Desplegable con contenido libre: mismo recorte y cierre que `Menu`, pero
 * para controles que no son una lista de opciones. */
function Panel({
  etiqueta,
  titulo,
  abierto,
  onAbrir,
  children,
}: {
  etiqueta: ReactNode;
  titulo: string;
  abierto: boolean;
  onAbrir: (abierto: boolean) => void;
  children: ReactNode;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const idPanel = useId();
  const boton = useRef<HTMLButtonElement>(null);

  usarCierreFuera({ activo: abierto, dentro: [contenedor], alFuera: () => onAbrir(false) });

  // El panel se ancla al borde derecho del botón, no del contenedor: así su
  // borde derecho cae en la misma vertical que los iconos de la cabecera.
  // El desplazamiento se escribe en el nodo (no con `style={{}}`) porque sale
  // de medidas en vivo; es el mismo patrón que `Menu`. En pantallas estrechas
  // manda la hoja, que lo cuelga del borde izquierdo.
  const desplazar = (nodo: HTMLDivElement | null) => {
    const disparador = boton.current;
    const caja = contenedor.current?.getBoundingClientRect();
    if (!nodo || !disparador || !caja || window.innerWidth <= 480) return;
    nodo.style.right = `${disparador.getBoundingClientRect().right - caja.right}px`;
  };

  return (
    <div className="menu" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className="barra__boton barra__icono"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        aria-label={titulo}
        title={titulo}
        onClick={() => onAbrir(!abierto)}
      >
        {etiqueta}
      </button>
      {abierto && (
        <div
          className="menu__panel alta__panel"
          id={idPanel}
          role="dialog"
          aria-label={titulo}
          ref={desplazar}
        >
          {children}
        </div>
      )}
    </div>
  );
}

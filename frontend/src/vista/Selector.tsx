/* Selector propio con búsqueda: el valor vigente en un botón y, al abrirlo,
 * una caja con un campo para filtrar y la lista de opciones, agrupada por
 * bloques. Sustituye al `<select>` nativo y al
 * `<datalist>` de la configuración: el navegador no deja filtrar sus listas ni
 * darles el tamaño del diseño.
 * La caja se pinta `fixed` porque el cuerpo del modal tiene scroll propio y un
 * panel absoluto quedaría recortado por él; por eso se cierra al desplazar. */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as TeclaReact,
} from 'react';
import { usarCierreFuera } from './usarCierreFuera';

export interface OpcionSelector {
  id: string;
  etiqueta: string;
  /** Texto extra por el que también se busca (la fecha numérica, por ejemplo). */
  buscar?: string;
  /** Bloque al que pertenece: se pinta como título cuando cambia. */
  grupo?: string;
}

interface Props {
  /** Id de la opción vigente; `''` es el valor vacío («Sin grupo»). */
  valor: string;
  opciones: OpcionSelector[];
  onElegir: (id: string) => void;
  /** Lo que se ve cuando no hay valor. */
  vacio: string;
  /** Nombre accesible del botón. */
  etiqueta: string;
  /** Texto libre: si lo escrito no existe, se ofrece como opción nueva. */
  onCrear?: (texto: string) => void;
}

/** Sin acentos ni mayúsculas: «Miércoles» se encuentra escribiendo «miercoles». */
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Alto en píxeles que se le supone a la caja al decidir si cabe debajo. */
const ALTO_CAJA = 15 * 16;

const MARGEN = 8;

function Caret() {
  return (
    <svg
      className="selector__flecha"
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function Selector({ valor, opciones, onElegir, vacio, etiqueta, onCrear }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [activo, setActivo] = useState(0);
  const disparador = useRef<HTMLButtonElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const filtroRef = useRef<HTMLInputElement>(null);
  const opcionesRef = useRef(new Map<string, HTMLButtonElement>());
  const idPanel = useId();

  const vigente = opciones.find((opcion) => opcion.id === valor);

  const filtradas = useMemo(() => {
    const busca = normalizar(filtro);
    if (!busca) return opciones;
    // El bloque también cuenta: escribir «octubre» deja todas las fechas del mes.
    return opciones.filter((opcion) =>
      normalizar(`${opcion.etiqueta} ${opcion.buscar ?? ''} ${opcion.grupo ?? ''}`).includes(busca),
    );
  }, [opciones, filtro]);

  // Texto que no es ninguna opción y que el campo acepta como valor nuevo.
  const texto = filtro.trim();
  const creable = Boolean(
    onCrear && texto && !opciones.some((opcion) => normalizar(opcion.etiqueta) === normalizar(texto)),
  );

  const cerrar = (devolverFoco = false) => {
    setAbierto(false);
    setFiltro('');
    if (devolverFoco) disparador.current?.focus();
  };

  // Al abrir: el filtro vacío y el cursor sobre el valor vigente.
  useEffect(() => {
    if (!abierto) return;
    setFiltro('');
    setActivo(Math.max(0, opciones.findIndex((opcion) => opcion.id === valor)));
    // Solo al abrir; mientras está abierto manda el teclado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Colocación: debajo del botón si cabe; si no, encima. La caja se pinta
  // `fixed`, así que la posición sale de medidas en vivo y se escribe en el
  // nodo (no con `style={{}}`), el mismo patrón que `Menu`.
  const colocar = (nodo: HTMLDivElement | null) => {
    const sitio = nodo && disparador.current?.getBoundingClientRect();
    if (!nodo || !sitio) return;
    const ancho = Math.max(sitio.width, 12 * 16);
    nodo.style.width = `${ancho}px`;
    nodo.style.left = `${Math.max(MARGEN, Math.min(sitio.left, window.innerWidth - ancho - MARGEN))}px`;
    // Si no cabe debajo pero tampoco arriba, se cuelga de abajo y desplaza.
    if (sitio.bottom + ALTO_CAJA <= window.innerHeight - MARGEN || sitio.top < ALTO_CAJA) {
      nodo.style.top = `${sitio.bottom + 4}px`;
      nodo.style.bottom = '';
    } else {
      nodo.style.top = '';
      nodo.style.bottom = `${window.innerHeight - sitio.top + 4}px`;
    }
  };

  // Al abrir, el cursor va al filtro para poder escribir sin buscar el campo.
  useEffect(() => {
    if (abierto) filtroRef.current?.focus();
  }, [abierto]);

  // Fuera del selector o Escape lo cierran (Escape en captura: no cierra también
  // al modal que lo contiene) y devuelven el foco al botón.
  usarCierreFuera({
    activo: abierto,
    dentro: [contenedor],
    alFuera: () => setAbierto(false),
    alEscape: () => {
      setAbierto(false);
      disparador.current?.focus();
    },
    capturaEscape: true,
  });

  // Desplazar también lo cierra, porque la caja no acompaña al contenido que se
  // mueve por debajo; la propia lista desplaza y no cuenta.
  useEffect(() => {
    if (!abierto) return;
    const alDesplazar = (evento: Event) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    window.addEventListener('scroll', alDesplazar, true);
    return () => window.removeEventListener('scroll', alDesplazar, true);
  }, [abierto]);

  // La opción activa por teclado se mantiene a la vista.
  useEffect(() => {
    const opcion = filtradas[activo];
    if (opcion) opcionesRef.current.get(opcion.id)?.scrollIntoView({ block: 'nearest' });
  }, [activo, filtradas]);

  const elegir = (id: string) => {
    onElegir(id);
    cerrar(true);
  };

  const crear = () => {
    if (!onCrear || !texto) return;
    onCrear(texto);
    cerrar(true);
  };

  /** Teclado del filtro: flechas dentro de la lista, Enter para elegir. */
  const alTeclearFiltro = (evento: TeclaReact<HTMLInputElement>) => {
    const total = filtradas.length + (creable ? 1 : 0);
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (total === 0) return;
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      setActivo((previo) => (previo + paso + total) % total);
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      if (activo >= filtradas.length) {
        if (creable) crear();
      } else if (filtradas[activo]) {
        elegir(filtradas[activo].id);
      } else if (creable) {
        crear();
      }
    } else if (evento.key === 'Tab') {
      cerrar();
    }
  };

  return (
    <div className="selector" ref={contenedor}>
      <button
        type="button"
        ref={disparador}
        className="selector__disparador"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        aria-label={etiqueta}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
      >
        <span className={`selector__valor${vigente ? '' : ' selector__valor--vacio'}`}>
          {vigente?.etiqueta ?? vacio}
        </span>
        <Caret />
      </button>

      {abierto && (
        <div className="selector__panel" ref={colocar}>
          <input
            ref={filtroRef}
            className="entrada selector__filtro"
            value={filtro}
            placeholder="Buscar…"
            aria-label={`Buscar ${etiqueta.toLowerCase()}`}
            aria-controls={idPanel}
            autoComplete="off"
            onChange={(evento) => {
              setFiltro(evento.target.value);
              setActivo(0);
            }}
            onKeyDown={alTeclearFiltro}
          />
          <ul className="selector__lista" role="listbox" id={idPanel} aria-label={etiqueta}>
            {filtradas.map((opcion, indice) => {
              const separa = opcion.grupo && opcion.grupo !== filtradas[indice - 1]?.grupo;
              return (
                <li key={opcion.id || 'vacio'}>
                  {separa && <p className="selector__bloque">{opcion.grupo}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={opcion.id === valor}
                    className={`selector__opcion${indice === activo ? ' selector__opcion--activo' : ''}`}
                    ref={(nodo) => {
                      if (nodo) opcionesRef.current.set(opcion.id, nodo);
                      else opcionesRef.current.delete(opcion.id);
                    }}
                    onPointerEnter={() => setActivo(indice)}
                    onClick={() => elegir(opcion.id)}
                  >
                    {/* Columna fija: la marca no desplaza el texto de sus vecinas. */}
                    <span className="selector__marca" aria-hidden="true">
                      {opcion.id === valor ? '·' : ''}
                    </span>
                    {opcion.etiqueta}
                  </button>
                </li>
              );
            })}
            {creable && (
              <li>
                <button
                  type="button"
                  className={`selector__opcion${activo === filtradas.length ? ' selector__opcion--activo' : ''}`}
                  onPointerEnter={() => setActivo(filtradas.length)}
                  onClick={crear}
                >
                  <span className="selector__marca" aria-hidden="true" />
                  Crear «{texto}»
                </button>
              </li>
            )}
            {filtradas.length === 0 && !creable && <li className="selector__nada">Nada coincide.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

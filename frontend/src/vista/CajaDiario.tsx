/* Caja «Diario»: una entrada por día, dividible en capítulos. Es una `CajaNota`
 * con otra cabecera: las flechas de día van junto al título (la fecha) y las de
 * capítulo abajo, con «+» y «−» entre ellas.
 *
 * El día y el capítulo visibles viven aquí y no en `usarNotas`: son estado de la
 * vista. Lo escrito se guarda por capítulo a través de `acceso`. */
import { useState, type ReactNode } from 'react';
import { fechaEnPalabras, sumarDias } from '../logica/fechas';
import type { Preferencias, TamanoCaja } from '../logica/preferencias';
import { SelectorDia } from './SelectorDia';
import { CajaNota } from './CajaNota';
import { IconoAnterior, IconoSiguiente } from './IconosDiario';
import type { AccesoDiario } from './usarNotas';

interface Props {
  idPanel: string;
  /** Día de hoy: la fecha más reciente a la que se puede avanzar. */
  hoy: string;
  preferencias: Preferencias;
  acceso: AccesoDiario;
  tamano?: TamanoCaja;
  onTamano?: (tamano: TamanoCaja | undefined) => void;
  minimizada?: boolean;
  /** Botón de minimizar de la cabecera, ya montado por la vista. */
  botonMinimizar?: ReactNode;
}

export function CajaDiario({ idPanel, hoy, preferencias, acceso, tamano, onTamano, minimizada, botonMinimizar }: Props) {
  // Arranca en hoy, capítulo 1: al abrir el diario se ve lo de hoy, no un día viejo.
  const [fecha, setFecha] = useState(hoy);
  const [capitulo, setCapitulo] = useState(1);
  // Sube al borrar: el campo se monta de nuevo y no enseña el texto borrado.
  const [version, setVersion] = useState(0);
  const esHoy = fecha >= hoy;
  const titulo = fechaEnPalabras(fecha);

  const capitulos = acceso.capitulos(fecha);
  // Un capítulo que ya no existe cae en el primero; así la caja nunca queda en blanco.
  const actual = capitulos.includes(capitulo) ? capitulo : 1;
  const posicion = capitulos.indexOf(actual);
  const ultimo = posicion === capitulos.length - 1;

  const cambiarDia = (dias: number) => {
    setFecha(sumarDias(fecha, dias));
    setCapitulo(1);
  };

  const crearCapitulo = () => setCapitulo(acceso.nuevo(fecha));

  const borrarCapitulo = () => {
    // Un capítulo con texto se confirma antes: borrarlo no tiene vuelta atrás.
    const tieneTexto = acceso.textoDe(fecha, actual).trim() !== '';
    if (tieneTexto && !window.confirm('¿Borrar este capítulo y su texto?')) return;
    acceso.borrar(fecha, actual);
    // Tras borrar se queda en el anterior; si era el 1, sigue el 1 (queda vacío).
    setCapitulo(capitulos[Math.max(posicion - 1, 0)]);
    setVersion((v) => v + 1);
  };

  return (
    <CajaNota
      // Cada día y capítulo es una nota distinta: al cambiar, el campo se monta de
      // nuevo y no arrastra el texto del anterior.
      key={`${fecha}#${actual}#${version}`}
      idPanel={idPanel}
      preferencias={preferencias}
      titulo={titulo}
      texto={acceso.textoDe(fecha, actual)}
      onEscribir={(contenido) => acceso.escribir(fecha, actual, contenido)}
      onConfirmar={() => acceso.confirmar(fecha, actual)}
      tamano={tamano}
      onTamano={onTamano}
      minimizada={minimizada}
      // Los días van en el centro de la cabecera, junto a la fecha; minimizar, a la derecha.
      cabecera={
        <header className="barra barra--centrada">
          <div className="diario__dias">
            <button
              type="button"
              className="barra__boton barra__icono"
              aria-label="Día anterior"
              title="Día anterior"
              onClick={() => cambiarDia(-1)}
            >
              <IconoAnterior />
            </button>
            <SelectorDia
              texto={titulo}
              fecha={fecha}
              hoy={hoy}
              marcados={acceso.diasEscritos()}
              onElegir={(dia) => {
                setFecha(dia);
                setCapitulo(1);
              }}
            />
            <button
              type="button"
              className="barra__boton barra__icono"
              aria-label="Día siguiente"
              title={esHoy ? 'Hoy: no hay días posteriores' : 'Día siguiente'}
              disabled={esHoy}
              onClick={() => cambiarDia(1)}
            >
              <IconoSiguiente />
            </button>
          </div>
          <div className="barra__acciones">{botonMinimizar}</div>
        </header>
      }
      // Abajo, los capítulos del día: flechas para moverse y «+» / «−» para crear y borrar.
      pie={
        <footer className="caja__pie diario__capitulos">
          <button
            type="button"
            className="barra__boton barra__icono"
            aria-label="Capítulo anterior"
            title="Capítulo anterior"
            disabled={posicion === 0}
            onClick={() => setCapitulo(capitulos[posicion - 1])}
          >
            <IconoAnterior />
          </button>
          <div className="diario__grupo">
            <span className="diario__cuenta">
              cap. {posicion + 1}/{capitulos.length}
            </span>
            <button type="button" className="barra__boton" aria-label="Nuevo capítulo" title="Nuevo capítulo" onClick={crearCapitulo}>
              +
            </button>
            <button type="button" className="barra__boton" aria-label="Borrar capítulo" title="Borrar capítulo" onClick={borrarCapitulo}>
              −
            </button>
          </div>
          <button
            type="button"
            className="barra__boton barra__icono"
            aria-label="Capítulo siguiente"
            title="Capítulo siguiente"
            disabled={ultimo}
            onClick={() => setCapitulo(capitulos[posicion + 1])}
          >
            <IconoSiguiente />
          </button>
        </footer>
      }
    />
  );
}

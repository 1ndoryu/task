/* Lo que va dentro de una caja, según el tipo de su panel. La cabecera la pone
 * cada forma de la vista y aquí se decide si es una nota o una lista de filas,
 * con su filtro y su orden. Vive aparte de `Lista` porque es la parte larga
 * del reparto y solo depende del panel, no de en qué rama de la vista esté. */
import type { ReactNode } from 'react';
import type { Dashboard } from '../logica/tipos';
import type { Preferencias, TamanoCaja } from '../logica/preferencias';
import type { ModoOrden } from '../logica/orden';
import type { Panel } from '../logica/paneles';
import { progresoHabitos, seleccionar, type Fila as FilaDatos } from '../logica/seleccion';
import type { AccionesFila } from './accionesFila';
import { MenuOrdenCaja } from './AccionesBarra';
import { BotonMinimizar } from './BotonMinimizar';
import { Caja } from './Caja';
import { CajaDiario } from './CajaDiario';
import { CajaNota } from './CajaNota';
import { NuevaFila, type NuevaFila as DatosNuevaFila } from './NuevaFila';
import type { AccesoDiario } from './usarNotas';
import type { ContextoPanel, TituloPanel } from './usarVista';

interface Props {
  panel: Panel;
  datos: Dashboard;
  preferencias: Preferencias;
  /** Grupos de verdad, para el alta rápida y el menú de la fila. */
  grupos: string[];
  acciones: AccionesFila;
  ordenDe: (panel: string) => ModoOrden;
  cambiarOrdenCaja: (panel: string, modo: ModoOrden) => void;
  crear: (fila: DatosNuevaFila) => void;
  hoy: string;
  saliendo: ReadonlySet<string>;
  nota: (panel: string) => { texto: string; escribir: (contenido: string) => void; confirmar: () => void } | null;
  /** Entradas del diario por día, para la caja «Diario». */
  diario: AccesoDiario;
  titulo: TituloPanel;
  contextoDe: ContextoPanel;
  /** Menú de fila abierto con clic derecho; lo comparte toda la vista. */
  menuAbierto: { clave: string; x: number; y: number } | null;
  onMenuAbierto: (punto: { clave: string; x: number; y: number } | null) => void;
  /** Filas con los hijos plegados, por clave `panel:fila`. */
  plegadas: ReadonlySet<string>;
  onPlegar: (clave: string) => void;
  /** Con esto cada caja lleva asa: solo en el carril, donde hay sitio. */
  redimensionable?: boolean;
  onTamano: (id: string, tamano: TamanoCaja | undefined) => void;
  /** Con esto cada caja lleva botón de minimizar: solo en el carril. */
  onMinimizar?: (id: string) => void;
}

export function ContenidoPanel({
  panel,
  datos,
  preferencias,
  grupos,
  acciones,
  ordenDe,
  cambiarOrdenCaja,
  crear,
  hoy,
  saliendo,
  nota,
  diario,
  titulo,
  contextoDe,
  menuAbierto,
  onMenuAbierto,
  plegadas,
  onPlegar,
  redimensionable,
  onTamano,
  onMinimizar,
}: Props): ReactNode {
  const tipo = panel.tipo;
  const conMenu = contextoDe(panel);
  // Sin carril no hay botón: allí solo se ve una caja y plegarla no deja nada.
  const minimizada = !!onMinimizar && preferencias.minimizadas.includes(panel.id);
  const botonMinimizar = onMinimizar && (
    <BotonMinimizar minimizada={minimizada} onAlternar={() => onMinimizar(panel.id)} />
  );
  // El diario no tiene menú ni alta: es una sola caja que cambia de día.
  if (tipo === 'diario') {
    return (
      <CajaDiario
        idPanel={panel.id}
        hoy={hoy}
        preferencias={preferencias}
        acceso={diario}
        tamano={redimensionable ? preferencias.tamanos[panel.id] : undefined}
        onTamano={redimensionable ? (tamano) => onTamano(panel.id, tamano) : undefined}
        minimizada={minimizada}
        botonMinimizar={botonMinimizar}
      />
    );
  }
  if (tipo === 'nota') {
    const laNota = nota(panel.id);
    if (!laNota) return null;
    return (
      <CajaNota
        idPanel={panel.id}
        preferencias={preferencias}
        titulo={panel.etiqueta}
        texto={laNota.texto}
        onEscribir={laNota.escribir}
        onConfirmar={laNota.confirmar}
        tamano={redimensionable ? preferencias.tamanos[panel.id] : undefined}
        onTamano={redimensionable ? (tamano) => onTamano(panel.id, tamano) : undefined}
        // Mismo gesto que en la caja de lista: el clic derecho es del panel.
        onContexto={conMenu}
        minimizada={minimizada}
        cabecera={
          <header className="barra">
            {titulo(panel, 'barra__titulo')}
            {/* Borrar y archivar viven en el menú contextual de la caja, junto
                a renombrar: aquí solo va el botón de minimizar. */}
            <div className="barra__acciones">{botonMinimizar}</div>
          </header>
        }
      />
    );
  }
  // Tareas, hábitos, completados y aplazados: la misma caja de lista, con su
  // grupo y su orden. Con la vista separada, el panel de hábitos y el de
  // «Tareas» —que ya no es el de todo— solo enseñan su clase de fila.
  const solo =
    tipo === 'habitos' ? 'habitos' : preferencias.separarHabitos && panel.fija && tipo === 'tareas' ? 'tareas' : undefined;
  const vista = seleccionar(datos, {
    orden: ordenDe(panel.id),
    grupo: panel.grupo,
    // La pestaña de completados la dice el tipo del panel, no su grupo.
    completados: tipo === 'completados',
    ocultarHabitos: preferencias.ocultarHabitos,
    solo,
    hoy,
    saliendo,
  });
  // Aplazado no filtra por grupo: su lista es la de los aplazados de toda la
  // vista, ya ordenada por fecha de vuelta. Tampoco da de alta: lo que entra
  // ahí entra aplazando un hábito, no escribiéndolo.
  const filas: FilaDatos[] = tipo === 'aplazados' ? vista.aplazados : vista.filas;
  return (
    <Caja
      idPanel={panel.id}
      etiqueta={panel.etiqueta}
      preferencias={preferencias}
      cabecera={
        <header className="barra">
          {titulo(panel, 'barra__titulo')}
          <div className="barra__acciones">
            {/* Toda caja ordena la suya, también las de sistema: `fija` habla
                de la identidad (no se renombra ni se borra), no del orden. Con
                la condición de antes, al separar hábitos y tareas las dos cajas
                resultantes se quedaban sin la elección. */}
            <MenuOrdenCaja
              panel={panel}
              orden={ordenDe(panel.id)}
              onElegir={(modo: ModoOrden) => cambiarOrdenCaja(panel.id, modo)}
            />
            {botonMinimizar}
          </div>
        </header>
      }
      alta={
        <NuevaFila
          grupo={panel.grupo}
          grupos={grupos}
          colores={preferencias.colores}
          onCrear={crear}
          oculto={tipo === 'completados' || tipo === 'aplazados'}
          solo={solo}
        />
      }
      filas={filas}
      saliendo={saliendo}
      completados={vista.completados}
      acciones={acciones}
      grupos={grupos}
      colores={preferencias.colores}
      hoy={hoy}
      menuAbierto={menuAbierto}
      onMenuAbierto={onMenuAbierto}
      plegadas={plegadas}
      onPlegar={onPlegar}
      tamano={redimensionable ? preferencias.tamanos[panel.id] : undefined}
      onTamano={redimensionable ? (tamano) => onTamano(panel.id, tamano) : undefined}
      minimizada={minimizada}
      progreso={tipo === 'habitos' ? progresoHabitos(datos, panel.grupo ?? null, hoy) : undefined}
      // El menú del panel también nace de la caja: en cajas es la única vía
      // (no hay pestañas) y en la caja única es el mismo gesto de la pestaña.
      onContexto={conMenu}
    />
  );
}

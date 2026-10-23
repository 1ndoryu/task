/* Lo que va dentro de una caja, según el tipo de su panel. La cabecera la pone
 * cada forma de la vista y aquí se decide si es una nota o una lista de filas,
 * con su filtro y su orden. Vive aparte de `Lista` porque es la parte larga
 * del reparto y solo depende del panel, no de en qué rama de la vista esté. */
import type { ReactNode } from 'react';
import type { Dashboard } from '../logica/tipos';
import type { Preferencias } from '../logica/preferencias';
import type { ModoOrden } from '../logica/orden';
import type { Panel } from '../logica/paneles';
import { seleccionar, type Fila as FilaDatos } from '../logica/seleccion';
import type { AccionesFila } from './accionesFila';
import { MenuOrdenCaja } from './AccionesBarra';
import { Caja } from './Caja';
import { CajaNota } from './CajaNota';
import { NuevaFila, type NuevaFila as DatosNuevaFila } from './NuevaFila';
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
  titulo: TituloPanel;
  contextoDe: ContextoPanel;
  /** Menú de fila abierto con clic derecho; lo comparte toda la vista. */
  menuAbierto: { clave: string; x: number; y: number } | null;
  onMenuAbierto: (punto: { clave: string; x: number; y: number } | null) => void;
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
  titulo,
  contextoDe,
  menuAbierto,
  onMenuAbierto,
}: Props): ReactNode {
  const tipo = panel.tipo;
  const conMenu = contextoDe(panel);
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
        // Mismo gesto que en la caja de lista: el clic derecho es del panel.
        onContexto={conMenu}
        cabecera={
          <header className="barra">
            {titulo(panel, 'barra__titulo')}
            {/* Sin botones: borrar y archivar viven en el menú contextual de
                la caja, junto a renombrar. El título ya no pide nada más. */}
            <div className="barra__acciones" />
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
            {!panel.fija && (
              <MenuOrdenCaja
                panel={panel}
                orden={ordenDe(panel.id)}
                onElegir={(modo: ModoOrden) => cambiarOrdenCaja(panel.id, modo)}
              />
            )}
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
      // El menú del panel también nace de la caja: en cajas es la única vía
      // (no hay pestañas) y en la caja única es el mismo gesto de la pestaña.
      onContexto={conMenu}
    />
  );
}

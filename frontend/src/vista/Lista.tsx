/* Vista de la lista: tareas y hábitos en un solo flujo, dentro de una caja
 * con scroll propio. La cabecera lleva el filtro y el orden. */
import { decodificarFiltro, etiquetaFiltro, type Filtro } from '../logica/filtros';
import { MODOS_ORDEN, type ModoOrden } from '../logica/orden';
import { hechoHoy } from '../logica/seleccion';
import type { Habito, Proyecto, Tarea } from '../logica/tipos';
import { IconoOrden } from './Iconos';
import { Menu, type OpcionMenu } from './Menu';
import { usarLista } from './usarLista';

function FilaTarea({ tarea, onCompletar }: { tarea: Tarea; onCompletar: (tarea: Tarea) => void }) {
  // La urgencia se lee solo para el acento visual; el texto no la repite.
  const acento = tarea.urgencia === 'bloqueante' || tarea.urgencia === 'urgente';
  return (
    <li className={`fila${acento ? ' fila--urgente' : ''}`}>
      <button
        type="button"
        className="fila__marca"
        aria-label={`Completar ${tarea.texto}`}
        title="Completar"
        onClick={() => onCompletar(tarea)}
      />
      <span className="fila__texto">{tarea.texto}</span>
    </li>
  );
}

function FilaHabito({ habito, hoy }: { habito: Habito; hoy: string }) {
  const hecho = hechoHoy(habito, hoy);
  const racha = habito.racha ?? 0;
  return (
    <li className={`fila fila--habito${hecho ? ' fila--hecho' : ''}`}>
      <span className="fila__marca" aria-hidden="true" />
      <span className="fila__texto">{habito.nombre}</span>
      {racha > 1 && <span className="fila__nota">{racha} días</span>}
    </li>
  );
}

/** Opciones del filtro: las categorías del legacy más un apartado por proyecto. */
function itemsFiltro(filtro: Filtro, proyectos: Proyecto[]): OpcionMenu[] {
  return [
    { id: 'sueltas', etiqueta: 'Sueltas', activo: filtro.tipo === 'sueltas', grupo: 'Vista' },
    { id: 'todas', etiqueta: 'Todas', activo: filtro.tipo === 'todas' },
    ...proyectos.map((proyecto) => ({
      id: `proyecto-${proyecto.id}`,
      etiqueta: proyecto.nombre,
      activo: filtro.tipo === 'proyecto' && filtro.proyectoId === proyecto.id,
      grupo: 'Proyectos',
    })),
  ];
}

export function Lista() {
  const lista = usarLista();

  if (lista.estado.fase === 'cargando') {
    return (
      <main className="marco">
        <div className="caja">
          <p className="aviso">Cargando…</p>
        </div>
      </main>
    );
  }

  if (lista.estado.fase === 'error') {
    return (
      <main className="marco">
        <div className="caja">
          <p className="aviso aviso--error" role="alert">
            {lista.estado.mensaje}
          </p>
        </div>
      </main>
    );
  }

  const { filas } = lista.vista ?? { filas: [] };
  const proyectos = lista.estado.datos.proyectos;
  const { filtro } = lista;

  return (
    <main className="marco">
      <section className="caja" aria-label="Tareas y hábitos">
        <header className="barra">
          <Menu
            etiqueta={etiquetaFiltro(filtro, proyectos)}
            titulo="Filtrar tareas"
            items={itemsFiltro(filtro, proyectos)}
            onElegir={(id) => lista.cambiarFiltro(decodificarFiltro(id))}
            claseBoton="barra__boton"
          />
          <Menu
            etiqueta={<IconoOrden />}
            titulo={`Ordenar la lista: ${MODOS_ORDEN.find((m) => m.id === lista.orden)?.etiqueta ?? ''}`}
            items={MODOS_ORDEN.map((modo) => ({
              id: modo.id,
              etiqueta: modo.etiqueta,
              activo: lista.orden === modo.id,
            }))}
            onElegir={(id) => lista.cambiarOrden(id as ModoOrden)}
            claseBoton="barra__boton barra__boton--icono"
          />
        </header>

        <div className="scroll">
          {filas.length === 0 ? (
            <p className="aviso">Nada pendiente.</p>
          ) : (
            <ul className="lista">
              {filas.map((fila) =>
                fila.tipo === 'tarea' ? (
                  <FilaTarea key={`t${fila.tarea.id}`} tarea={fila.tarea} onCompletar={lista.completar} />
                ) : (
                  <FilaHabito key={`h${fila.habito.id}`} habito={fila.habito} hoy={lista.hoy} />
                ),
              )}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

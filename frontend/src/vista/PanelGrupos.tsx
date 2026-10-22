/* Gestión de grupos: alta con nombre, renombrado y borrado. Un grupo aquí es
 * solo un nombre que las filas llevan en `grupoEjecucion`, así que renombrar
 * es mudar sus filas y borrar es decidir qué pasa con ellas: se van con el
 * grupo o se quedan en «Tareas». El borrado pregunta antes, porque una de las
 * dos respuestas destruye datos.
 * La confirmación vive en el mismo `<dialog>`: dos `showModal` anidados dejan
 * dos velos y dos cajas superpuestas, y uno solo se lee mejor.
 * El estado (nombre nuevo, renombrado y borrado pendiente) lo lleva
 * `usarPanelGrupos`: aquí solo se pinta. */
import { limpiarGrupo } from '../logica/orden';
import { Modal } from './Modal';
import { IconoBorrar } from './MenuOpciones';
import { usarPanelGrupos } from './usarPanelGrupos';

interface Props {
  abierto: boolean;
  /** Grupos existentes; «Tareas» y «Completados» no son grupos de fila. */
  grupos: string[];
  /** Cuántas tareas y hábitos tiene cada grupo, para decir qué se borra. */
  cuenta: Record<string, number>;
  onCrear: (nombre: string) => void;
  onRenombrar: (viejo: string, nuevo: string) => void;
  onBorrar: (nombre: string, conFilas: boolean) => void;
  onCerrar: () => void;
}

export function PanelGrupos({ abierto, grupos, cuenta, onCrear, onRenombrar, onBorrar, onCerrar }: Props) {
  const panel = usarPanelGrupos({ grupos, onCrear, onRenombrar, onBorrar });
  const { borrando } = panel;
  const filas = borrando ? (cuenta[borrando] ?? 0) : 0;

  return (
    <Modal
      abierto={abierto}
      // El panel se cierra con Escape o con un clic fuera, como los ajustes.
      titulo={borrando ? `Borrar «${borrando}»` : undefined}
      etiqueta="Grupos"
      botones={
        borrando
          ? [
              { id: 'cancelar', etiqueta: 'Cancelar' },
              { id: 'conservar', etiqueta: 'Solo el grupo', principal: true },
              { id: 'filas', etiqueta: 'Grupo y tareas', peligro: true },
            ]
          : []
      }
      onElegir={(id) => {
        if (id === 'conservar') panel.confirmarBorrado(false);
        else if (id === 'filas') panel.confirmarBorrado(true);
        else panel.cancelarBorrado();
      }}
      onCerrar={() => {
        // Escape o clic fuera: primero se cierra la pregunta, no el panel.
        if (borrando) panel.cancelarBorrado();
        else onCerrar();
      }}
    >
      {borrando ? (
        <p className="campo__nota">
          {filas > 0
            ? `El grupo tiene ${filas} ${filas === 1 ? 'elemento' : 'elementos'}. «Solo el grupo» los mueve a Tareas; «Grupo y tareas» los elimina también.`
            : 'El grupo está vacío: se borra el nombre y nada más.'}
        </p>
      ) : (
        <>
          {/* Alta: escribir el nombre y pulsar Enter o el botón. */}
          <div className="grupos__alta">
            <input
              className="entrada"
              placeholder="Nuevo grupo…"
              aria-label="Nombre del grupo nuevo"
              maxLength={60}
              value={panel.nuevo}
              onChange={(evento) => panel.setNuevo(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') panel.crear();
                else if (evento.key === 'Escape') panel.setNuevo('');
              }}
            />
            <button type="button" className="boton" onClick={panel.crear} disabled={!limpiarGrupo(panel.nuevo)}>
              Añadir
            </button>
          </div>

          {grupos.length === 0 ? (
            <p className="campo__nota">Todavía no hay grupos.</p>
          ) : (
            <ul className="grupos">
              {grupos.map((nombre) => (
                <li key={nombre} className="grupos__fila">
                  {panel.editando === nombre ? (
                    <input
                      className="entrada"
                      autoFocus
                      // Al entrar se selecciona el nombre entero: escribir
                      // sustituye, en vez de añadirse al final.
                      onFocus={(evento) => evento.currentTarget.select()}
                      maxLength={60}
                      value={panel.borrador}
                      aria-label={`Nuevo nombre para ${nombre}`}
                      onChange={(evento) => panel.setBorrador(evento.target.value)}
                      onBlur={panel.guardarNombre}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter') panel.guardarNombre();
                        else if (evento.key === 'Escape') panel.cancelarRenombrado();
                      }}
                    />
                  ) : (
                    <>
                      {/* El nombre es el botón: no hace falta un lápiz aparte. */}
                      <button
                        type="button"
                        className="grupos__nombre"
                        title="Cambiar el nombre"
                        onClick={() => panel.empezarRenombrado(nombre)}
                      >
                        {nombre}
                      </button>
                      <span className="grupos__cuenta">{cuenta[nombre] ?? 0}</span>
                      <button
                        type="button"
                        className="grupos__accion grupos__accion--peligro"
                        aria-label={`Borrar el grupo ${nombre}`}
                        title="Borrar el grupo"
                        onClick={() => panel.pedirBorrado(nombre)}
                      >
                        <IconoBorrar />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

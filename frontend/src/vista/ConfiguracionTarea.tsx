/* Configuración de una fila: tareas y hábitos comparten el mismo formulario.
 * Cambian solo los campos que cada uno tiene: la tarea añade proyecto, fecha
 * límite y urgencia; el hábito mantiene su importancia. Usa la receta del modal
 * y del formulario (`estilos/modal.css`); la fila se edita en una copia y solo
 * se guarda al aceptar. */
import { useEffect, useId, useRef, useState } from 'react';
import type { Editando } from './usarLista';
import type { Proyecto } from '../logica/tipos';
import { IconoCerrar } from './Iconos';

/** Borrador común: `texto` es el nombre del hábito o el texto de la tarea. */
export interface CambiosFilaForm {
  texto: string;
  prioridad: string;
  urgencia: string;
  proyectoId: number | null;
  fechaMaxima: string;
  /** `''` es «Tareas»; el nombre libre es el grupo. */
  grupoEjecucion: string;
}

const PRIORIDADES = [
  { id: 'muy_alta', etiqueta: 'Muy alta' },
  { id: 'alta', etiqueta: 'Alta' },
  { id: 'media', etiqueta: 'Media' },
  { id: 'baja', etiqueta: 'Baja' },
  { id: 'muy_baja', etiqueta: 'Muy baja' },
];

const URGENCIAS = [
  { id: 'bloqueante', etiqueta: 'Bloqueante' },
  { id: 'urgente', etiqueta: 'Urgente' },
  { id: 'normal', etiqueta: 'Normal' },
  { id: 'chill', etiqueta: 'Chill' },
];

/* La importancia del hábito viaja en el mismo campo de prioridad: son la
 * misma escala, y así el formulario no necesita dos juegos de opciones. */
function borradorDe(fila: NonNullable<Editando>): CambiosFilaForm {
  const grupo = fila.tipo === 'tarea' ? fila.tarea.grupoEjecucion : fila.habito.grupoEjecucion;
  return fila.tipo === 'tarea'
    ? {
        texto: fila.tarea.texto,
        prioridad: fila.tarea.prioridad ?? 'media',
        urgencia: fila.tarea.urgencia ?? 'normal',
        proyectoId: fila.tarea.proyectoId ?? null,
        fechaMaxima: fila.tarea.configuracion?.fechaMaxima ?? '',
        grupoEjecucion: grupo ?? '',
      }
    : {
        texto: fila.habito.nombre,
        prioridad: fila.habito.importancia ?? 'media',
        urgencia: 'normal',
        proyectoId: null,
        fechaMaxima: '',
        grupoEjecucion: grupo ?? '',
      };
}

interface Props {
  /** Fila a editar; `null` cierra el modal. */
  fila: Editando;
  proyectos: Proyecto[];
  /** Grupos ya usados, para ofrecerlos como atajo al escribir uno nuevo. */
  grupos: string[];
  onGuardar: (fila: NonNullable<Editando>, cambios: CambiosFilaForm) => void;
  onCerrar: () => void;
}

export function ConfiguracionTarea({ fila, proyectos, grupos, onGuardar, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [borrador, setBorrador] = useState<CambiosFilaForm | null>(fila ? borradorDe(fila) : null);
  const idTexto = useId();
  const idProyecto = useId();
  const idFecha = useId();
  const idGrupo = useId();
  const esTarea = fila?.tipo === 'tarea';

  // Cada fila abre con su propio borrador; cerrar lo descarta.
  useEffect(() => {
    setBorrador(fila ? borradorDe(fila) : null);
  }, [fila]);

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    if (fila && !nodo.open) nodo.showModal();
    if (!fila && nodo.open) nodo.close();
  }, [fila]);

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    const alCerrar = () => onCerrar();
    nodo.addEventListener('close', alCerrar);
    return () => nodo.removeEventListener('close', alCerrar);
  }, [onCerrar]);

  const cambiar = (cambios: Partial<CambiosFilaForm>) =>
    setBorrador((previo) => (previo ? { ...previo, ...cambios } : previo));

  const guardar = () => {
    if (!fila || !borrador) return;
    // El texto vacío dejaría una fila sin nombre: se conserva el anterior.
    const texto = borrador.texto.trim() || borradorDe(fila).texto;
    onGuardar(fila, { ...borrador, texto });
    onCerrar();
  };

  return (
    <dialog
      className="modal"
      ref={dialogo}
      aria-label={esTarea ? 'Configuración de la tarea' : 'Configuración del hábito'}
      onClick={(evento) => {
        if (evento.target === dialogo.current) onCerrar();
      }}
    >
      {borrador && (
        <form
          className="modal__caja"
          onSubmit={(evento) => {
            evento.preventDefault();
            guardar();
          }}
        >
          <header className="modal__cabecera">
            <h2 className="modal__titulo">{esTarea ? 'Tarea' : 'Hábito'}</h2>
            <button
              type="button"
              className="modal__cerrar"
              aria-label="Cerrar la configuración"
              title="Cerrar"
              onClick={onCerrar}
            >
              <IconoCerrar />
            </button>
          </header>

          <div className="modal__cuerpo">
            <div className="campo">
              <label className="campo__titulo" htmlFor={idTexto}>
                {esTarea ? 'Texto' : 'Nombre'}
              </label>
              <textarea
                id={idTexto}
                className="entrada"
                rows={2}
                maxLength={esTarea ? 1000 : 120}
                value={borrador.texto}
                onChange={(evento) => cambiar({ texto: evento.target.value })}
              />
            </div>

            <div className="campo">
              <label className="campo__titulo" htmlFor={idGrupo}>
                Grupo
              </label>
              {/* Texto libre con los grupos ya usados como sugerencias: el
                  nombre es la pestaña, así que no puede salir de una lista fija. */}
              <input
                id={idGrupo}
                className="entrada"
                list={`${idGrupo}-sugerencias`}
                placeholder="Sin grupo"
                value={borrador.grupoEjecucion}
                onChange={(evento) => cambiar({ grupoEjecucion: evento.target.value })}
              />
              <datalist id={`${idGrupo}-sugerencias`}>
                {grupos.map((nombre) => (
                  <option key={nombre} value={nombre} />
                ))}
              </datalist>
            </div>

            {esTarea && (
              <>
                <div className="campo">
                  <label className="campo__titulo" htmlFor={idProyecto}>
                    Proyecto
                  </label>
                  <select
                    id={idProyecto}
                    className="entrada"
                    value={borrador.proyectoId ?? ''}
                    onChange={(evento) =>
                      cambiar({ proyectoId: evento.target.value === '' ? null : Number(evento.target.value) })
                    }
                  >
                    <option value="">Sueltas</option>
                    {proyectos.map((proyecto) => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__titulo" htmlFor={idFecha}>
                    Fecha límite
                  </label>
                  <input
                    id={idFecha}
                    className="entrada"
                    type="date"
                    value={borrador.fechaMaxima}
                    onChange={(evento) => cambiar({ fechaMaxima: evento.target.value })}
                  />
                </div>
              </>
            )}

            <div className="campo">
              <p className="campo__titulo">{esTarea ? 'Prioridad' : 'Importancia'}</p>
              <div className="opciones" role="radiogroup" aria-label={esTarea ? 'Prioridad' : 'Importancia'}>
                {PRIORIDADES.map((opcion) => (
                  <button
                    key={opcion.id}
                    type="button"
                    role="radio"
                    aria-checked={borrador.prioridad === opcion.id}
                    className={`segmento${borrador.prioridad === opcion.id ? ' segmento--activo' : ''}`}
                    onClick={() => cambiar({ prioridad: opcion.id })}
                  >
                    {opcion.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {esTarea && (
              <div className="campo">
                <p className="campo__titulo">Urgencia</p>
                <div className="opciones" role="radiogroup" aria-label="Urgencia">
                  {URGENCIAS.map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      role="radio"
                      aria-checked={borrador.urgencia === opcion.id}
                      className={`segmento${borrador.urgencia === opcion.id ? ' segmento--activo' : ''}`}
                      onClick={() => cambiar({ urgencia: opcion.id })}
                    >
                      {opcion.etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer className="modal__acciones">
            <button type="button" className="segmento" onClick={onCerrar}>
              Cancelar
            </button>
            <button type="submit" className="segmento segmento--activo">
              Guardar
            </button>
          </footer>
        </form>
      )}
    </dialog>
  );
}

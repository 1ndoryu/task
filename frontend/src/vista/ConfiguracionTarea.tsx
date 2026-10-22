/* Configuración de una fila: tareas y hábitos comparten el mismo formulario.
 * Cambian solo los campos que cada uno tiene: la tarea añade proyecto, fecha
 * límite y urgencia; el hábito su frecuencia. Se guarda sola: cada control
 * escribe su cambio al momento, sin botones ni cabecera que cierren, porque
 * el modal desaparece al pulsar fuera o con Escape. Usa la receta del modal y
 * del formulario (`estilos/modal.css`). */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { frecuenciaDe } from '../logica/frecuencia';
import type { ColoresNivel } from '../logica/preferencias';
import type { Proyecto } from '../logica/tipos';
import { grupoDe, prioridadDe } from './accionesFila';
import { FrecuenciaCampos } from './FrecuenciaCampos';
import { Opciones } from './Opciones';
import { PRIORIDADES, URGENCIAS, type CambiosFilaForm } from './opcionesFila';
import { opcionesFecha, Selector } from './Selector';
import type { Editando } from './usarLista';

/** Borrador inicial de la fila abierta, en los campos que entiende el modal. */
function borradorDe(fila: NonNullable<Editando>): CambiosFilaForm {
  const base = {
    prioridad: prioridadDe(fila),
    grupoEjecucion: grupoDe(fila) ?? '',
  };
  if (fila.tipo === 'habito') {
    const { tipo, cadaDias, diasSemana, vecesAlMes } = frecuenciaDe(fila.habito);
    return {
      ...base,
      texto: fila.habito.nombre,
      urgencia: 'normal',
      proyectoId: null,
      fechaMaxima: '',
      frecuencia: { tipo, cadaDias, diasSemana, vecesAlMes },
    };
  }
  return {
    ...base,
    texto: fila.tarea.texto,
    urgencia: fila.tarea.urgencia ?? 'normal',
    proyectoId: fila.tarea.proyectoId ?? null,
    fechaMaxima: fila.tarea.configuracion?.fechaMaxima ?? '',
  };
}

interface Props {
  /** Fila a editar; `null` cierra el modal. */
  fila: Editando;
  proyectos: Proyecto[];
  /** Grupos ya usados, para ofrecerlos como atajo al escribir uno nuevo. */
  grupos: string[];
  /** Paleta de importancia: cada opción lleva su punto de color. */
  colores: ColoresNivel;
  onGuardar: (fila: NonNullable<Editando>, cambios: CambiosFilaForm) => void;
  onCerrar: () => void;
}

export function ConfiguracionTarea({ fila, proyectos, grupos, colores, onGuardar, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [borrador, setBorrador] = useState<CambiosFilaForm | null>(fila ? borradorDe(fila) : null);
  // El nombre se edita en un `input` controlado: sin él, el cursor salta al
  // repintarse la lista con cada cambio guardado.
  const [nombre, setNombre] = useState(fila ? borradorDe(fila).texto : '');
  const idNombre = useId();
  const esHabito = fila?.tipo === 'habito';

  useEffect(() => {
    if (!fila) return;
    const inicial = borradorDe(fila);
    setBorrador(inicial);
    setNombre(inicial.texto);
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

  /** Aplica un cambio ya mismo: el modal no tiene botón de guardar. */
  const aplicar = (cambios: Partial<CambiosFilaForm>) => {
    if (!fila) return;
    const siguiente = { ...borradorDe(fila), ...borrador, ...cambios } as CambiosFilaForm;
    setBorrador(siguiente);
    // El texto vacío dejaría una fila sin nombre: se conserva el anterior.
    onGuardar(fila, { ...siguiente, texto: siguiente.texto.trim() || borradorDe(fila).texto });
  };

  // Los grupos que ya existen, con «Sin grupo» delante: mover es elegir, y el
  // nombre libre nuevo se ofrece al escribir lo que no está en la lista.
  const opcionesGrupo = useMemo(
    () => [
      { id: '', etiqueta: 'Sin grupo' },
      ...grupos.map((nombre) => ({ id: nombre, etiqueta: nombre })),
    ],
    [grupos],
  );
  const opcionesProyecto = useMemo(
    () => [
      { id: '', etiqueta: 'Sueltas' },
      ...proyectos.map((proyecto) => ({
        id: String(proyecto.id),
        etiqueta: proyecto.nombre,
      })),
    ],
    [proyectos],
  );

  return (
    <dialog
      className="modal"
      ref={dialogo}
      aria-label={esHabito ? 'Configuración del hábito' : 'Configuración de la tarea'}
      onClick={(evento) => {
        // El clic fuera del contenido solo alcanza al propio `<dialog>`.
        if (evento.target === dialogo.current) onCerrar();
      }}
    >
      {borrador && fila && (
        <div className="modal__caja">
          <div className="modal__cuerpo">
            <div className="campo">
              <label className="sr-solo" htmlFor={idNombre}>
                {esHabito ? 'Nombre' : 'Texto'}
              </label>
              <input
                id={idNombre}
                className="entrada"
                autoFocus
                maxLength={esHabito ? 120 : 1000}
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                // Al salir del campo es cuando se manda, y el valor se lee del
                // propio campo: el estado del último pintado puede ir por detrás.
                onBlur={(evento) => aplicar({ texto: evento.currentTarget.value })}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') evento.currentTarget.blur();
                }}
              />
            </div>

            <div className="campo">
              <p className="campo__titulo">Grupo</p>
              {/* El nombre libre no se pierde: al escribir uno nuevo, la lista
                  ofrece crearlo, porque el grupo es la pestaña y no una entidad
                  fija del backend. */}
              <Selector
                etiqueta="Grupo de la fila"
                valor={borrador.grupoEjecucion}
                opciones={opcionesGrupo}
                vacio="Sin grupo"
                onElegir={(id) => aplicar({ grupoEjecucion: id })}
                onCrear={(nombre) => aplicar({ grupoEjecucion: nombre })}
              />
            </div>

            {fila.tipo === 'tarea' ? (
              <>
                <div className="campo">
                  <p className="campo__titulo">Proyecto</p>
                  <Selector
                    etiqueta="Proyecto de la tarea"
                    valor={borrador.proyectoId === null ? '' : String(borrador.proyectoId)}
                    opciones={opcionesProyecto}
                    vacio="Sueltas"
                    onElegir={(id) => aplicar({ proyectoId: id === '' ? null : Number(id) })}
                  />
                </div>

                <div className="campo">
                  <p className="campo__titulo">Fecha límite</p>
                  {/* Días hacia delante agrupados por mes; la fecha guardada,
                      aunque esté fuera del tramo, sigue en la lista. */}
                  <Selector
                    etiqueta="Fecha límite de la tarea"
                    valor={borrador.fechaMaxima}
                    opciones={opcionesFecha(borrador.fechaMaxima)}
                    vacio="Sin fecha"
                    onElegir={(id) => aplicar({ fechaMaxima: id })}
                  />
                </div>
              </>
            ) : (
              borrador.frecuencia && (
                <FrecuenciaCampos
                  frecuencia={borrador.frecuencia}
                  onCambiar={(cambios) => aplicar({ frecuencia: { ...borrador.frecuencia, ...cambios } })}
                />
              )
            )}

            <div className="campo">
              <p className="campo__titulo">{esHabito ? 'Importancia' : 'Prioridad'}</p>
              <Opciones
                titulo={esHabito ? 'Importancia' : 'Prioridad'}
                valor={borrador.prioridad}
                opciones={PRIORIDADES}
                colores={colores}
                onElegir={(id) => aplicar({ prioridad: id })}
              />
            </div>

            {!esHabito && (
              <div className="campo">
                <p className="campo__titulo">Urgencia</p>
                <Opciones
                  titulo="Urgencia"
                  valor={borrador.urgencia}
                  opciones={URGENCIAS}
                  onElegir={(id) => aplicar({ urgencia: id })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

/* Subhábitos dentro del modal del padre: listar, añadir, renombrar y quitar.
 * No tienen formulario propio —heredan importancia y frecuencia del padre—,
 * igual que el legacy (`ListaSubHabitos`). Viven en el payload del padre: cada
 * cambio es un `PUT /api/habits/:id`, y el padre lo aplica sobre su copia viva. */
import { useState } from 'react';
import { hechoHoy } from '../logica/seleccion';
import type { SubHabito } from '../logica/tipos';
import { idNuevo } from './tiposLista';
import { IconoBorrar } from './MenuOpciones';

interface Props {
  subhabitos: SubHabito[];
  /** Día de hoy: decide qué subhábito sale marcado. */
  hoy: string;
  /** Opera sobre la lista viva del padre; no recibe una copia que pueda ir atrasada. */
  onOperar: (operar: (lista: SubHabito[]) => SubHabito[]) => void;
  /** Marca o desmarca el subhábito de hoy (lo escribe el padre). */
  onCompletar: (subhabito: SubHabito) => void;
}

export function SubHabitos({ subhabitos, hoy, onOperar, onCompletar }: Props) {
  const [nuevo, setNuevo] = useState('');

  const agregar = () => {
    const nombre = nuevo.trim();
    if (!nombre) return;
    // El id se fija fuera: si la escritura se reaplica tras un 409, no cambia.
    const id = idNuevo();
    onOperar((lista) => [...lista, { id, nombre }]);
    setNuevo('');
  };

  const renombrar = (id: number, nombre: string) => {
    const limpio = nombre.trim();
    // Un subhábito sin nombre se pinta como fantasma: se conserva el anterior.
    if (!limpio) return;
    onOperar((lista) => lista.map((s) => (s.id === id ? { ...s, nombre: limpio } : s)));
  };

  return (
    <div className="campo">
      <p className="campo__titulo">Subhábitos</p>
      {subhabitos.length > 0 && (
        <ul className="subhabitos">
          {subhabitos.map((sub) => {
            const hecho = hechoHoy(sub, hoy);
            return (
              <li key={sub.id} className={`subhabitos__fila${hecho ? ' subhabitos__fila--hecho' : ''}`}>
                <button
                  type="button"
                  className="subhabitos__marca"
                  aria-pressed={hecho}
                  aria-label={`Completar ${sub.nombre}`}
                  title={hecho ? 'Desmarcar' : 'Marcar como hecho hoy'}
                  onClick={() => onCompletar(sub)}
                />
                {/* Sin controlado: el nombre se manda al salir del campo, para
                    no reescribir el payload a cada tecla. */}
                <input
                  className="entrada"
                  defaultValue={sub.nombre}
                  maxLength={120}
                  aria-label={`Nombre del subhábito ${sub.nombre}`}
                  onBlur={(evento) => renombrar(sub.id, evento.currentTarget.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') evento.currentTarget.blur();
                  }}
                />
                <button
                  type="button"
                  className="subhabitos__quitar"
                  aria-label={`Quitar ${sub.nombre}`}
                  title="Quitar"
                  onClick={() => onOperar((lista) => lista.filter((s) => s.id !== sub.id))}
                >
                  <IconoBorrar />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <input
        className="entrada"
        placeholder="Nuevo subhábito"
        maxLength={120}
        value={nuevo}
        onChange={(evento) => setNuevo(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault();
            agregar();
          }
        }}
      />
      <p className="campo__nota">Heredan la importancia y la frecuencia del hábito: aquí solo llevan nombre.</p>
    </div>
  );
}

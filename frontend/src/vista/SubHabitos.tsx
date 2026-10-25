/* Subhábitos dentro del modal del padre: listar, añadir, renombrar y quitar.
 * No tienen formulario propio —heredan importancia y frecuencia del padre—,
 * igual que el legacy (`ListaSubHabitos`). Viven en el payload del padre, así
 * que cada cambio es un `PUT /api/habits/:id` con la lista entera. */
import { useState } from 'react';
import type { SubHabito } from '../logica/tipos';
import { IconoBorrar } from './MenuOpciones';

interface Props {
  subhabitos: SubHabito[];
  /** Recibe la lista completa, ya con el cambio aplicado. */
  onCambiar: (subhabitos: SubHabito[]) => void;
}

export function SubHabitos({ subhabitos, onCambiar }: Props) {
  const [nuevo, setNuevo] = useState('');

  /** Id local: mismo criterio que el alta de filas y que el legacy, sin
   *  colisión con los ids migrados. */
  const idNuevo = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

  const agregar = () => {
    const nombre = nuevo.trim();
    if (!nombre) return;
    onCambiar([...subhabitos, { id: idNuevo(), nombre }]);
    setNuevo('');
  };

  const renombrar = (id: number, nombre: string) => {
    const limpio = nombre.trim();
    // Un subhábito sin nombre se pinta como fantasma: se conserva el anterior.
    if (!limpio) return;
    onCambiar(subhabitos.map((s) => (s.id === id ? { ...s, nombre: limpio } : s)));
  };

  return (
    <div className="campo">
      <p className="campo__titulo">Subhábitos</p>
      {subhabitos.length > 0 && (
        <ul className="subhabitos">
          {subhabitos.map((sub) => (
            <li key={sub.id} className="subhabitos__fila">
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
                onClick={() => onCambiar(subhabitos.filter((s) => s.id !== sub.id))}
              >
                <IconoBorrar />
              </button>
            </li>
          ))}
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

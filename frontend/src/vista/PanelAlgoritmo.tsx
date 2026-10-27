/* Pestaña «Algoritmo» de los ajustes: cada número del orden inteligente en una
 * fila con su campo. Se guarda al salir del campo o con Intro; lo que no
 * coincide con el valor de fábrica se marca. Las horas deben ir en orden. */
import { useState } from 'react';
import {
  ALGORITMO_DEFECTO,
  GRUPOS_ALGORITMO,
  horasValidas,
  limitar,
  parametroDe,
  type Algoritmo,
  type ClaveAlgoritmo,
} from '../logica/algoritmo';

function FilaNumero({
  clave,
  valor,
  onElegir,
}: {
  clave: ClaveAlgoritmo;
  valor: number;
  onElegir: (valor: number) => boolean;
}) {
  const { etiqueta, min, max, paso, unidad } = parametroDe(clave);
  // Se teclea como texto y se confirma al soltar: así se puede borrar y reescribir.
  const [texto, setTexto] = useState<string | null>(null);
  const confirmar = () => {
    const numero = limitar(clave, Number(texto));
    // Vacío o inválido, o un valor que rompe el orden de las horas: vuelve el anterior.
    if (texto !== null && texto.trim() !== '' && numero !== undefined) onElegir(numero);
    setTexto(null);
  };
  return (
    <li className="algoritmo__fila">
      <label className="algoritmo__etiqueta" htmlFor={`algoritmo-${clave}`}>
        {etiqueta}
      </label>
      <input
        id={`algoritmo-${clave}`}
        className="algoritmo__entrada"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={paso}
        value={texto ?? String(valor)}
        data-cambiado={valor !== ALGORITMO_DEFECTO[clave]}
        onChange={(evento) => setTexto(evento.target.value)}
        onBlur={confirmar}
        onKeyDown={(evento) => evento.key === 'Enter' && evento.currentTarget.blur()}
      />
      <span className="algoritmo__unidad">{unidad ?? 'pts'}</span>
    </li>
  );
}

export function PanelAlgoritmo({
  algoritmo,
  onCambiar,
}: {
  algoritmo: Algoritmo;
  onCambiar: (algoritmo: Algoritmo) => void;
}) {
  const [aviso, setAviso] = useState('');
  const igualAFabrica = (Object.keys(ALGORITMO_DEFECTO) as ClaveAlgoritmo[]).every(
    (clave) => algoritmo[clave] === ALGORITMO_DEFECTO[clave],
  );
  // Devuelve si se aceptó: las horas fuera de orden se rechazan con un aviso.
  const elegir = (clave: ClaveAlgoritmo, valor: number): boolean => {
    const siguiente = { ...algoritmo, [clave]: valor };
    if (!horasValidas(siguiente)) {
      setAviso('Las horas deben ir en orden: temprano, tarde y noche.');
      return false;
    }
    setAviso('');
    onCambiar(siguiente);
    return true;
  };
  return (
    <>
      {GRUPOS_ALGORITMO.map((grupo) => (
        <div className="campo" key={grupo.titulo}>
          <p className="campo__titulo">{grupo.titulo}</p>
          <ul className="algoritmo">
            {grupo.claves.map((clave) => (
              <FilaNumero key={clave} clave={clave} valor={algoritmo[clave]} onElegir={(v) => elegir(clave, v)} />
            ))}
          </ul>
          {grupo.nota && <p className="campo__nota">{grupo.nota}</p>}
          {grupo.claves.includes('horaTemprano') && aviso && (
            <p className="campo__nota algoritmo__aviso" role="alert">
              {aviso}
            </p>
          )}
        </div>
      ))}
      <div className="campo">
        <button
          type="button"
          className="boton"
          disabled={igualAFabrica}
          onClick={() => {
            setAviso('');
            onCambiar({ ...ALGORITMO_DEFECTO });
          }}
        >
          Volver a los valores de siempre
        </button>
        <p className="campo__nota">Lo marcado en negrita es lo que difiere de fábrica.</p>
      </div>
    </>
  );
}

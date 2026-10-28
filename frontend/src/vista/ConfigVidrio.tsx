/* Parámetros del cristal (`Vidrio`, `VIDRIO_INICIAL`) y panel TEMPORAL para probarlos a ojo.
 * El panel ya no se monta (se quitó su botón de Lista.tsx): para volver a usarlo,
 * montar `ConfigVidrio` otra vez. Su pulsación no llega al documento, así que el panel
 * de Cajas abierto no se cierra al tocarlo. */

export interface Vidrio {
  displacementScale: number;
  blurAmount: number;
  saturation: number;
  aberrationIntensity: number;
  elasticity: number;
  cornerRadius: number;
  padding: string;
  overLight: boolean;
  mode: 'standard' | 'polar' | 'prominent' | 'shader';
}

/* Valores por defecto de liquid-glass-react 1.1.1, con los que ya fijaba la barra. */
export const VIDRIO_INICIAL: Vidrio = {
  displacementScale: 70,
  blurAmount: 0.0625,
  saturation: 140,
  aberrationIntensity: 2,
  elasticity: 0,
  cornerRadius: 17.6,
  padding: '0 1rem',
  overLight: false,
  mode: 'standard',
};

/* Rango de cada número: [mínimo, máximo, paso]. */
const RANGOS = {
  displacementScale: [0, 150, 1],
  blurAmount: [0, 1, 0.01],
  saturation: [0, 300, 1],
  aberrationIntensity: [0, 10, 0.1],
  elasticity: [0, 1, 0.01],
  cornerRadius: [0, 40, 0.1],
} as const;

const MODOS: Vidrio['mode'][] = ['standard', 'polar', 'prominent', 'shader'];

interface Props {
  valor: Vidrio;
  onCambiar: (valor: Vidrio) => void;
}

export function ConfigVidrio({ valor, onCambiar }: Props) {
  const fijar = <K extends keyof Vidrio>(clave: K, nuevo: Vidrio[K]) => onCambiar({ ...valor, [clave]: nuevo });

  return (
    // Sin propagar el puntero: si no, el panel de Cajas lo tomaría por un clic fuera y se cerraría.
    <div className="config-vidrio" role="dialog" aria-label="Parámetros del cristal" onPointerDown={(e) => e.stopPropagation()}>
      <h2 className="config-vidrio__titulo">Cristal</h2>
      {(Object.keys(RANGOS) as (keyof typeof RANGOS)[]).map((clave) => {
        const [minimo, maximo, paso] = RANGOS[clave];
        return (
          <label key={clave} className="config-vidrio__fila">
            <span>{clave}</span>
            <input
              type="range"
              min={minimo}
              max={maximo}
              step={paso}
              value={valor[clave]}
              onChange={(e) => fijar(clave, Number(e.target.value))}
            />
            <output>{valor[clave]}</output>
          </label>
        );
      })}
      <label className="config-vidrio__fila">
        <span>padding</span>
        <input type="text" value={valor.padding} onChange={(e) => fijar('padding', e.target.value)} />
      </label>
      <label className="config-vidrio__fila">
        <span>overLight</span>
        <input type="checkbox" checked={valor.overLight} onChange={(e) => fijar('overLight', e.target.checked)} />
      </label>
      <label className="config-vidrio__fila">
        <span>mode</span>
        <select value={valor.mode} onChange={(e) => fijar('mode', e.target.value as Vidrio['mode'])}>
          {MODOS.map((modo) => (
            <option key={modo} value={modo}>
              {modo}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

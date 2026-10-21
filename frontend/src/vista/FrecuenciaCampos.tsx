/* Campos de frecuencia de un hábito dentro del modal: el tipo y el único dato
 * que ese tipo necesita. Se guarda al momento como el resto del formulario. */
import { DIAS_SEMANA, FRECUENCIAS } from '../logica/frecuencia';
import type { Frecuencia, FrecuenciaDetalle } from '../logica/tipos';
import { Opciones } from './Opciones';

interface Props {
  frecuencia: FrecuenciaDetalle;
  onCambiar: (cambios: FrecuenciaDetalle) => void;
}

export function FrecuenciaCampos({ frecuencia, onCambiar }: Props) {
  return (
    <>
      <div className="campo">
        <p className="campo__titulo">Frecuencia</p>
        <Opciones
          titulo="Frecuencia"
          valor={frecuencia.tipo ?? 'diario'}
          opciones={FRECUENCIAS}
          onElegir={(id) => onCambiar({ tipo: id as Frecuencia })}
        />
      </div>

      {/* Solo el dato de la frecuencia elegida: enseñar los cuatro sería ruido
          que no se puede rellenar. */}
      {frecuencia.tipo === 'cadaXDias' && (
        <div className="campo">
          <label className="campo__titulo" htmlFor="frecuencia-cada">
            Cada cuántos días
          </label>
          <input
            id="frecuencia-cada"
            className="entrada"
            type="number"
            min={2}
            max={30}
            value={frecuencia.cadaDias ?? 2}
            onChange={(evento) =>
              onCambiar({ cadaDias: Math.min(30, Math.max(2, Number(evento.target.value) || 2)) })
            }
          />
        </div>
      )}

      {frecuencia.tipo === 'diasEspecificos' && (
        <div className="campo">
          <p className="campo__titulo">Días</p>
          {/* Elección múltiple: cada día se enciende y se apaga, y el último no
              se puede apagar (no tocaría nunca). */}
          <div className="opciones" role="group" aria-label="Días de la semana">
            {DIAS_SEMANA.map((dia) => {
              const activo = frecuencia.diasSemana?.includes(dia) ?? false;
              return (
                <button
                  key={dia}
                  type="button"
                  aria-pressed={activo}
                  className={`segmento${activo ? ' segmento--activo' : ''}`}
                  onClick={() => {
                    const actuales = frecuencia.diasSemana ?? [];
                    if (activo && actuales.length === 1) return;
                    onCambiar({ diasSemana: activo ? actuales.filter((d) => d !== dia) : [...actuales, dia] });
                  }}
                >
                  {dia.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {frecuencia.tipo === 'mensual' && (
        <div className="campo">
          <label className="campo__titulo" htmlFor="frecuencia-veces">
            Veces al mes
          </label>
          <input
            id="frecuencia-veces"
            className="entrada"
            type="number"
            min={1}
            max={30}
            value={frecuencia.vecesAlMes ?? 4}
            onChange={(evento) =>
              onCambiar({ vecesAlMes: Math.min(30, Math.max(1, Number(evento.target.value) || 1)) })
            }
          />
        </div>
      )}
    </>
  );
}

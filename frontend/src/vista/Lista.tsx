/* Vista de listas: tareas pendientes y hábitos, en una sola columna centrada. */
import { useState } from 'react';
import { fechaLocal, hechoHoy, resumen } from '../logica/seleccion';
import type { Habito, Tarea } from '../logica/tipos';
import { usarDashboard } from './usarDashboard';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function etiquetaFecha(ahora: Date): string {
  return `${DIAS[ahora.getDay()]} ${ahora.getDate()} de ${MESES[ahora.getMonth()]}`;
}

function FilaTarea({ tarea }: { tarea: Tarea }) {
  // La urgencia se lee solo para el acento visual; el texto no la repite.
  const acento = tarea.urgencia === 'bloqueante' || tarea.urgencia === 'urgente';
  return (
    <li className={`fila${acento ? ' fila--urgente' : ''}`}>
      <span className="fila__marca" aria-hidden="true" />
      <span className="fila__texto">{tarea.texto}</span>
    </li>
  );
}

function FilaHabito({ habito, hoy }: { habito: Habito; hoy: string }) {
  const hecho = hechoHoy(habito, hoy);
  const racha = habito.racha ?? 0;
  return (
    <li className={`fila${hecho ? ' fila--hecho' : ''}`}>
      <span className="fila__marca" aria-hidden="true" />
      <span className="fila__texto">{habito.nombre}</span>
      {racha > 1 && <span className="fila__nota">{racha} días</span>}
    </li>
  );
}

export function Lista() {
  const estado = usarDashboard();
  // La fecha se congela al montar: la vista no se repinta sola a medianoche.
  const [ahora] = useState(() => new Date());
  const hoy = fechaLocal(ahora);

  return (
    <main className="marco">
      <div className="columna">
        <header className="cabecera">
          <h1 className="cabecera__titulo">Hoy</h1>
          <span className="cabecera__fecha">{etiquetaFecha(ahora)}</span>
        </header>

        {estado.fase === 'cargando' && <p className="aviso">Cargando…</p>}
        {estado.fase === 'error' && (
          <p className="aviso aviso--error" role="alert">
            {estado.mensaje}
          </p>
        )}

        {estado.fase === 'listo' && <Contenido datos={estado.datos} hoy={hoy} />}
      </div>
    </main>
  );
}

function Contenido({ datos, hoy }: { datos: Parameters<typeof resumen>[0]; hoy: string }) {
  const { tareas, habitos, hechos } = resumen(datos, hoy);

  return (
    <>
      <section className="seccion" aria-labelledby="titulo-tareas">
        <h2 className="seccion__titulo" id="titulo-tareas">
          <span>Tareas</span>
          <span>{tareas.length}</span>
        </h2>
        {tareas.length === 0 ? (
          <p className="aviso">Nada pendiente.</p>
        ) : (
          <ul className="lista">
            {tareas.map((tarea) => (
              <FilaTarea key={tarea.id} tarea={tarea} />
            ))}
          </ul>
        )}
      </section>

      <section className="seccion" aria-labelledby="titulo-habitos">
        <h2 className="seccion__titulo" id="titulo-habitos">
          <span>Hábitos</span>
          <span>
            {hechos}/{habitos.length}
          </span>
        </h2>
        {habitos.length === 0 ? (
          <p className="aviso">Sin hábitos.</p>
        ) : (
          <ul className="lista">
            {habitos.map((habito) => (
              <FilaHabito key={habito.id} habito={habito} hoy={hoy} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

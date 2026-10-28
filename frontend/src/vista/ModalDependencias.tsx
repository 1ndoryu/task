/* Elegir lo que debe hacerse antes de una fila: se buscan tareas y hábitos y
 * se marcan tantos como haga falta. Guarda sola, como la configuración: cada
 * marca escribe al momento. Un requisito que cerraría un ciclo no se ofrece. */
import { useEffect, useRef, useState } from 'react';
import { alternarDependencia, cierraCiclo, claveDep, dependenciasDe } from '../logica/dependencias';
import type { Dashboard, RefDependencia } from '../logica/tipos';

interface Props {
  /** La fila que espera; `null` cierra el modal. */
  objetivo: RefDependencia | null;
  datos: Dashboard;
  onCambiar: (objetivo: RefDependencia, lista: RefDependencia[]) => void;
  onCerrar: () => void;
}

interface Opcion {
  ref: RefDependencia;
  nombre: string;
}

export function ModalDependencias({ objetivo, datos, onCambiar, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    if (objetivo && !nodo.open) nodo.showModal();
    if (!objetivo && nodo.open) nodo.close();
    if (!objetivo) setBusqueda('');
  }, [objetivo]);

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    nodo.addEventListener('close', onCerrar);
    return () => nodo.removeEventListener('close', onCerrar);
  }, [onCerrar]);

  if (!objetivo) return <dialog className="modal" ref={dialogo} aria-label="Dependencias" />;

  const todas: Opcion[] = [
    ...datos.tareas.map((t) => ({ ref: { tipo: 'tarea' as const, id: t.id }, nombre: t.texto })),
    ...datos.habitos.map((h) => ({ ref: { tipo: 'habito' as const, id: h.id }, nombre: h.nombre })),
  ];
  const nombreDe = (ref: RefDependencia) => todas.find((o) => claveDep(o.ref) === claveDep(ref))?.nombre ?? 'Ya no existe';
  const elegidas = dependenciasDe(datos, objetivo);
  const texto = busqueda.trim().toLowerCase();
  const candidatas = todas
    .filter((o) => claveDep(o.ref) !== claveDep(objetivo) && o.nombre.toLowerCase().includes(texto))
    .slice(0, 40);
  const alternar = (ref: RefDependencia) => onCambiar(objetivo, alternarDependencia(elegidas, ref));

  return (
    <dialog
      className="modal"
      ref={dialogo}
      aria-label="Dependencias"
      onClick={(evento) => {
        if (evento.target === dialogo.current) onCerrar();
      }}
    >
      <div className="modal__caja">
        <div className="modal__cuerpo">
          <p className="campo__titulo">Antes de «{nombreDe(objetivo)}»</p>
          {elegidas.length > 0 && (
            <ul className="dependencias__elegidas" aria-label="Debe hacerse antes">
              {elegidas.map((ref) => (
                <li key={claveDep(ref)}>
                  <button type="button" className="boton" title="Quitar" onClick={() => alternar(ref)}>
                    {nombreDe(ref)} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            className="entrada"
            autoFocus
            placeholder="Buscar tarea o hábito…"
            aria-label="Buscar lo que debe ir antes"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
          <ul className="dependencias__lista" aria-label="Tareas y hábitos">
            {candidatas.map((o) => {
              const marcada = elegidas.some((e) => claveDep(e) === claveDep(o.ref));
              const ciclo = !marcada && cierraCiclo(datos, objetivo, o.ref);
              return (
                <li key={claveDep(o.ref)}>
                  <button
                    type="button"
                    className="dependencias__opcion"
                    aria-pressed={marcada}
                    disabled={ciclo}
                    title={ciclo ? 'Cerraría un ciclo: ya depende de esta fila' : undefined}
                    onClick={() => alternar(o.ref)}
                  >
                    <span className="dependencias__tipo">{o.ref.tipo === 'tarea' ? 'Tarea' : 'Hábito'}</span>
                    <span className="dependencias__nombre">{o.nombre}</span>
                  </button>
                </li>
              );
            })}
            {candidatas.length === 0 && <li className="dependencias__vacio">Nada que coincida.</li>}
          </ul>
        </div>
      </div>
    </dialog>
  );
}

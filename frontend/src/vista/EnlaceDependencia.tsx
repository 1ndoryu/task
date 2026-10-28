/* Crear una dependencia tirando de un hilo: desde la fila elegida sale un hilo
 * rojo que sigue al cursor; el clic en otra tarea o hábito lo ata y entonces
 * se pregunta cuál de las dos espera a la otra. Esc o un clic en vacío lo
 * suelta. Atar un par que ya existe lo quita. */
import { useEffect, useRef, useState } from 'react';
import { alternarDependencia, cierraCiclo, claveDep, dependenciasDe } from '../logica/dependencias';
import type { Dashboard, RefDependencia } from '../logica/tipos';
import { puntoDe } from './HilosDependencias';
import { Modal, type BotonModal } from './Modal';

interface Props {
  /** La fila de la que sale el hilo; `null`: no se está enlazando. */
  origen: RefDependencia | null;
  datos: Dashboard;
  onCambiar: (objetivo: RefDependencia, lista: RefDependencia[]) => void;
  onCerrar: () => void;
}

const CAIDA = 40;
const LARGO_NOMBRE = 28;

/** Lee la fila que lleva un clic: solo tareas y hábitos, no subhábitos. */
function filaEn(destino: EventTarget | null): RefDependencia | null {
  const clave = (destino as HTMLElement | null)?.closest?.('[data-fila]')?.getAttribute('data-fila') ?? '';
  const partes = /^(tarea|habito)(\d+)$/.exec(clave);
  return partes ? { tipo: partes[1] as RefDependencia['tipo'], id: Number(partes[2]) } : null;
}

function recortar(texto: string): string {
  return texto.length > LARGO_NOMBRE ? `${texto.slice(0, LARGO_NOMBRE - 1)}…` : texto;
}

export function EnlaceDependencia({ origen, datos, onCambiar, onCerrar }: Props) {
  const [destino, setDestino] = useState<RefDependencia | null>(null);
  const cuerda = useRef<SVGPathElement>(null);
  const clave = origen ? claveDep(origen) : '';

  // El hilo: del origen al cursor, con algo de seno. Se repinta cada cuadro
  // para seguir al origen si la lista se desplaza.
  useEffect(() => {
    if (!origen || destino) return;
    const cursor = { x: 0, y: 0, visto: false };
    const alMover = (e: PointerEvent) => Object.assign(cursor, { x: e.clientX, y: e.clientY, visto: true });
    // Clic en otra fila: la ata; en vacío: suelta el hilo. Va en captura para
    // que la fila no reaccione (completar, abrir) al mismo clic.
    const alClicar = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const fila = filaEn(e.target);
      if (!fila) onCerrar();
      else if (claveDep(fila) !== clave) setDestino(fila);
    };
    const alTecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    let cuadro = 0;
    const pintar = () => {
      const a = puntoDe(clave);
      const camino = cuerda.current;
      if (camino) {
        camino.style.visibility = a && cursor.visto ? 'visible' : 'hidden';
        if (a) camino.setAttribute('d', `M${a.x} ${a.y}Q${(a.x + cursor.x) / 2} ${Math.max(a.y, cursor.y) + CAIDA} ${cursor.x} ${cursor.y}`);
      }
      cuadro = requestAnimationFrame(pintar);
    };
    cuadro = requestAnimationFrame(pintar);
    // Un tick después: el clic que abrió el menú aún está subiendo por el documento.
    const espera = setTimeout(() => document.addEventListener('click', alClicar, true), 0);
    document.addEventListener('pointermove', alMover);
    document.addEventListener('keydown', alTecla);
    return () => {
      cancelAnimationFrame(cuadro);
      clearTimeout(espera);
      document.removeEventListener('click', alClicar, true);
      document.removeEventListener('pointermove', alMover);
      document.removeEventListener('keydown', alTecla);
    };
  }, [origen, destino, clave, onCerrar]);

  useEffect(() => {
    if (!origen) setDestino(null);
  }, [origen]);

  const nombres = new Map<string, string>([
    ...datos.tareas.map((t) => [claveDep({ tipo: 'tarea', id: t.id }), t.texto] as const),
    ...datos.habitos.map((h) => [claveDep({ tipo: 'habito', id: h.id }), h.nombre] as const),
  ]);
  const nombreDe = (ref: RefDependencia) => recortar(nombres.get(claveDep(ref)) ?? 'Ya no existe');

  // Las dos lecturas del par; la que cerraría un ciclo no se ofrece.
  const sentidos = (espera: RefDependencia, antes: RefDependencia) => {
    const existe = dependenciasDe(datos, espera).some((r) => claveDep(r) === claveDep(antes));
    if (!existe && cierraCiclo(datos, antes, espera)) return null;
    return { espera, antes, existe };
  };
  const opciones = origen && destino ? [sentidos(origen, destino), sentidos(destino, origen)] : [];
  const botones: BotonModal[] = [{ id: 'cancelar', etiqueta: 'Cancelar' }];
  opciones.forEach((o, i) => {
    if (!o) return;
    const frase = `«${nombreDe(o.espera)}» espera a «${nombreDe(o.antes)}»`;
    botones.push({ id: String(i), etiqueta: o.existe ? `Quitar: ${frase}` : frase, principal: !o.existe, peligro: o.existe });
  });

  const elegir = (id: string) => {
    const o = opciones[Number(id)];
    if (o) onCambiar(o.espera, alternarDependencia(dependenciasDe(datos, o.espera), o.antes));
    onCerrar();
  };

  return (
    <>
      {origen && !destino && (
        <>
          <svg className="hilos" aria-hidden="true">
            <path ref={cuerda} className="hilos__cuerda" />
          </svg>
          <p className="enlace__ayuda" role="status">
            Haz clic en la tarea o el hábito que quieres enlazar · Esc cancela
          </p>
        </>
      )}
      <Modal abierto={!!origen && !!destino} titulo="¿Cuál espera a cuál?" botones={botones} onElegir={elegir} onCerrar={onCerrar}>
        {opciones.every((o) => !o) && <p className="perfil__nota">Ya hay una cadena entre las dos: cualquier sentido cerraría un ciclo.</p>}
      </Modal>
    </>
  );
}

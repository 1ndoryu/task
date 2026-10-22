/* Estado del panel de grupos: el nombre nuevo, el grupo que se renombra, el
 * texto en curso y el que espera confirmación de borrado. Son cuatro piezas de
 * una sola historia, así que viven juntas: el componente solo las pinta. */
import { useState } from 'react';
import { limpiarGrupo } from '../logica/orden';

interface Entrada {
  grupos: string[];
  onCrear: (nombre: string) => void;
  onRenombrar: (viejo: string, nuevo: string) => void;
  onBorrar: (nombre: string, conFilas: boolean) => void;
}

export interface PanelGruposEstado {
  nuevo: string;
  setNuevo: (texto: string) => void;
  /** Grupo que se está renombrando, o `null`. */
  editando: string | null;
  /** Texto en curso del renombrado. */
  borrador: string;
  setBorrador: (texto: string) => void;
  /** Grupo pendiente de confirmar el borrado. */
  borrando: string | null;
  crear: () => void;
  /** Empieza a renombrar con el nombre actual ya escrito. */
  empezarRenombrado: (nombre: string) => void;
  guardarNombre: () => void;
  cancelarRenombrado: () => void;
  pedirBorrado: (nombre: string) => void;
  confirmarBorrado: (conFilas: boolean) => void;
  cancelarBorrado: () => void;
}

export function usarPanelGrupos({ grupos, onCrear, onRenombrar, onBorrar }: Entrada): PanelGruposEstado {
  const [nuevo, setNuevo] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [borrando, setBorrando] = useState<string | null>(null);

  const crear = () => {
    const limpio = limpiarGrupo(nuevo);
    if (!limpio || grupos.includes(limpio)) return;
    onCrear(limpio);
    setNuevo('');
  };

  const empezarRenombrado = (nombre: string) => {
    setEditando(nombre);
    setBorrador(nombre);
  };

  const cancelarRenombrado = () => {
    setEditando(null);
    setBorrador('');
  };

  const guardarNombre = () => {
    const limpio = limpiarGrupo(borrador);
    // Vacío o igual al que ya tenía: no hay nada que guardar.
    if (editando && limpio && limpio !== editando) onRenombrar(editando, limpio);
    cancelarRenombrado();
  };

  const confirmarBorrado = (conFilas: boolean) => {
    if (borrando) onBorrar(borrando, conFilas);
    setBorrando(null);
  };

  return {
    nuevo,
    setNuevo,
    editando,
    borrador,
    setBorrador,
    borrando,
    crear,
    empezarRenombrado,
    guardarNombre,
    cancelarRenombrado,
    pedirBorrado: setBorrando,
    confirmarBorrado,
    cancelarBorrado: () => setBorrando(null),
  };
}

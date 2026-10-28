/* Los cuatro modales de la vista, en un solo sitio: van montados siempre y es
 * su prop `abierto` (o el `null` del borrado y de la fila) quien los pinta.
 * Están juntos porque se abren desde sitios distintos —la barra, el menú del
 * panel y la propia fila— y así la vista no los reparte por sus ramas. */
import type { Dashboard, Proyecto, RefDependencia } from '../logica/tipos';
import type { ColoresNivel, Preferencias } from '../logica/preferencias';
import { Ajustes } from './Ajustes';
import { ConfiguracionTarea } from './ConfiguracionTarea';
import { ConfirmarPanel, type Borrado } from './ConfirmarPanel';
import { ModalDependencias } from './ModalDependencias';
import type { CambiosFilaForm } from './opcionesFila';
import { PanelGrupos } from './PanelGrupos';
import type { Editando } from './usarLista';

interface Props {
  ajustesAbiertos: boolean;
  preferencias: Preferencias;
  onCambiar: (cambios: Partial<Preferencias>) => void;
  onAbrirAjustes: (abiertos: boolean) => void;
  gruposAbiertos: boolean;
  grupos: string[];
  cuenta: Record<string, number>;
  onCrearGrupo: (nombre: string) => void;
  onRenombrarGrupo: (viejo: string, nuevo: string) => void;
  onBorrarGrupo: (nombre: string, conFilas: boolean) => void;
  onCerrarGrupos: () => void;
  editando: Editando;
  proyectos: Proyecto[];
  colores: ColoresNivel;
  onGuardar: (fila: NonNullable<Editando>, cambios: CambiosFilaForm) => void;
  onCerrarEdicion: () => void;
  /** Fila cuyas dependencias se eligen (`null`: cerrado) y cómo se guardan. */
  dependenciasDe: RefDependencia | null;
  datos: Dashboard;
  onAbrirDependencias: (objetivo: RefDependencia | null) => void;
  onDependencias: (objetivo: RefDependencia, lista: RefDependencia[]) => void;
  borrando: Borrado | null;
  onBorrarNota: () => void;
  onBorrarPanelGrupo: (conFilas: boolean) => void;
  onCerrarBorrado: () => void;
}

export function Modales({
  ajustesAbiertos,
  preferencias,
  onCambiar,
  onAbrirAjustes,
  gruposAbiertos,
  grupos,
  cuenta,
  onCrearGrupo,
  onRenombrarGrupo,
  onBorrarGrupo,
  onCerrarGrupos,
  editando,
  proyectos,
  colores,
  onGuardar,
  onCerrarEdicion,
  dependenciasDe,
  datos,
  onAbrirDependencias,
  onDependencias,
  borrando,
  onBorrarNota,
  onBorrarPanelGrupo,
  onCerrarBorrado,
}: Props) {
  return (
    <>
      <Ajustes
        abierto={ajustesAbiertos}
        preferencias={preferencias}
        onCambiar={onCambiar}
        onCerrar={() => onAbrirAjustes(false)}
      />

      <PanelGrupos
        abierto={gruposAbiertos}
        grupos={grupos}
        cuenta={cuenta}
        onCrear={onCrearGrupo}
        onRenombrar={onRenombrarGrupo}
        onBorrar={onBorrarGrupo}
        onCerrar={onCerrarGrupos}
      />

      <ConfiguracionTarea
        fila={editando}
        proyectos={proyectos}
        grupos={grupos}
        colores={colores}
        onGuardar={onGuardar}
        onDependencias={(fila) => {
          if (fila.tipo === 'tarea') onAbrirDependencias({ tipo: 'tarea', id: fila.tarea.id });
          else if (fila.tipo === 'habito') onAbrirDependencias({ tipo: 'habito', id: fila.habito.id });
        }}
        onCerrar={onCerrarEdicion}
      />

      <ModalDependencias
        objetivo={dependenciasDe}
        datos={datos}
        onCambiar={onDependencias}
        onCerrar={() => onAbrirDependencias(null)}
      />

      <ConfirmarPanel
        borrado={borrando}
        onNota={onBorrarNota}
        onGrupo={onBorrarPanelGrupo}
        onCerrar={onCerrarBorrado}
      />
    </>
  );
}

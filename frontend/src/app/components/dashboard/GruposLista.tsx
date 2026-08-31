/*
 * GruposLista
 *
 * [300A-2] Lista de grupos de ejecución debajo del botón "Tareas" en el
 * sidebar. Extraído de SidebarMenu para mantener ese componente bajo el
 * límite de líneas y separar responsabilidades de render.
 */
import {Folder} from 'lucide-react';
import {Boton} from '../ui';

export interface GruposListaProps {
    grupos: string[];
    grupoTareasActivo?: string | null;
    renombrandoGrupo: string | null;
    nuevoNombreGrupo: string;
    onSeleccionarGrupo?: (grupo: string | null) => void;
    onContextMenuGrupo: (e: React.MouseEvent, grupo: string) => void;
    onCambiarNombre: (valor: string) => void;
    onConfirmarRenombrar: () => void;
    onCancelarRenombrar: () => void;
}

export function GruposLista({
    grupos,
    grupoTareasActivo,
    renombrandoGrupo,
    nuevoNombreGrupo,
    onSeleccionarGrupo,
    onContextMenuGrupo,
    onCambiarNombre,
    onConfirmarRenombrar,
    onCancelarRenombrar,
}: GruposListaProps): JSX.Element {
    return (
        <div className="sidebarMenuGruposLista">
            {grupos.map(grupo =>
                renombrandoGrupo === grupo ? (
                    /* Renombrar solo con teclado (Enter acepta, Escape cancela,
                     * sin botones) manteniendo el icono de carpeta. */
                    <div key={grupo} className="sidebarMenuGrupoRenombrar">
                        <Folder size={12} className="sidebarMenuGrupoRenombrarIcono" />
                        <input
                            autoFocus
                            type="text"
                            value={nuevoNombreGrupo}
                            onChange={e => onCambiarNombre(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onConfirmarRenombrar();
                                }
                                if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    onCancelarRenombrar();
                                }
                            }}
                            placeholder="Nuevo nombre"
                            className="selectorGrupoInput"
                        />
                    </div>
                ) : (
                    <Boton
                        key={grupo}
                        variante="ghost"
                        claseAdicional={`sidebarMenuBoton sidebarMenuGrupoBoton ${grupoTareasActivo === grupo ? 'sidebarMenuBoton--activo sidebarMenuGrupoBoton--activo' : ''}`}
                        onClick={() => onSeleccionarGrupo?.(grupo)}
                        onContextMenu={e => onContextMenuGrupo(e, grupo)}
                        icono={<Folder size={12} />}
                        title={`${grupo} (clic derecho: opciones)`}
                    >
                        {grupo}
                    </Boton>
                ),
            )}
        </div>
    );
}
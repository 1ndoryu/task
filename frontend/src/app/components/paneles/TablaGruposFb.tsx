/* [H-F13-01] Tabla de grupos extraída de PanelGruposFb: renderiza el thead
 * con columnas configurables (ThOrdenable) y el tbody con FilaGrupo + el
 * centinela del renderizado progresivo. El panel queda como composición. */

import {Check} from 'lucide-react';
import type {RefObject} from 'react';
import {FilaGrupo} from './FilaGrupo';
import {ThOrdenable} from './ThOrdenable';
import type {GrupoFb} from '../../stores/gruposFbStore';
import type {ColumnId} from '../../hooks/paneles/useColumnasGruposFb';
import type {CampoOrden, EstadoOrden} from '../../hooks/paneles/usePanelGruposFb';

/* React 18.3: useRef<T>(null) devuelve RefObject<T> (current: T | null). */

interface TablaGruposFbProps {
    gruposVisibles: GrupoFb[];
    visibilidad: Record<ColumnId, boolean>;
    orden: EstadoOrden;
    cambiarOrden: (campo: CampoOrden) => void;
    categorias: {nombre: string; icono: string; color: string}[];
    columnasActivas: number;
    hayMasGrupos: boolean;
    limiteVisible: number;
    totalGrupos: number;
    refCentinela: RefObject<HTMLTableRowElement>;
    onPublicar: (id: number) => void;
    onCambiarCategoria: (id: number, categoria: string | null) => void;
    onCambiarImportancia: (id: number, importancia: number) => void;
    onMenuContextual: (e: React.MouseEvent, grupoId: number) => void;
}

export function TablaGruposFb({gruposVisibles, visibilidad, orden, cambiarOrden, categorias, columnasActivas, hayMasGrupos, limiteVisible, totalGrupos, refCentinela, onPublicar, onCambiarCategoria, onCambiarImportancia, onMenuContextual}: TablaGruposFbProps): JSX.Element {
    return (
        <div className="panelGruposFb__tablaContenedor">
            <table className="panelGruposFb__tabla">
                <thead>
                    <tr>
                        {visibilidad.check && <th className="panelGruposFb__colCheck"><Check size={11} /></th>}
                        {visibilidad.imagen && <th className="panelGruposFb__colImagen" />}
                        {visibilidad.nombre && <ThOrdenable campo="nombre" etiqueta="Grupo" orden={orden} onClick={cambiarOrden} />}
                        {visibilidad.tipo && <ThOrdenable campo="tipo" etiqueta="Tipo" orden={orden} onClick={cambiarOrden} className="panelGruposFb__colTipo" />}
                        {visibilidad.miembros && <ThOrdenable campo="miembros" etiqueta="Miembros" orden={orden} onClick={cambiarOrden} className="panelGruposFb__colMiembros" />}
                        {visibilidad.publicaciones && <th className="panelGruposFb__colPub">Pub/día</th>}
                        {visibilidad.categoria && <ThOrdenable campo="categoria" etiqueta="Categoría" orden={orden} onClick={cambiarOrden} className="panelGruposFb__colCategoria" />}
                        {visibilidad.importancia && <ThOrdenable campo="importancia" etiqueta="Importancia" orden={orden} onClick={cambiarOrden} className="panelGruposFb__colImportancia" />}
                        {visibilidad.acciones && <th className="panelGruposFb__colAcciones" />}
                    </tr>
                </thead>
                <tbody>
                    {gruposVisibles.map(grupo => (
                        <FilaGrupo
                            key={grupo.id}
                            grupo={grupo}
                            categorias={categorias}
                            columnasVisibles={visibilidad}
                            onPublicar={() => onPublicar(grupo.id)}
                            onCambiarCategoria={(cat) => onCambiarCategoria(grupo.id, cat)}
                            onCambiarImportancia={(imp) => onCambiarImportancia(grupo.id, imp)}
                            onMenuContextual={(e) => onMenuContextual(e, grupo.id)}
                        />
                    ))}
                    {/* [024A-18] Centinela invisible: el IntersectionObserver lo detecta para cargar más */}
                    {hayMasGrupos && (
                        <tr ref={refCentinela} className="panelGruposFb__centinela">
                            <td colSpan={columnasActivas}>
                                Cargando más ({limiteVisible} de {totalGrupos})...
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

/* [024A-17] PanelGruposFb
 * Panel de dashboard para gestionar grupos de Facebook detectados por la extensión.
 * Muestra tabla sortable con filtros, categorías, importancia, acciones.
 * [263A-4] Rediseño: filtros en header como SelectorBadge, búsqueda estilo modalNotasBusqueda.
 * [024A-17] Columnas configurables: el usuario elige qué columnas ver. */

import {useState, useCallback, useRef, useEffect} from 'react';
import {RefreshCw, ExternalLink, EyeOff, Eye, Trash2, Check, Users, Search, Star, FolderOpen, Settings, SlidersHorizontal} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {MenuContextual, SelectorBadge} from '../shared';
import {Boton, Input} from '../ui';
import {usePanelGruposFb} from '../../hooks/paneles/usePanelGruposFb';
import {useColumnasGruposFb} from '../../hooks/paneles/useColumnasGruposFb';
import type {ColumnId} from '../../hooks/paneles/useColumnasGruposFb';
import {FilaGrupo} from './FilaGrupo';
import type {GrupoFb} from '../../stores/gruposFbStore';
import '../../styles/dashboard/componentes/panelGruposFb.css';

interface PanelGruposFbProps {
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    onAbrirConfigGruposFb?: () => void;
}

export function PanelGruposFb({renderHandleArrastre, handleMinimizar, onAbrirConfigGruposFb}: PanelGruposFbProps): JSX.Element {
    const {
        grupos, todosLosGrupos, categorias, estadisticas, cargando, inicializado, error,
        filtros, setFiltro, toggleOculto, cambiarCategoria,
        cambiarImportancia, publicar, eliminar, recargar
    } = usePanelGruposFb();

    /* [024A-17] Columnas configurables */
    const {columnas, visibilidad, columnasActivas, toggleColumna} = useColumnasGruposFb();
    const [menuColumnasAbierto, setMenuColumnasAbierto] = useState(false);
    const refMenuColumnas = useRef<HTMLDivElement>(null);

    /* [024A-17] Click outside cierra el dropdown de columnas.
     * sentinel-disable-line: MenuContextual no sirve aquí porque cierra al hacer click
     * y necesitamos multi-select (toggle varias columnas sin cerrar). */
    useEffect(() => {
        if (!menuColumnasAbierto) return;
        const handler = (e: MouseEvent) => {
            if (refMenuColumnas.current && !refMenuColumnas.current.contains(e.target as Node)) {
                setMenuColumnasAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuColumnasAbierto]);

    const [menuContextual, setMenuContextual] = useState<{visible: boolean; x: number; y: number; grupoId: number | null}>({visible: false, x: 0, y: 0, grupoId: null});

    const abrirMenuGrupo = useCallback((e: React.MouseEvent, grupoId: number) => {
        e.preventDefault();
        setMenuContextual({visible: true, x: e.clientX, y: e.clientY, grupoId});
    }, []);

    const manejarSeleccionMenu = useCallback((opcionId: string) => {
        const id = menuContextual.grupoId;
        setMenuContextual(prev => ({...prev, visible: false}));
        if (!id) return;

        const grupo = grupos.find(g => g.id === id);
        if (!grupo) return;

        switch (opcionId) {
            case 'publicar': publicar(id); break;
            case 'ocultar': toggleOculto(grupo); break;
            case 'eliminar': eliminar(id); break;
            case 'ir': window.open(grupo.url, '_blank', 'noopener'); break;
        }
    }, [menuContextual.grupoId, grupos, publicar, toggleOculto, eliminar]);

    const obtenerOpcionesMenu = useCallback((grupo: GrupoFb) => [
        {id: 'ir', etiqueta: 'Ir al grupo', icono: <ExternalLink size={12} />},
        {id: 'publicar', etiqueta: 'Marcar publicado', icono: <Check size={12} />},
        {id: 'ocultar', etiqueta: grupo.oculto ? 'Mostrar' : 'Ocultar', icono: grupo.oculto ? <Eye size={12} /> : <EyeOff size={12} />},
        {id: 'eliminar', etiqueta: 'Eliminar', icono: <Trash2 size={12} />, peligroso: true, separadorDespues: false}
    ], []);

    /* [263A-4] Opciones para SelectorBadge de categoría */
    const opcionesCategoria = [
        {id: '', etiqueta: 'Todas', icono: <FolderOpen size={12} />, descripcion: 'Sin filtro'},
        ...categorias.map(c => ({id: c.nombre, etiqueta: c.nombre, icono: <span>{c.icono}</span>, descripcion: ''}))
    ];

    /* [263A-4] Opciones para SelectorBadge de importancia */
    const opcionesImportancia = [
        {id: '', etiqueta: 'Todas', icono: <Star size={12} />, descripcion: 'Sin filtro'},
        ...[5, 4, 3, 2, 1].map(n => ({id: String(n), etiqueta: String(n), icono: <Star size={12} />, descripcion: ''}))
    ];

    /* [263A-4] Estado del input de búsqueda expandible */
    const [busquedaAbierta, setBusquedaAbierta] = useState(!!filtros.busqueda);
    const inputBusquedaRef = useRef<HTMLInputElement>(null);

    const toggleBusqueda = useCallback(() => {
        if (busquedaAbierta && !filtros.busqueda) {
            setBusquedaAbierta(false);
        } else {
            setBusquedaAbierta(true);
            setTimeout(() => inputBusquedaRef.current?.focus(), 50);
        }
    }, [busquedaAbierta, filtros.busqueda]);

    return (
        <div className="panelDashboard internaColumna">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Grupos FB')}
                variante="panelHeader"
                acciones={
                    <>
                        {/* [263A-4] Búsqueda estilo modalNotasBusqueda--headerCentrado */}
                        {busquedaAbierta ? (
                            <div className="panelGruposFb__busquedaHeader">
                                <Search size={12} className="panelGruposFb__busquedaIcono" />
                                <Input
                                    ref={inputBusquedaRef}
                                    tipo="text"
                                    claseAdicional="panelGruposFb__busquedaInput"
                                    placeholder="Buscar grupo..."
                                    value={filtros.busqueda}
                                    onChange={e => setFiltro('busqueda', e.target.value)}
                                    onBlur={() => { if (!filtros.busqueda) setBusquedaAbierta(false); }}
                                />
                            </div>
                        ) : (
                            <Boton variante="badge" soloIcono onClick={toggleBusqueda} icono={<Search size={12} />} title="Buscar grupo" />
                        )}
                        {/* [263A-4] Filtros como SelectorBadge */}
                        <SelectorBadge opciones={opcionesCategoria} valorActual={filtros.categoria} onChange={valor => setFiltro('categoria', valor)} icono={<FolderOpen size={12} />} titulo="Categoría" soloIcono />
                        <SelectorBadge opciones={opcionesImportancia} valorActual={filtros.importancia} onChange={valor => setFiltro('importancia', valor)} icono={<Star size={12} />} titulo="Importancia" soloIcono />
                        <Boton variante="badge" soloIcono onClick={() => setFiltro('mostrarOcultos', !filtros.mostrarOcultos)} icono={filtros.mostrarOcultos ? <Eye size={12} /> : <EyeOff size={12} />} title={filtros.mostrarOcultos ? 'Mostrando ocultos' : 'Ocultos ocultos'} claseAdicional={filtros.mostrarOcultos ? 'selectorBadgeBoton--activo' : ''} />
                        <Boton variante="badge" soloIcono onClick={recargar} icono={<RefreshCw size={12} />} title="Recargar" />
                        {/* [024A-17] Toggle de columnas visibles */}
                        <div className="panelGruposFb__columnasContenedor" ref={refMenuColumnas}>
                            <Boton variante="badge" soloIcono onClick={() => setMenuColumnasAbierto(p => !p)} icono={<SlidersHorizontal size={12} />} title="Columnas visibles" />
                            {menuColumnasAbierto && (
                                <div className="panelGruposFb__menuColumnas">
                                    {columnas.map(col => (
                                        <div
                                            key={col.id}
                                            className="panelGruposFb__menuColumnasItem"
                                            onClick={() => !col.fija && toggleColumna(col.id)}
                                        >
                                            <span className={`panelGruposFb__menuColumnasCheck ${visibilidad[col.id] ? 'panelGruposFb__menuColumnasCheck--activo' : ''}`}>
                                                {visibilidad[col.id] && <Check size={8} color="#fff" />}
                                            </span>
                                            {col.etiqueta}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* [263A-5] Botón configuración (token, API URL) */}
                        {onAbrirConfigGruposFb && <Boton variante="badge" soloIcono onClick={onAbrirConfigGruposFb} icono={<Settings size={12} />} title="Configuración" />}
                        {handleMinimizar}
                    </>
                }
            />

            <div className="panelGruposFb">
                {/* [024A-9] Stats eliminadas por innecesarias */}

                {/* Contenido */}
                {cargando && !inicializado && (
                    <div className="panelGruposFb__cargando">Cargando grupos...</div>
                )}

                {error && (
                    <div className="panelGruposFb__vacio">
                        <p>Error: {error}</p>
                        <Boton variante="ghost" onClick={recargar}>Reintentar</Boton>
                    </div>
                )}

                {/* [263A-6] Empty state diagnóstico: distingue DB vacía vs filtros ocultan grupos */}
                {inicializado && !error && grupos.length === 0 && (
                    <div className="panelGruposFb__vacio">
                        <Users size={24} />
                        {todosLosGrupos.length > 0 ? (
                            /* Grupos existen pero los filtros activos los ocultan */
                            <>
                                <p className="panelGruposFb__vacioPrincipal">
                                    {todosLosGrupos.length} grupos cargados — ninguno visible con los filtros actuales
                                </p>
                                {!filtros.mostrarOcultos && todosLosGrupos.some(g => g.oculto) && (
                                    <p className="panelGruposFb__vacioDetalle">
                                        {todosLosGrupos.filter(g => g.oculto).length} grupos están ocultos.
                                        Activa el filtro <EyeOff size={11} className="panelGruposFb__vacioIconoInline" /> para verlos.
                                    </p>
                                )}
                                {(filtros.categoria || filtros.importancia || filtros.busqueda) && (
                                    <p className="panelGruposFb__vacioDetalle">
                                        Hay filtros activos (categoría, importancia o búsqueda). Límpialos para ver más.
                                    </p>
                                )}
                            </>
                        ) : estadisticas && estadisticas.total > 0 ? (
                            /* La estadística dice que hay grupos pero todos están marcados ocultos en el store */
                            <>
                                <p className="panelGruposFb__vacioPrincipal">
                                    {estadisticas.total} grupos en el servidor — todos ocultos
                                </p>
                                <p className="panelGruposFb__vacioDetalle">
                                    Activa <EyeOff size={11} className="panelGruposFb__vacioIconoInline" /> para mostrar grupos ocultos.
                                </p>
                            </>
                        ) : (
                            /* DB genuinamente vacía — la extensión nunca sincronizó o falló */
                            <>
                                <p className="panelGruposFb__vacioPrincipal">
                                    El servidor no tiene grupos (total en BD: {estadisticas?.total ?? 0})
                                </p>
                                <p className="panelGruposFb__vacioDetalle">
                                    La extensión tiene los grupos localmente pero aún no los sincronizó.
                                    Abre la extensión → Config → &quot;Sincronizar ahora&quot;, o navega por Facebook para activar la detección automática.
                                </p>
                                <p className="panelGruposFb__vacioAyuda">
                                    Verifica también que el token API y la URL estén configurados correctamente en <Settings size={11} className="panelGruposFb__vacioIconoInline" />.
                                </p>
                            </>
                        )}
                        <Boton variante="ghost" onClick={recargar}>Recargar</Boton>
                    </div>
                )}

                {grupos.length > 0 && (
                    <div className="panelGruposFb__tablaContenedor">
                        <table className="panelGruposFb__tabla">
                            <thead>
                                <tr>
                                    {visibilidad.check && <th className="panelGruposFb__colCheck"><Check size={11} /></th>}
                                    {visibilidad.imagen && <th className="panelGruposFb__colImagen" />}
                                    {visibilidad.nombre && <th>Grupo</th>}
                                    {visibilidad.tipo && <th className="panelGruposFb__colTipo">Tipo</th>}
                                    {visibilidad.miembros && <th>Miembros</th>}
                                    {visibilidad.publicaciones && <th className="panelGruposFb__colPub">Pub/día</th>}
                                    {visibilidad.categoria && <th className="panelGruposFb__colCategoria">Categoría</th>}
                                    {visibilidad.importancia && <th className="panelGruposFb__colImportancia">Importancia</th>}
                                    {visibilidad.acciones && <th className="panelGruposFb__colAcciones" />}
                                </tr>
                            </thead>
                            <tbody>
                                {grupos.map(grupo => (
                                    <FilaGrupo
                                        key={grupo.id}
                                        grupo={grupo}
                                        categorias={categorias}
                                        columnasVisibles={visibilidad}
                                        onPublicar={() => publicar(grupo.id)}
                                        onCambiarCategoria={(cat) => cambiarCategoria(grupo.id, cat)}
                                        onCambiarImportancia={(imp) => cambiarImportancia(grupo.id, imp)}
                                        onMenuContextual={(e) => abrirMenuGrupo(e, grupo.id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Menú contextual */}
            {menuContextual.visible && menuContextual.grupoId && (
                <MenuContextual
                    opciones={obtenerOpcionesMenu(grupos.find(g => g.id === menuContextual.grupoId)!)}
                    posicionX={menuContextual.x}
                    posicionY={menuContextual.y}
                    onSeleccionar={manejarSeleccionMenu}
                    onCerrar={() => setMenuContextual(prev => ({...prev, visible: false}))}
                />
            )}
        </div>
    );
}

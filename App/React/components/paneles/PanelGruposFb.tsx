/* [253A-11] PanelGruposFb
 * Panel de dashboard para gestionar grupos de Facebook detectados por la extensión.
 * Muestra tabla sortable con filtros, categorías, importancia, acciones. */

import {useState, useCallback} from 'react';
import {RefreshCw, ExternalLink, EyeOff, Eye, Trash2, Check, Users} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {MenuContextual} from '../shared';
import {Boton, Input, Select, Checkbox} from '../ui';
import type {OpcionSelect} from '../ui/Select';
import {usePanelGruposFb} from '../../hooks/paneles/usePanelGruposFb';
import type {GrupoFb} from '../../stores/gruposFbStore';
import '../../styles/dashboard/componentes/panelGruposFb.css';

interface PanelGruposFbProps {
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
}

export function PanelGruposFb({renderHandleArrastre, handleMinimizar}: PanelGruposFbProps): JSX.Element {
    const {
        grupos, categorias, estadisticas, cargando, inicializado, error,
        filtros, setFiltro, toggleOculto, cambiarCategoria,
        cambiarImportancia, publicar, eliminar, recargar
    } = usePanelGruposFb();

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

    return (
        <div className="panelDashboard internaColumna">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Grupos FB')}
                subtitulo={estadisticas ? `${estadisticas.total} grupos` : undefined}
                variante="panelHeader"
                acciones={
                    <>
                        <Boton variante="badge" soloIcono onClick={recargar} icono={<RefreshCw size={12} />} title="Recargar" />
                        {handleMinimizar}
                    </>
                }
            />

            <div className="panelGruposFb">
                {/* Estadísticas compactas */}
                {estadisticas && (
                    <div className="panelGruposFb__stats">
                        <span className="panelGruposFb__stat">
                            <span className="panelGruposFb__statValor">{estadisticas.visibles}</span> visibles
                        </span>
                        <span className="panelGruposFb__stat">
                            <span className="panelGruposFb__statValor">{estadisticas.ocultos}</span> ocultos
                        </span>
                        <span className="panelGruposFb__stat">
                            <span className="panelGruposFb__statValor">{estadisticas.publicadosHoy}</span> publicados hoy
                        </span>
                    </div>
                )}

                {/* Filtros */}
                <div className="panelGruposFb__filtros">
                    <Input
                        tipo="search"
                        claseAdicional="panelGruposFb__inputBusqueda"
                        placeholder="Buscar grupo..."
                        value={filtros.busqueda}
                        onChange={e => setFiltro('busqueda', e.target.value)}
                    />
                    <Select
                        claseAdicional="panelGruposFb__selectFiltro"
                        value={filtros.categoria}
                        onChange={e => setFiltro('categoria', e.target.value)}
                        placeholder="Todas las categorías"
                        opciones={categorias.map(c => ({valor: c.nombre, etiqueta: `${c.icono} ${c.nombre}`}))}
                    />
                    <Select
                        claseAdicional="panelGruposFb__selectFiltro"
                        value={filtros.importancia}
                        onChange={e => setFiltro('importancia', e.target.value)}
                        placeholder="Importancia"
                        opciones={[5, 4, 3, 2, 1].map(n => ({valor: String(n), etiqueta: '★'.repeat(n)}))}
                    />
                    <Checkbox
                        etiqueta="Ocultos"
                        claseContenedor="panelGruposFb__toggleOcultos"
                        checked={filtros.mostrarOcultos}
                        onChange={e => setFiltro('mostrarOcultos', e.target.checked)}
                    />
                </div>

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

                {inicializado && !error && grupos.length === 0 && (
                    <div className="panelGruposFb__vacio">
                        <Users size={24} />
                        <p>No hay grupos detectados</p>
                        <p>Instala la extensión FB Group Manager y navega por Facebook para detectar grupos.</p>
                    </div>
                )}

                {grupos.length > 0 && (
                    <div className="panelGruposFb__tablaContenedor">
                        <table className="panelGruposFb__tabla">
                            <thead>
                                <tr>
                                    <th className="panelGruposFb__colCheck">✓</th>
                                    <th>Grupo</th>
                                    <th className="panelGruposFb__colCategoria">Categoría</th>
                                    <th className="panelGruposFb__colImportancia">Importancia</th>
                                    <th>Miembros</th>
                                    <th className="panelGruposFb__colAcciones" />
                                </tr>
                            </thead>
                            <tbody>
                                {grupos.map(grupo => (
                                    <FilaGrupo
                                        key={grupo.id}
                                        grupo={grupo}
                                        categorias={categorias}
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

/* ── Componente fila de grupo (separado para evitar re-renders innecesarios) ── */

interface FilaGrupoProps {
    grupo: GrupoFb;
    categorias: {nombre: string; icono: string; color: string}[];
    onPublicar: () => void;
    onCambiarCategoria: (cat: string | null) => void;
    onCambiarImportancia: (imp: number) => void;
    onMenuContextual: (e: React.MouseEvent) => void;
}

function FilaGrupo({grupo, categorias, onPublicar, onCambiarCategoria, onCambiarImportancia, onMenuContextual}: FilaGrupoProps): JSX.Element {
    const [menuCat, setMenuCat] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});
    const hoyPublicado = grupo.ultimaPublicacion && esFechaHoy(grupo.ultimaPublicacion);

    return (
        <tr className={grupo.oculto ? 'panelGruposFb__filaOculta' : ''} onContextMenu={onMenuContextual}>
            {/* Check publicado */}
            <td className="panelGruposFb__colCheck">
                <Boton
                    variante="badge"
                    soloIcono
                    claseAdicional={`panelGruposFb__checkPublicado ${hoyPublicado ? 'panelGruposFb__checkPublicado--activo' : ''}`}
                    onClick={onPublicar}
                    title={hoyPublicado ? 'Publicado hoy' : 'Marcar como publicado'}
                    icono={hoyPublicado ? <Check size={10} color="#fff" /> : undefined}
                />
            </td>

            {/* Nombre + avatar */}
            <td>
                <div className="panelGruposFb__celdaNombre">
                    {grupo.imagenUrl ? (
                        <img className="panelGruposFb__avatar" src={grupo.imagenUrl} alt="" loading="lazy" />
                    ) : (
                        <div className="panelGruposFb__avatarPlaceholder">
                            <Users size={14} />
                        </div>
                    )}
                    <span className="panelGruposFb__nombreTexto">
                        <a href={grupo.url} target="_blank" rel="noopener noreferrer">{grupo.nombre}</a>
                    </span>
                </div>
            </td>

            {/* Categoría */}
            <td className="panelGruposFb__colCategoria">
                <span
                    className="panelGruposFb__badgeCategoria"
                    onClick={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setMenuCat({visible: true, x: rect.left, y: rect.bottom + 2});
                    }}
                >
                    {grupo.categoria ? (
                        <>
                            {categorias.find(c => c.nombre === grupo.categoria)?.icono || '📁'}
                            {' '}{grupo.categoria}
                        </>
                    ) : (
                        'Sin categoría'
                    )}
                </span>
                {menuCat.visible && (
                    <MenuContextual
                        opciones={[
                            {id: '__ninguna', etiqueta: 'Sin categoría'},
                            ...categorias.map(c => ({id: c.nombre, etiqueta: `${c.icono} ${c.nombre}`}))
                        ]}
                        posicionX={menuCat.x}
                        posicionY={menuCat.y}
                        onSeleccionar={(id) => {
                            setMenuCat(prev => ({...prev, visible: false}));
                            onCambiarCategoria(id === '__ninguna' ? null : id);
                        }}
                        onCerrar={() => setMenuCat(prev => ({...prev, visible: false}))}
                    />
                )}
            </td>

            {/* Importancia (estrellas clickables) */}
            <td className="panelGruposFb__colImportancia">
                <div className="panelGruposFb__estrellas">
                    {[1, 2, 3, 4, 5].map(n => (
                        <span
                            key={n}
                            className={`panelGruposFb__estrella ${n <= grupo.importancia ? 'panelGruposFb__estrella--activa' : ''}`}
                            onClick={() => onCambiarImportancia(n === grupo.importancia ? 0 : n)}
                        >
                            ★
                        </span>
                    ))}
                </div>
            </td>

            {/* Miembros */}
            <td>{grupo.cantidadMiembros || '—'}</td>

            {/* Acciones hover */}
            <td className="panelGruposFb__colAcciones">
                <div className="panelGruposFb__acciones">
                    <Boton variante="badge" soloIcono onClick={() => window.open(grupo.url, '_blank', 'noopener')} icono={<ExternalLink size={11} />} title="Ir al grupo" />
                    <Boton variante="badge" soloIcono onClick={onMenuContextual as unknown as () => void} icono={<EyeOff size={11} />} title="Más acciones" />
                </div>
            </td>
        </tr>
    );
}

/* Utilidad: verificar si una fecha es hoy */
function esFechaHoy(fecha: string): boolean {
    if (!fecha) return false;
    const hoy = new Date();
    const d = new Date(fecha);
    return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

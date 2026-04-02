/* [263A-6] FilaGrupo
 * Componente fila de tabla para PanelGruposFb.
 * Extraído para mantener PanelGruposFb bajo el límite de 300 líneas.
 * Contiene su propio mini-menú de categoría y lógica de estrellas. */

import {useState} from 'react';
import {Check, Users, ExternalLink, EyeOff, Star, FolderOpen} from 'lucide-react';
import {MenuContextual} from '../shared';
import {Boton} from '../ui';
import type {GrupoFb} from '../../stores/gruposFbStore';

interface FilaGrupoProps {
    grupo: GrupoFb;
    categorias: {nombre: string; icono: string; color: string}[];
    onPublicar: () => void;
    onCambiarCategoria: (cat: string | null) => void;
    onCambiarImportancia: (imp: number) => void;
    onMenuContextual: (e: React.MouseEvent) => void;
}

export function FilaGrupo({grupo, categorias, onPublicar, onCambiarCategoria, onCambiarImportancia, onMenuContextual}: FilaGrupoProps): JSX.Element {
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
                            {categorias.find(c => c.nombre === grupo.categoria)?.icono || <FolderOpen size={12} />}
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
                        <Star
                            key={n}
                            size={11}
                            className={`panelGruposFb__estrella ${n <= grupo.importancia ? 'panelGruposFb__estrella--activa' : ''}`}
                            fill={n <= grupo.importancia ? 'currentColor' : 'none'}
                            onClick={() => onCambiarImportancia(n === grupo.importancia ? 0 : n)}
                        />
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

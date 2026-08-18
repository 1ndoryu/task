/* [024A-17] FilaGrupo
 * Componente fila de tabla para PanelGruposFb.
 * Renderiza columnas condicionalmente según la config de visibilidad.
 * Cada dato (tipo, miembros, pub/día) es su propia columna. */

import {useState, memo} from 'react';
import {Check, Users, ExternalLink, EyeOff, Star, FolderOpen, icons} from 'lucide-react';
import {MenuContextual} from '../shared';
import {Boton} from '../ui';
import type {GrupoFb} from '../../stores/gruposFbStore';
import {esPublicadoReciente} from '../../stores/gruposFbStore';
import type {ColumnId} from '../../hooks/paneles/useColumnasGruposFb';

/* [034A-13] Renderiza icono de categoría como SVG de lucide */
function iconoCategoriaSvg(nombre: string, size = 12): JSX.Element {
    const pascalName = nombre.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    const LucideIcon = icons[pascalName as keyof typeof icons];
    if (!LucideIcon) return <FolderOpen size={size} />;
    return <LucideIcon size={size} />;
}

interface FilaGrupoProps {
    grupo: GrupoFb;
    categorias: {nombre: string; icono: string; color: string}[];
    columnasVisibles: Record<ColumnId, boolean>;
    onPublicar: () => void;
    onCambiarCategoria: (cat: string | null) => void;
    onCambiarImportancia: (imp: number) => void;
    onMenuContextual: (e: React.MouseEvent) => void;
}

/* [024A-18] React.memo: evita re-render si los props no cambiaron.
 * Crítico para 600+ grupos donde cada re-render del padre dispararía 600 renders hijos. */
export const FilaGrupo = memo(function FilaGrupo({grupo, categorias, columnasVisibles, onPublicar, onCambiarCategoria, onCambiarImportancia, onMenuContextual}: FilaGrupoProps): JSX.Element {
    const [menuCat, setMenuCat] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});
    /* [034A-2] Usar ventana de 24h en vez de solo "hoy" para determinar si está publicado */
    const hoyPublicado = esPublicadoReciente(grupo.ultimaPublicacion);
    const v = columnasVisibles;

    return (
        <tr className={grupo.oculto ? 'panelGruposFb__filaOculta' : ''} onContextMenu={onMenuContextual}>
            {/* Check publicado */}
            {v.check && (
                <td className="panelGruposFb__colCheck">
                    <Boton
                        variante="badge"
                        soloIcono
                        claseAdicional={`panelGruposFb__checkPublicado ${hoyPublicado ? 'panelGruposFb__checkPublicado--activo' : ''}`}
                        onClick={onPublicar}
                        title={hoyPublicado ? 'Desmarcar publicado' : 'Marcar como publicado'}
                        icono={hoyPublicado ? <Check size={10} color="#fff" /> : undefined}
                    />
                </td>
            )}

            {/* Imagen */}
            {v.imagen && (
                <td className="panelGruposFb__colImagen">
                    {grupo.imagenUrl ? (
                        /* [024A-22] referrerPolicy="no-referrer" evita que Facebook CDN
                         * rechace la petición con 403 por hotlinking (Referer != facebook.com) */
                        <img className="panelGruposFb__avatar" src={grupo.imagenUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="panelGruposFb__avatarPlaceholder">
                            <Users size={14} />
                        </div>
                    )}
                </td>
            )}

            {/* Nombre */}
            {v.nombre && (
                <td>
                    <span className="panelGruposFb__nombreTexto" title={grupo.nombre}>
                        <a href={grupo.url} target="_blank" rel="noopener noreferrer">{grupo.nombre}</a>
                    </span>
                </td>
            )}

            {/* Tipo */}
            {v.tipo && (
                <td className="panelGruposFb__colTipo" title={grupo.tipo === 'public' ? 'Grupo público' : grupo.tipo === 'private' ? 'Grupo privado' : 'Tipo desconocido'}>
                    {grupo.tipo === 'public' ? 'Público' : grupo.tipo === 'private' ? 'Privado' : '—'}
                </td>
            )}

            {/* Miembros
              * [024A-24] Limpiar "Público"/"Privado" que a veces queda en cantidadMiembros
              * por el scraping de la extensión (discover page con separador · en vez de •). */}
            {v.miembros && (
                <td title={grupo.cantidadMiembros || undefined}>{limpiarMiembros(grupo.cantidadMiembros) || '—'}</td>
            )}

            {/* Publicaciones/día — viene de datos_extra.postsPerDay */}
            {v.publicaciones && (
                <td className="panelGruposFb__colPub">
                    {(grupo.datosExtra?.postsPerDay as string) || '—'}
                </td>
            )}

            {/* Categoría */}
            {v.categoria && (
                <td className="panelGruposFb__colCategoria">
                    <span
                        className="panelGruposFb__badgeCategoria"
                        title={grupo.categoria ? `Categoría: ${grupo.categoria} (click para cambiar)` : 'Click para asignar categoría'}
                        onClick={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setMenuCat({visible: true, x: rect.left, y: rect.bottom + 2});
                        }}
                    >
                        {grupo.categoria ? (
                            <>
                                {iconoCategoriaSvg(categorias.find(c => c.nombre === grupo.categoria)?.icono || 'folder-open')}
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
                                ...categorias.map(c => ({id: c.nombre, etiqueta: c.nombre, icono: iconoCategoriaSvg(c.icono)}))
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
            )}

            {/* Importancia (estrellas clickables) */}
            {v.importancia && (
                <td className="panelGruposFb__colImportancia" title={`Importancia: ${grupo.importancia}/5`}>
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
            )}

            {/* Acciones hover */}
            {v.acciones && (
                <td className="panelGruposFb__colAcciones">
                    <div className="panelGruposFb__acciones">
                        <Boton variante="badge" soloIcono onClick={() => window.open(grupo.url, '_blank', 'noopener')} icono={<ExternalLink size={11} />} title="Ir al grupo" />
                        <Boton variante="badge" soloIcono onClick={onMenuContextual as unknown as () => void} icono={<EyeOff size={11} />} title="Más acciones" />
                    </div>
                </td>
            )}
        </tr>
    );
});

/* [024A-24] Limpiar texto de "Público"/"Privado" que a veces queda pegado en cantidadMiembros.
 * Solo mantiene la parte que contiene dígitos + "miembros"/"members". */
function limpiarMiembros(raw: string): string {
    if (!raw) return '';
    if (/^\d/.test(raw.trim())) return raw.trim();
    const partes = raw.split(/[•·,]/);
    for (const parte of partes) {
        const t = parte.trim();
        if (/\d/.test(t) && (/miembro/i.test(t) || /member/i.test(t))) return t;
    }
    return raw.replace(/^(Público|Privado|Public|Private)\s*[·•]?\s*/i, '').trim();
}

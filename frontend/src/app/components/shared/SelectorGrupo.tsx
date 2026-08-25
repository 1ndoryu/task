/*
 * SelectorGrupo
 * Selector de grupo de ejecucion
 * Variante "pill" para formularios (igual que SelectorEstadoPill / SelectorProyectoPill)
 * Variante "badge" para headers de panel (igual que SelectorBadge)
 */

import {useState, useRef, useCallback} from 'react';
import {FolderOpen, Plus, Folder, Pencil, Trash2, Check, X} from 'lucide-react';
import {createPortal} from 'react-dom';
import type {Ref} from 'react';
import {Boton} from '../ui';
import {MenuContextual, type OpcionMenu} from './MenuContextual';
import {useSelectorBadge} from '../../hooks/shared/useSelectorBadge';
import {useGruposEjecucionStore, NOMBRE_GRUPO_DEFECTO} from '../../stores/gruposEjecucionStore';

/* [19-08-2026] Fila única para crear un grupo dentro del menú. Antes había dos
 * variantes duplicadas (selectorGrupoCrear y selectorGrupoCrearPill) con estilos
 * ligeramente distintos; ahora ambas variantes del selector usan exactamente la
 * misma fila, sin bordes ni márgenes innecesarios (ver selectorGrupo.css). */
interface FilaCrearGrupoProps {
    nuevoGrupo: string;
    onNuevoGrupoChange: (valor: string) => void;
    inputRef: Ref<HTMLInputElement>;
    onCrear: (cerrarMenuLocal: () => void) => void;
    onCerrar: () => void;
}

function FilaCrearGrupo({nuevoGrupo, onNuevoGrupoChange, inputRef, onCrear, onCerrar}: FilaCrearGrupoProps): JSX.Element {
    return (
        <div className="selectorGrupoCrear">
            <input
                ref={inputRef}
                type="text"
                value={nuevoGrupo}
                onChange={e => onNuevoGrupoChange(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        onCrear(onCerrar);
                    }
                }}
                placeholder="Nuevo grupo"
                className="selectorGrupoInput"
            />
            <Boton type="button" variante="ghost" soloIcono onClick={() => onCrear(onCerrar)} icono={<Plus size={14} />} title="Crear grupo" />
        </div>
    );
}

interface SelectorGrupoProps {
    grupos: string[];
    grupoActual: string | null;
    onChange: (grupo: string | null) => void;
    placeholder?: string;
    titulo?: string;
    soloIcono?: boolean;
    variante?: 'pill' | 'badge';
    /* [25-08-2026] Portal del menú a body: necesario dentro de contenedores con
     * backdrop-filter (p. ej. creacionRapidaContenedor), que convierten el
     * contenedor en containing block y recortan los fixed descendientes. */
    usarPortal?: boolean;
    /* [20-08-2026] Acciones de gestión de grupos desde el menú ⋯:
     * renombrar/eliminar deben propagarse al dueño de los datos (PanelEjecucion)
     * para actualizar también tareas y hábitos que usan ese grupo. */
    onRenombrarGrupo?: (grupoViejo: string, grupoNuevo: string) => void;
    onEliminarGrupo?: (grupo: string) => void;
}

export function SelectorGrupo({
    grupos,
    grupoActual,
    onChange,
    placeholder = NOMBRE_GRUPO_DEFECTO,
    titulo = 'Grupo',
    soloIcono = false,
    variante = 'pill',
    usarPortal = false,
    onRenombrarGrupo,
    onEliminarGrupo
}: SelectorGrupoProps): JSX.Element {
    const [nuevoGrupo, setNuevoGrupo] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const registrarYNotificar = useCallback((grupo: string | null) => {
        if (grupo) {
            useGruposEjecucionStore.getState().registrarGrupo(grupo);
        }
        onChange(grupo);
    }, [onChange]);

    const crearGrupo = useCallback((cerrarMenuLocal: () => void) => {
        const nombre = nuevoGrupo.trim();
        if (nombre) {
            registrarYNotificar(nombre);
            setNuevoGrupo('');
            cerrarMenuLocal();
        }
    }, [nuevoGrupo, registrarYNotificar]);

    /* Variante PILL: igual que SelectorEstadoPill / SelectorProyectoPill */
    if (variante === 'pill') {
        const [menuAbierto, setMenuAbierto] = useState(false);
        const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});
        const botonRef = useRef<HTMLButtonElement>(null);

        const abrirMenu = () => {
            if (botonRef.current) {
                const rect = botonRef.current.getBoundingClientRect();
                setPosicionMenu({x: rect.left, y: rect.bottom + 4});
            }
            setMenuAbierto(true);
        };

        const cerrarMenu = () => setMenuAbierto(false);

        const opciones: OpcionMenu[] = [
            {id: '', etiqueta: NOMBRE_GRUPO_DEFECTO, icono: <FolderOpen size={12} />},
            ...grupos.map(g => ({id: g, etiqueta: g, icono: <Folder size={12} />}))
        ];

        const seleccionar = (id: string) => {
            registrarYNotificar(id || null);
            cerrarMenu();
        };

        return (
            <div className="propiedadesCompactas__item">
                <Boton
                    ref={botonRef}
                    type="button"
                    variante="ghost"
                    claseAdicional={`pillOpcion ${!grupoActual ? 'pillOpcion--vacio' : ''}`}
                    onClick={abrirMenu}
                    title={titulo}
                >
                    <FolderOpen size={14} />
                    <span>{grupoActual || placeholder}</span>
                </Boton>

                {menuAbierto && (() => {
                    const menu = (
                        <MenuContextual
                            opciones={opciones}
                            posicionX={posicionMenu.x}
                            posicionY={posicionMenu.y}
                            onSeleccionar={seleccionar}
                            onCerrar={cerrarMenu}
                            footer={
                                <FilaCrearGrupo nuevoGrupo={nuevoGrupo} onNuevoGrupoChange={setNuevoGrupo} inputRef={inputRef} onCrear={crearGrupo} onCerrar={cerrarMenu} />
                            }
                        />
                    );
                    return usarPortal ? createPortal(menu, document.body) : menu;
                })()}
            </div>
        );
    }

    /* Variante BADGE: reutiliza selectorBadge (headers de panel) */
    const opciones = [
        {id: '', etiqueta: NOMBRE_GRUPO_DEFECTO},
        ...grupos.map(g => ({id: g, etiqueta: g}))
    ];

    const manejarCambio = useCallback((valor: string) => {
        registrarYNotificar(valor || null);
    }, [registrarYNotificar]);

    const {menuAbierto, contenedorRef, menuRef, toggleMenu, seleccionarOpcion, cerrarMenu} = useSelectorBadge({
        opciones,
        valorActual: grupoActual || '',
        onChange: manejarCambio
    });

    /* [20-08-2026] Gestión de grupos: dos iconos directos por fila, sin menú
     * intermedio: lápiz = renombrar (input inline), papelera = eliminar. */
    const [renombrandoGrupo, setRenombrandoGrupo] = useState<string | null>(null);
    const [nuevoNombre, setNuevoNombre] = useState('');

    const confirmarRenombrar = useCallback((grupoViejo: string) => {
        const nombre = nuevoNombre.trim();
        if (nombre && nombre !== grupoViejo) {
            onRenombrarGrupo?.(grupoViejo, nombre);
        }
        setRenombrandoGrupo(null);
        setNuevoNombre('');
        cerrarMenu();
    }, [nuevoNombre, onRenombrarGrupo, cerrarMenu]);

    const confirmarEliminar = useCallback((grupo: string) => {
        onEliminarGrupo?.(grupo);
        cerrarMenu();
    }, [onEliminarGrupo, cerrarMenu]);

    const etiquetaBoton = grupoActual || placeholder;
    const icono = <FolderOpen size={12} />;

    return (
        <div ref={contenedorRef as Ref<HTMLDivElement>} className="selectorBadgeContenedor">
            <Boton
                type="button"
                variante="badge"
                soloIcono={soloIcono}
                activo={menuAbierto}
                icono={icono}
                claseAdicional={soloIcono ? 'selectorBadgeBoton--soloIcono' : 'selectorBadgeBotonCompacto'}
                onClick={toggleMenu}
                title={titulo ? `${titulo}: ${etiquetaBoton}` : etiquetaBoton}
            >
                {!soloIcono && <span>{etiquetaBoton}</span>}
            </Boton>

            {menuAbierto && createPortal(
                <div ref={menuRef as Ref<HTMLDivElement>} className="selectorBadgeMenu" role="menu">
                    <Boton type="button" variante="ghost" claseAdicional={`selectorBadgeOpcion ${grupoActual === null ? 'selectorBadgeOpcionActiva' : ''}`} onClick={() => seleccionarOpcion({id: '', etiqueta: NOMBRE_GRUPO_DEFECTO})} role="menuitem">
                        <span className="selectorBadgeOpcionTexto">{NOMBRE_GRUPO_DEFECTO}</span>
                    </Boton>

                    {grupos.map(grupo => (
                        <div key={grupo} className="selectorBadgeFilaGrupo">
                            {renombrandoGrupo === grupo ? (
                                <div className="selectorGrupoRenombrar">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={nuevoNombre}
                                        onChange={e => setNuevoNombre(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                confirmarRenombrar(grupo);
                                            }
                                            if (e.key === 'Escape') {
                                                e.stopPropagation();
                                                setRenombrandoGrupo(null);
                                                setNuevoNombre('');
                                            }
                                        }}
                                        placeholder="Nuevo nombre"
                                        className="selectorGrupoInput"
                                    />
                                    <Boton type="button" variante="ghost" soloIcono onClick={() => confirmarRenombrar(grupo)} icono={<Check size={14} />} title="Confirmar" />
                                    <Boton type="button" variante="ghost" soloIcono onClick={e => { e.stopPropagation(); setRenombrandoGrupo(null); setNuevoNombre(''); }} icono={<X size={14} />} title="Cancelar" />
                                </div>
                            ) : (
                                <>
                                    <Boton type="button" variante="ghost" claseAdicional={`selectorBadgeOpcion ${grupoActual === grupo ? 'selectorBadgeOpcionActiva' : ''}`} onClick={() => seleccionarOpcion({id: grupo, etiqueta: grupo})} role="menuitem">
                                        <span className="selectorBadgeOpcionTexto">{grupo}</span>
                                    </Boton>
                                    <div className="selectorBadgeGrupoAcciones">
                                        <Boton
                                            type="button"
                                            variante="ghost"
                                            soloIcono
                                            icono={<Pencil size={12} />}
                                            title="Renombrar"
                                            role="menuitem"
                                            /* [20-08-2026] stopPropagation: sin esto, el re-render al entrar en
                                             * modo renombrar desconecta el botón clicado del DOM y el listener de
                                             * "click fuera" de useSelectorBadge cree que fue un clic externo y
                                             * cierra el menú. */
                                            onClick={e => {
                                                e.stopPropagation();
                                                setNuevoNombre(grupo);
                                                setRenombrandoGrupo(grupo);
                                            }}
                                        />
                                        <Boton
                                            type="button"
                                            variante="ghost"
                                            soloIcono
                                            icono={<Trash2 size={12} />}
                                            title="Eliminar"
                                            role="menuitem"
                                            onClick={e => {
                                                e.stopPropagation();
                                                confirmarEliminar(grupo);
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    <FilaCrearGrupo nuevoGrupo={nuevoGrupo} onNuevoGrupoChange={setNuevoGrupo} inputRef={inputRef} onCrear={crearGrupo} onCerrar={cerrarMenu} />
                </div>,
                document.body
            )}
        </div>
    );
}

/* [034A-14] SelectorEntornos: dropdown en el header de PanelGruposFb
 * para cambiar entre entornos (vistas filtradas) de grupos.
 * Incluye opciones para crear/editar/eliminar entornos.
 * [034A-19] Logica extraida a useSelectorEntornos (usestate-excesivo). */

import { Layers, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { Boton, Input } from '../ui';
import { useSelectorEntornos } from '../../hooks/paneles/useSelectorEntornos';
import type { EntornoGrupoFb } from '../../services/gruposFbService';

interface SelectorEntornosProps {
    entornos: EntornoGrupoFb[];
    entornoActivo: EntornoGrupoFb | null;
    onActivar: (id: number | null) => void;
    onCrear: (datos: { nombre: string; color?: string }) => Promise<EntornoGrupoFb | null>;
    onEliminar: (id: number) => Promise<boolean>;
    onActualizar: (id: number, datos: Partial<EntornoGrupoFb>) => Promise<EntornoGrupoFb | null>;
}

export function SelectorEntornos({ entornos, entornoActivo, onActivar, onCrear, onEliminar, onActualizar }: SelectorEntornosProps): JSX.Element {
    const {
        menuAbierto, modoCrear, modoEditar, nombreNuevo, refMenu,
        setNombreNuevo,
        handleCrear, handleEditar, handleEliminar,
        toggleMenu, cerrarMenu, iniciarCrear, iniciarEditar,
        etiquetaActiva
    } = useSelectorEntornos({ onCrear, onEliminar, onActualizar, entornoActivo });

    return (
        <div className="selectorEntornos" ref={refMenu}>
            <Boton
                variante="ghost"
                onClick={toggleMenu}
                icono={<Layers size={12} />}
                title={`Entorno: ${etiquetaActiva}`}
                claseAdicional={entornoActivo ? 'selectorBadgeBoton--activo' : ''}
            >
                {etiquetaActiva}
            </Boton>

            {menuAbierto && (
                <div className="selectorEntornos__menu">
                    {/* Opción: Vista base (sin entorno) */}
                    <div
                        className={`selectorEntornos__opcion ${!entornoActivo ? 'selectorEntornos__opcion--activo' : ''}`}
                        onClick={() => { onActivar(null); cerrarMenu(); }}
                    >
                        <span className="selectorEntornos__indicador selectorEntornos__indicador--base" />
                        <span className="selectorEntornos__nombre">Base</span>
                        {!entornoActivo && <Check size={12} className="selectorEntornos__check" />}
                    </div>

                    {/* Entornos existentes */}
                    {entornos.map(e => (
                        <div
                            key={e.id}
                            className={`selectorEntornos__opcion ${e.id === entornoActivo?.id ? 'selectorEntornos__opcion--activo' : ''}`}
                        >
                            {modoEditar === e.id ? (
                                <div className="selectorEntornos__editar">
                                    <Input
                                        tipo="text"
                                        value={nombreNuevo}
                                        onChange={ev => setNombreNuevo(ev.target.value)}
                                        onKeyDown={ev => ev.key === 'Enter' && handleEditar(e.id)}
                                        placeholder={e.nombre}
                                        claseAdicional="selectorEntornos__inputEditar"
                                    />
                                    <Boton variante="ghost" soloIcono onClick={() => handleEditar(e.id)} icono={<Check size={10} />} title="Guardar" />
                                </div>
                            ) : (
                                <>
                                    <span
                                        className="selectorEntornos__opcionClick"
                                        onClick={() => { onActivar(e.id); cerrarMenu(); }}
                                    >
                                        <span className="selectorEntornos__indicador" style={{/* sentinel-disable inline-style-prohibido */ backgroundColor: e.color}} />
                                        <span className="selectorEntornos__nombre">{e.nombre}</span>
                                        {e.id === entornoActivo?.id && <Check size={12} className="selectorEntornos__check" />}
                                    </span>
                                    <span className="selectorEntornos__acciones">
                                        <Boton
                                            variante="ghost"
                                            soloIcono
                                            onClick={(ev) => { ev.stopPropagation(); iniciarEditar(e.id, e.nombre); }}
                                            icono={<Pencil size={10} />}
                                            title="Editar"
                                        />
                                        <Boton
                                            variante="ghost"
                                            soloIcono
                                            onClick={(ev) => { ev.stopPropagation(); handleEliminar(e.id); }}
                                            icono={<Trash2 size={10} />}
                                            title="Eliminar"
                                        />
                                    </span>
                                </>
                            )}
                        </div>
                    ))}

                    {/* Crear nuevo */}
                    {modoCrear ? (
                        <div className="selectorEntornos__crear">
                            <Input
                                tipo="text"
                                value={nombreNuevo}
                                onChange={ev => setNombreNuevo(ev.target.value)}
                                onKeyDown={ev => ev.key === 'Enter' && handleCrear()}
                                placeholder="Nombre del entorno..."
                                claseAdicional="selectorEntornos__inputCrear"
                            />
                            <Boton variante="ghost" soloIcono onClick={handleCrear} icono={<Check size={10} />} title="Crear" />
                        </div>
                    ) : (
                        <div className="selectorEntornos__opcion selectorEntornos__opcion--crear" onClick={iniciarCrear}>
                            <Plus size={12} />
                            <span>Nuevo entorno</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

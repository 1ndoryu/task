/*
 * FormularioHabito
 * Formulario para crear/editar un habito
 * Responsabilidad unica: capturar datos del habito con validacion
 * Lógica delegada a useFormularioHabito.
 */

import {Plus, Tag} from 'lucide-react';
import type {NivelImportancia, DatosNuevoHabito} from '../../types/dashboard';
import {NIVELES_IMPORTANCIA, decoracionSelectorImportancia} from '../../utils/nivelesConfig';
import {SelectorFrecuencia} from './SelectorFrecuencia';
import {AccionesFormulario, SeccionPanel, SelectorNivel} from '../shared';
import {Boton, Input} from '../ui';
import {useFormularioHabito} from '../../hooks/dashboard/useFormularioHabito';

interface FormularioHabitoProps {
    onGuardar: (datos: DatosNuevoHabito) => void;
    onCancelar: () => void;
    onEliminar?: () => void;
    datosIniciales?: DatosNuevoHabito;
    guardando?: boolean;
    modoEdicion?: boolean;
}

/* [233A-45] Importancias y decoracion centralizados en nivelesConfig */

export function FormularioHabito({onGuardar, onCancelar, onEliminar, datosIniciales, guardando = false, modoEdicion = false}: FormularioHabitoProps): JSX.Element {
    /* Toda la lógica delegada al hook dedicado */
    const {
        nombre, setNombre,
        importancia, setImportancia,
        tags,
        frecuencia, setFrecuencia,
        nuevoTag, setNuevoTag,
        errores,
        manejarSubmit,
        agregarTag,
        manejarTeclaTag,
        eliminarTag
    } = useFormularioHabito({onGuardar, datosIniciales, guardando});

    return (
        <form id="formulario-habito" className="formularioHabito" onSubmit={manejarSubmit}>
            {/* Campo Nombre */}
            <SeccionPanel titulo="Nombre del habito">
                <Input id="habito-nombre" tipo="text" claseAdicional={`formularioInput ${errores.nombre ? 'formularioInputError' : ''}`} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Leer 30 minutos" autoFocus disabled={guardando} />
                {errores.nombre && <span className="formularioMensajeError">{errores.nombre}</span>}
            </SeccionPanel>

            {/* Campo Importancia */}
            <SeccionPanel titulo="Importancia">
                <SelectorNivel<NivelImportancia> niveles={NIVELES_IMPORTANCIA} seleccionado={importancia} onSeleccionar={setImportancia} disabled={guardando} decoracion={decoracionSelectorImportancia()} />
            </SeccionPanel>

            {/* Campo Frecuencia */}
            <div className="formularioCampo">
                <SelectorFrecuencia frecuencia={frecuencia} onChange={setFrecuencia} deshabilitado={guardando} />
            </div>

            {/* Campo Tags */}
            <div className="formularioCampo">
                <label htmlFor="habito-tags" className="formularioEtiqueta">
                    Tags <span className="formularioEtiquetaOpcional">(opcional, max 5)</span>
                </label>
                <div className="formularioTagsInput">
                    <Tag size={12} className="formularioTagsIcono" />
                    <Input id="habito-tags" tipo="text" claseAdicional="formularioInputTag" value={nuevoTag} onChange={e => setNuevoTag(e.target.value)} onKeyDown={manejarTeclaTag} placeholder="Escribe y presiona Enter" disabled={guardando || tags.length >= 5} />
                    <Boton
                        variante="icono"
                        onClick={agregarTag}
                        disabled={guardando || !nuevoTag.trim() || tags.length >= 5}
                        icono={<Plus size={12} />}
                    />
                </div>
                {tags.length > 0 && (
                    <div className="formularioTagsLista">
                        {tags.map(tag => (
                            <span key={tag} className="formularioTag">
                                #{tag}
                                <Boton
                                    variante="icono"
                                    onClick={() => eliminarTag(tag)}
                                    disabled={guardando}
                                >
                                    x
                                </Boton>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Acciones reutilizables */}
            <AccionesFormulario onCancelar={onCancelar} textoGuardar={modoEdicion ? 'Guardar cambios' : 'Crear habito'} guardando={guardando} onEliminar={modoEdicion && onEliminar ? onEliminar : undefined} textoEliminar="Eliminar habito" />
        </form>
    );
}

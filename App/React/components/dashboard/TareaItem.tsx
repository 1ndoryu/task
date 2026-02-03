import {useCallback, type ChangeEvent} from 'react';
import {Check} from 'lucide-react';
import type {Tarea, DatosEdicionTarea} from '../../types/dashboard';
import {esTareaHabito} from '../../types/dashboard';
import {MenuContextualAdaptivo} from '../shared/MenuContextualAdaptivo';
import {BadgeGroup} from '../shared/BadgeInfo';
import {AccionesItem} from '../shared/AccionesItem';
import {TareaBadges} from './tarea-item/TareaBadges';
import {useTareaEdicion} from './tarea-item/useTareaEdicion';
import {useTareaMenu} from './tarea-item/useTareaMenu';
import {useCantidadSeleccionadas} from '../../stores/seleccionMultipleStore';

import type {TareaItemProps} from './tarea-item/types';

export function TareaItem(props: TareaItemProps): JSX.Element {
    const {tarea, onToggle, onEditar, onEliminar, esSubtarea = false, onIndent, onOutdent, onCrearNueva, onConfigurar, nombreProyecto, soloIconoProyecto = false, onMoverProyecto, onCompartir, estaCompartida = false, mensajesNoLeidos = 0, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPausarHabito, onActualizarHabito, habitoCompletadoHoy = false, habitoPausado = false, tieneSubtareas = false, modoCompacto = false, estaSeleccionada = false, onSeleccionMultiple, modoSeleccionActivo = false} = props;

    /* Detectar si es una tarea-hábito virtual */
    const esHabito = esTareaHabito(tarea);

    /* Hook de Edición */
    const {editando, textoEditado, setTextoEditado, inputRef, iniciarEdicion, guardarEdicion, manejarTecla} = useTareaEdicion({
        tarea,
        onEditar,
        onEliminar,
        onIndent,
        onOutdent,
        onCrearNueva,
        onConfigurar
    });

    /* Hook de Menú Contextual */
    const cantidadSeleccionadas = useCantidadSeleccionadas();
    const {menuContextual, manejarClickDerecho, manejarOpcionMenu, opcionesMenu, opcionesMenuHabito} = useTareaMenu({
        tarea,
        esHabito,
        onEditar,
        onEliminar,
        onConfigurar,
        onCrearNueva,
        onMoverProyecto,
        onCompartir,
        onEditarHabito,
        onEliminarHabito,
        onToggleHabito,
        onPosponerHabito,
        onPausarHabito,
        onActualizarHabito,
        habitoCompletadoHoy,
        habitoPausado,
        estaSeleccionada,
        cantidadSeleccionadas
    });

    /* Handler para clicks en el contenido de la tarea */
    const manejarClickContenido = useCallback(
        (evento: React.MouseEvent) => {
            /* 1. Si el modo de selección manual está activo (móvil) -> Seleccionar */
            if (modoSeleccionActivo && onSeleccionMultiple) {
                evento.preventDefault();
                evento.stopPropagation();
                onSeleccionMultiple(tarea, evento);
                return;
            }

            /* 2. Ctrl+Click (Windows/Linux) o Cmd+Click (Mac) = selección múltiple */
            if ((evento.ctrlKey || evento.metaKey) && onSeleccionMultiple) {
                evento.preventDefault();
                evento.stopPropagation();
                onSeleccionMultiple(tarea, evento);
                return;
            }

            /* 3. Click normal = editar/configurar */
            iniciarEdicion();
        },
        [iniciarEdicion, onSeleccionMultiple, tarea, modoSeleccionActivo]
    );

    if (editando) {
        return (
            <div className={`tareaItem tareaItemEditando ${esSubtarea ? 'tareaItemSubtarea' : ''} ${modoCompacto ? 'tareaItem--compacto' : ''}`}>
                <div className={`tareaCheckbox ${tarea.completado ? 'tareaCheckboxCompletado' : ''}`}>{tarea.completado && <Check size={8} color="white" />}</div>
                <div className="tareaContenido">
                    <input ref={inputRef} type="text" className="tareaEdicionInput" value={textoEditado} onChange={(e: ChangeEvent<HTMLInputElement>) => setTextoEditado(e.target.value)} onKeyDown={manejarTecla} onBlur={guardarEdicion} />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`tareaItem ${esSubtarea ? 'tareaItemSubtarea' : ''} ${tieneSubtareas ? 'tareaItem--conSubtareas' : ''} ${modoCompacto ? 'tareaItem--compacto' : ''} ${estaSeleccionada ? 'tareaItem--seleccionada' : ''}`} onContextMenu={manejarClickDerecho}>
                <div className={`tareaCheckbox ${tarea.completado ? 'tareaCheckboxCompletado' : ''}`} onClick={onToggle} onPointerDown={e => e.stopPropagation()}>
                    {tarea.completado && <Check size={8} color="white" />}
                </div>
                <div className="tareaContenido" onClick={manejarClickContenido}>
                    <div className="tareaTextoWrapper">
                        <p className={`tareaTexto ${tarea.completado ? 'tareaTextoCompletado' : ''} ${modoCompacto ? 'tareaTexto--compacto' : ''}`}>{tarea.texto}</p>
                        <BadgeGroup>
                            <TareaBadges tarea={tarea} nombreProyecto={nombreProyecto} soloIconoProyecto={soloIconoProyecto} estaCompartida={estaCompartida} mensajesNoLeidos={mensajesNoLeidos} onConfigurar={onConfigurar} />
                        </BadgeGroup>
                    </div>
                </div>

                <div className="tareaAccionesContenedor" onPointerDown={e => e.stopPropagation()}>
                    {!esHabito && <AccionesItem mostrarConfigurar={true} mostrarEliminar={true} onConfigurar={onConfigurar} onEliminar={onEliminar} />}
                    {esHabito && onEditarHabito && <AccionesItem mostrarConfigurar={true} mostrarEliminar={!!onEliminarHabito} onConfigurar={() => onEditarHabito((tarea as any).habitoId)} onEliminar={onEliminarHabito ? () => onEliminarHabito((tarea as any).habitoId) : undefined} />}
                </div>
            </div>

            {menuContextual.visible && !esHabito && <MenuContextualAdaptivo opciones={opcionesMenu} posicionX={menuContextual.posicion.x} posicionY={menuContextual.posicion.y} onSeleccionar={manejarOpcionMenu} onCerrar={menuContextual.cerrar} titulo={tarea.texto} />}
            {menuContextual.visible && esHabito && <MenuContextualAdaptivo opciones={opcionesMenuHabito} posicionX={menuContextual.posicion.x} posicionY={menuContextual.posicion.y} onSeleccionar={manejarOpcionMenu} onCerrar={menuContextual.cerrar} titulo={tarea.texto} />}
        </>
    );
}

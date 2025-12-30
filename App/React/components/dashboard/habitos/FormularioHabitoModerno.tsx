/*
 * FormularioHabitoModerno
 * Formulario con el nuevo diseno estilo Linear para habitos
 * Usado dentro de ModalHabito para la entrada de datos
 *
 * Fase 9.5: Layout moderno con titulo limpio, propiedades compactas
 * Reutiliza componentes de Fase 9.2 (CampoTituloLimpio, etc.)
 */

import type {NivelImportancia, FrecuenciaHabito, Habito} from '../../../types/dashboard';
import {CampoTituloLimpio, SelectorEstadoHabitoPill, SelectorImportanciaPill, SelectorFrecuenciaPill, FilaPropiedades} from '../../shared';
import type {EstadoHabito} from '../../shared';
import {MapaCalorHabito} from '../../shared/MapaCalorHabito';

interface FormularioHabitoModernoProps {
    /* Campos principales */
    nombre: string;
    onNombreChange: (valor: string) => void;
    importancia: NivelImportancia;
    onImportanciaChange: (valor: NivelImportancia) => void;
    /* Frecuencia */
    frecuencia: FrecuenciaHabito;
    onFrecuenciaChange: (frecuencia: FrecuenciaHabito) => void;
    /* Estado del dia (solo en modo edicion) */
    estadoHoy?: EstadoHabito;
    onEstadoChange?: (estado: EstadoHabito) => void;
    /* Habito original (para mapa de calor en modo edicion) */
    habito?: Habito;
    /* Modo */
    modoEdicion?: boolean;
    errorNombre?: string;
}

export function FormularioHabitoModerno({nombre, onNombreChange, importancia, onImportanciaChange, frecuencia, onFrecuenciaChange, estadoHoy, onEstadoChange, habito, modoEdicion = false, errorNombre}: FormularioHabitoModernoProps): JSX.Element {
    return (
        <div id="formulario-habito-moderno" className="formularioProyectoModerno">
            {/* Nombre del habito */}
            <CampoTituloLimpio id="habito-nombre" valor={nombre} onChange={onNombreChange} placeholder="Ej: Leer 30 minutos" error={errorNombre} autoFocus={!modoEdicion} />

            {/* Configuracion: Importancia, Estado, Frecuencia */}
            <FilaPropiedades etiqueta="Configuración">
                {/* Importancia */}
                <SelectorImportanciaPill importancia={importancia} onChange={onImportanciaChange} />

                {/* Estado del dia (Solo modo edicion) */}
                {modoEdicion && estadoHoy && onEstadoChange && <SelectorEstadoHabitoPill estado={estadoHoy} onChange={onEstadoChange} />}

                {/* Frecuencia */}
                <SelectorFrecuenciaPill frecuencia={frecuencia} onChange={onFrecuenciaChange} />
            </FilaPropiedades>

            {/* Mapa de calor - solo en modo edicion */}
            {modoEdicion && habito && habito.id > 0 && (
                <div className="formularioCampo formularioCampo--mapaCalor">
                    <label className="formularioEtiqueta">Historial de cumplimiento</label>
                    <MapaCalorHabito habitoId={habito.id} periodo="mes" enModal={true} frecuencia={habito.frecuencia} fechaCreacion={habito.fechaCreacion} />
                </div>
            )}
        </div>
    );
}

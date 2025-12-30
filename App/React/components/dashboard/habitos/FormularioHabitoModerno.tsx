/*
 * FormularioHabitoModerno
 * Formulario con el nuevo diseno estilo Linear para habitos
 * Usado dentro de ModalHabito para la entrada de datos
 *
 * Fase 9.5: Layout moderno con titulo limpio, propiedades compactas
 * Reutiliza componentes de Fase 9.2 (CampoTituloLimpio, etc.)
 */

import type {NivelImportancia, FrecuenciaHabito, Habito} from '../../../types/dashboard';
import {CampoTituloLimpio, CampoSubtituloLimpio, SelectorIconoProyecto, SelectorEstadoHabitoPill, SelectorImportanciaPill, SelectorFrecuenciaPill} from '../../shared';
import type {EstadoHabito} from '../../shared';
import {MapaCalorHabito} from '../../shared/MapaCalorHabito';

interface FormularioHabitoModernoProps {
    /* Campos principales */
    nombre: string;
    onNombreChange: (valor: string) => void;
    /* Nuevos campos esteticos */
    descripcion?: string;
    onDescripcionChange?: (valor: string) => void;
    icono?: string;
    colorIcono?: string;
    onIconoChange?: (icono: string, color: string) => void;
    /* Propiedades */
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

export function FormularioHabitoModerno({nombre, onNombreChange, descripcion, onDescripcionChange, icono, colorIcono, onIconoChange, importancia, onImportanciaChange, frecuencia, onFrecuenciaChange, estadoHoy, onEstadoChange, habito, modoEdicion = false, errorNombre}: FormularioHabitoModernoProps): JSX.Element {
    return (
        <div id="formulario-habito-moderno" className="formularioProyectoModerno">
            {/* Icono del habito */}
            {onIconoChange && (
                <div style={{marginBottom: 'var(--dashboard-espacioXs)'}}>
                    <SelectorIconoProyecto iconoId={icono || 'check-circle'} colorIcono={colorIcono || '#888888'} onCambio={onIconoChange} />
                </div>
            )}

            {/* Nombre del habito */}
            <CampoTituloLimpio id="habito-nombre" valor={nombre} onChange={onNombreChange} placeholder="Ej: Leer 30 minutos" error={errorNombre} autoFocus={!modoEdicion} />

            {/* Descripcion (Subtitulo) */}
            {onDescripcionChange && <CampoSubtituloLimpio id="habito-descripcion" valor={descripcion || ''} onChange={onDescripcionChange} placeholder="Añade una descripción..." />}

            {/* Configuracion: Separada por etiquetas */}

            {/* Importancia */}
            <div className="propiedadesCompactas">
                <span className="propiedadesCompactas__etiqueta">Importancia</span>
                <div className="propiedadesCompactas__contenido">
                    <div className="propiedadesCompactas__item">
                        <SelectorImportanciaPill importancia={importancia} onChange={onImportanciaChange} />
                    </div>
                </div>
            </div>

            {/* Estado (solo modo edicion) */}
            {modoEdicion && estadoHoy && onEstadoChange && (
                <div className="propiedadesCompactas">
                    <span className="propiedadesCompactas__etiqueta">Estado</span>
                    <div className="propiedadesCompactas__contenido">
                        <div className="propiedadesCompactas__item">
                            <SelectorEstadoHabitoPill estado={estadoHoy} onChange={onEstadoChange} />
                        </div>
                    </div>
                </div>
            )}

            {/* Frecuencia */}
            <div className="propiedadesCompactas">
                <span className="propiedadesCompactas__etiqueta">Frecuencia</span>
                <div className="propiedadesCompactas__contenido">
                    <div className="propiedadesCompactas__item">
                        <SelectorFrecuenciaPill frecuencia={frecuencia} onChange={onFrecuenciaChange} />
                    </div>
                </div>
            </div>

            {/* Mapa de calor - solo en modo edicion */}
            {modoEdicion && habito && habito.id > 0 && (
                <>
                    {/* Separator visual antes del historial - Estilo dashed igual a Proyectos */}
                    <div style={{borderTop: '1px dashed var(--dashboard-bordeSutil)', margin: 'var(--dashboard-espacioMd) 0 var(--dashboard-espacioXs) 0'}} />

                    <div className="formularioCampo formularioCampo--mapaCalor" style={{marginTop: 0}}>
                        <label className="" style={{marginBottom: '10px', display: 'block', color: 'var(--dashboard-textoApagado)', fontSize: 'var(--dashboard-tamanoPequeno)', fontWeight: 'normal'}}>
                            Historial de cumplimiento
                        </label>
                        <MapaCalorHabito habitoId={habito.id} periodo="mes" enModal={true} frecuencia={habito.frecuencia} fechaCreacion={habito.fechaCreacion} />
                    </div>
                </>
            )}
        </div>
    );
}

/*
 * ModalConfiguracionHabitos
 * Modal para ajustar preferencias de visualización del panel de hábitos
 * [318A-3] Toggles migrados al sistema centralizado (FormularioConfiguracion);
 * los grids custom (Tolerancia/Columnas) se mantienen — son selectores
 * visuales propios, no campos de formulario. Visual-neutral.
 */

import {Modal} from '../shared/Modal';
import {FormularioConfiguracion} from '../shared/FormularioConfiguracion';
import type {CampoEspecificacion} from '../shared/CampoEspecificacion';
import {ToggleSwitch} from '../shared/ToggleSwitch';
import {Boton} from '../ui';
import type {ConfiguracionHabitos, ColumnasHabitos, ToleranciaPreset} from '../../hooks/useConfiguracionHabitos';

interface ModalConfiguracionHabitosProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    configuracion: ConfiguracionHabitos;
    esMovil?: boolean;
    onToggleCompletadosHoy: () => void;
    onToggleModoCompacto: () => void;
    onToggleMostrarPausados: () => void;
    onToggleColumna: (columna: keyof ColumnasHabitos) => void;
    onCambiarTolerancia: (preset: ToleranciaPreset) => void;
}

interface InfoPreset {
    etiqueta: string;
    descripcion: string;
}

const PRESETS_INFO: Record<Exclude<ToleranciaPreset, 'personalizado'>, InfoPreset> = {
    muyEstricto: {
        etiqueta: 'Muy Estricto',
        descripcion: '1 día = urgente, 2+ días = bloqueante'
    },
    estricto: {
        etiqueta: 'Estricto',
        descripcion: '2 días = urgente, 4+ días = bloqueante'
    },
    moderado: {
        etiqueta: 'Moderado',
        descripcion: '3 días = urgente, 5+ días = bloqueante'
    },
    relajado: {
        etiqueta: 'Relajado',
        descripcion: '1 semana = urgente, 2+ semanas = bloqueante'
    }
};

export function ModalConfiguracionHabitos({estaAbierto, onCerrar, configuracion, esMovil = false, onToggleCompletadosHoy, onToggleModoCompacto, onToggleMostrarPausados, onToggleColumna, onCambiarTolerancia}: ModalConfiguracionHabitosProps): JSX.Element {
    interface InfoColumna {
        etiqueta: string;
        descripcion: string;
    }

    /* En móvil solo mostramos columnas que tienen sentido para ese contexto */
    const columnasRelevantesMovil: Array<keyof ColumnasHabitos> = ['indice', 'historial', 'importancia'];

    const infoColumnas: Record<keyof ColumnasHabitos, InfoColumna> = {
        indice: {
            etiqueta: 'Indice (#)',
            descripcion: 'Muestra el checkbox para completar'
        },
        nombre: {
            etiqueta: 'Nombre',
            descripcion: 'El nombre del habito (fijo)'
        },
        historial: {
            etiqueta: 'Actividad (5 dias)',
            descripcion: 'Historial visual reciente, click para marcar'
        },
        racha: {
            etiqueta: 'Racha',
            descripcion: 'Contador de dias seguidos'
        },
        frecuencia: {
            etiqueta: 'Frecuencia',
            descripcion: 'Muestra si es diario, semanal...'
        },
        importancia: {
            etiqueta: 'Importancia',
            descripcion: 'Badge de prioridad Alta/Media/Baja'
        },
        tocaHoy: {
            etiqueta: 'Toca Hoy',
            descripcion: 'Indicador visual amarillo'
        },
        acciones: {
            etiqueta: 'Acciones',
            descripcion: 'Botones rapidos al pasar el mouse'
        },
        urgencia: {
            etiqueta: 'Urgencia',
            descripcion: 'Barra de progreso visual'
        },
        inactividad: {
            etiqueta: 'Inactividad',
            descripcion: 'Dias sin realizar el habito'
        }
    };

    /* Filtrar columnas según dispositivo */
    const columnasAMostrar = esMovil ? (Object.keys(configuracion.columnasVisibles) as Array<keyof ColumnasHabitos>).filter(col => columnasRelevantesMovil.includes(col)) : (Object.keys(configuracion.columnasVisibles) as Array<keyof ColumnasHabitos>);

    const campos: CampoEspecificacion<ConfiguracionHabitos>[] = [
        {
            clave: 'ocultarCompletadosHoy',
            titulo: 'Ocultar habitos completados hoy',
            descripcion: 'Los habitos ya realizados desapareceran de la lista hasta manana',
            tipo: 'toggle',
            alCambiar: () => onToggleCompletadosHoy()
        },
        /* [014A-13] Modo compacto siempre activo en móvil — ocultar toggle */
        {
            clave: 'modoCompacto',
            titulo: 'Modo Compacto',
            descripcion: 'Reducir el espaciado vertical de las filas',
            tipo: 'toggle',
            cuando: () => !esMovil,
            alCambiar: () => onToggleModoCompacto()
        },
        {
            clave: 'mostrarPausados',
            titulo: 'Mostrar habitos pausados',
            descripcion: 'Incluye una seccion separada con los habitos en pausa',
            tipo: 'toggle',
            alCambiar: () => onToggleMostrarPausados()
        }
    ];

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuracion de Habitos">
            <div className="contenedorOpcionesConfig">
                <FormularioConfiguracion
                    campos={campos}
                    valores={configuracion}
                    alCambiar={() => {
                        /* La persistencia la manejan los alCambiar de cada campo. */
                    }}
                />

                {/* Seccion: Tolerancia de Urgencia - Solo en desktop (no relevante en móvil) */}
                {!esMovil && (
                    <>
                        <div className="separadorOpcionesConfig" />
                        <div className="seccionConfiguracion">
                            <h4 className="tituloSeccionConfig">Tolerancia de Urgencia</h4>
                            <span className="descripcionSeccionConfig">Define que tan estricto es el sistema al marcar habitos como urgentes por inactividad</span>
                            <div className="gridOpcionesTolerancia">
                                {(Object.keys(PRESETS_INFO) as Array<Exclude<ToleranciaPreset, 'personalizado'>>).map(preset => {
                                    const info = PRESETS_INFO[preset];
                                    const estaActivo = configuracion.toleranciaPreset === preset;

                                    return (
                                        <Boton key={preset} type="button" claseAdicional={`botonPresetTolerancia ${estaActivo ? 'botonPresetTolerancia--activo' : ''}`} onClick={() => onCambiarTolerancia(preset)}>
                                            <span className="etiquetaPreset">{info.etiqueta}</span>
                                            <span className="descripcionPreset">{info.descripcion}</span>
                                        </Boton>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Seccion: Columnas Visibles */}
                <div className="separadorOpcionesConfig" />
                <div className="seccionConfiguracion">
                    <h4 className="tituloSeccionConfig">Columnas Visibles</h4>
                    {esMovil && <span className="descripcionSeccionConfig">Columnas disponibles para móvil</span>}
                    <div className="gridOpcionesColumnas">
                        {columnasAMostrar.map(columna => {
                            if (columna === 'nombre') return null;

                            const info = infoColumnas[columna];

                            return (
                                <div key={columna} className="itemColumnaConfig">
                                    <div className="infoColumnaConfig">
                                        <span className="etiquetaColumna">{info.etiqueta}</span>
                                        <span className="descripcionColumna">{info.descripcion}</span>
                                    </div>
                                    <ToggleSwitch checked={configuracion.columnasVisibles[columna]} onChange={() => onToggleColumna(columna)} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
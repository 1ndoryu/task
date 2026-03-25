/*
 * SelectorFechaCalendario
 * [253A-9] Calendario custom para selección de fecha en tareas y proyectos.
 * Sustituye el MenuContextual con presets por un calendario visual + accesos rápidos.
 * Estilo consistente con menuContextual (position: fixed, mismas variables CSS).
 * Lógica extraída a useSelectorFechaCalendario.
 */

import {ChevronLeft, ChevronRight, Calendar, X} from 'lucide-react';
import {Boton} from '../ui';
import {useSelectorFechaCalendario} from '../../hooks/shared/useSelectorFechaCalendario';
import '../../styles/dashboard/componentes/selectorFechaCalendario.css';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface SelectorFechaCalendarioProps {
    posicionX: number;
    posicionY: number;
    onSeleccionar: (fechaISO: string) => void;
    onLimpiar?: () => void;
    onCerrar: () => void;
    fechaActual?: string;
    mostrarLimpiar?: boolean;
}

export function SelectorFechaCalendario({posicionX, posicionY, onSeleccionar, onLimpiar, onCerrar, fechaActual, mostrarLimpiar = false}: SelectorFechaCalendarioProps): JSX.Element {
    const {hoy, mesVista, celdas, contenedorRef, posicionAjustada, mesAnterior, mesSiguiente, seleccionarRapida} = useSelectorFechaCalendario({posicionX, posicionY, fechaActual, onCerrar, onSeleccionar});

    return (
        <div ref={contenedorRef} className="selectorFechaCalendario" style={{left: posicionAjustada.x, top: posicionAjustada.y}}>
            {/* Opciones rápidas */}
            <div className="selectorFechaCalendario__rapidas">
                <Boton type="button" variante="ghost" claseAdicional="selectorFechaCalendario__opcionRapida" onClick={() => seleccionarRapida('hoy')} icono={<Calendar size={12} />}>
                    Hoy
                </Boton>
                <Boton type="button" variante="ghost" claseAdicional="selectorFechaCalendario__opcionRapida" onClick={() => seleccionarRapida('manana')} icono={<Calendar size={12} />}>
                    Mañana
                </Boton>
                <Boton type="button" variante="ghost" claseAdicional="selectorFechaCalendario__opcionRapida" onClick={() => seleccionarRapida('semana')} icono={<Calendar size={12} />}>
                    En 7 días
                </Boton>
                {mostrarLimpiar && onLimpiar && (
                    <Boton type="button" variante="ghost" claseAdicional="selectorFechaCalendario__opcionRapida selectorFechaCalendario__opcionRapida--peligroso" onClick={onLimpiar} icono={<X size={12} />}>
                        Quitar fecha
                    </Boton>
                )}
            </div>

            <div className="selectorFechaCalendario__separador" />

            {/* Navegación mes */}
            <div className="selectorFechaCalendario__encabezado">
                <Boton type="button" variante="ghost" claseAdicional="selectorFechaCalendario__btnNav" onClick={mesAnterior} icono={<ChevronLeft size={14} />} soloIcono />
                <span className="selectorFechaCalendario__mesAnio">{MESES[mesVista.mes]} {mesVista.anio}</span>
                <Boton type="button" variante="ghost" claseAdicional="selectorFechaCalendario__btnNav" onClick={mesSiguiente} icono={<ChevronRight size={14} />} soloIcono />
            </div>

            {/* Días de la semana */}
            <div className="selectorFechaCalendario__diasSemana">
                {DIAS_SEMANA.map(d => (
                    <span key={d} className="selectorFechaCalendario__diaSemana">{d}</span>
                ))}
            </div>

            {/* Grid de días — botones nativos por rendimiento (28-42 celdas por mes) */}
            {/* sentinel-disable-next-line boton-nativo */}
            <div className="selectorFechaCalendario__grid">
                {celdas.map(celda => {
                    const esHoy = celda.fecha === hoy;
                    const esSeleccionado = celda.fecha === fechaActual;
                    let clase = 'selectorFechaCalendario__dia';
                    if (celda.esOtroMes) clase += ' selectorFechaCalendario__dia--otroMes';
                    if (esHoy) clase += ' selectorFechaCalendario__dia--hoy';
                    if (esSeleccionado) clase += ' selectorFechaCalendario__dia--seleccionado';

                    return (
                        <button key={celda.fecha} type="button" className={clase} onClick={() => onSeleccionar(celda.fecha)}>
                            {celda.dia}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

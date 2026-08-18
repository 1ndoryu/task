/*
 * PropiedadesCompactas
 * Grid de propiedades inline estilo Linear con menus contextuales
 * Muestra propiedades como Prioridad, Urgencia, Fecha en formato compacto
 *
 * Fase 9.2.3: Propiedades compactas (Key Properties)
 * Usa el MenuContextual existente para consistencia visual
 */

import {useState, useRef} from 'react';
import {Calendar, Flag, Zap} from 'lucide-react';
import {MenuContextual} from './MenuContextual';
import {SelectorFechaCalendario} from './SelectorFechaCalendario';
import type {NivelPrioridad, NivelUrgencia} from '../../types/dashboard';
import {Boton} from '../ui';
import {ETIQUETAS_PRIORIDAD, ETIQUETAS_URGENCIA, COLORES_PRIORIDAD, COLORES_URGENCIA, opcionesMenuPrioridad, opcionesMenuUrgencia} from '../../utils/nivelesConfig';

interface PropiedadesCompactasProps {
    prioridad: NivelPrioridad;
    onPrioridadChange: (valor: NivelPrioridad) => void;
    urgencia: NivelUrgencia | null;
    onUrgenciaChange: (valor: NivelUrgencia | null) => void;
    fechaLimite: string;
    onFechaLimiteChange: (valor: string) => void;
    mostrarEtiqueta?: boolean;
}

type MenuActivo = 'prioridad' | 'urgencia' | 'fecha' | null;

export function PropiedadesCompactas({prioridad, onPrioridadChange, urgencia, onUrgenciaChange, fechaLimite, onFechaLimiteChange, mostrarEtiqueta = true}: PropiedadesCompactasProps): JSX.Element {
    const [menuActivo, setMenuActivo] = useState<MenuActivo>(null);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});

    const prioridadRef = useRef<HTMLButtonElement>(null);
    const urgenciaRef = useRef<HTMLButtonElement>(null);
    const fechaRef = useRef<HTMLButtonElement>(null);

    const formatearFecha = (fechaISO: string): string => {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'});
    };

    const abrirMenu = (tipo: MenuActivo, ref: React.RefObject<HTMLButtonElement | null>) => {
        if (menuActivo === tipo) {
            setMenuActivo(null);
            return;
        }

        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPosicionMenu({x: rect.left, y: rect.bottom + 4});
        }
        setMenuActivo(tipo);
    };

    const cerrarMenu = () => setMenuActivo(null);

    return (
        <div className="propiedadesCompactas">
            {mostrarEtiqueta && <span className="propiedadesCompactas__etiqueta">Propiedades</span>}
            <div className="propiedadesCompactas__contenido">
                {/* Prioridad */}
                <div className="propiedadesCompactas__item">
                    <Boton ref={prioridadRef} type="button" claseAdicional={`pillOpcion${prioridad === 'media' ? ' pillOpcion--vacio' : ''}`} onClick={() => abrirMenu('prioridad', prioridadRef)} title="Prioridad" style={prioridad !== 'media' ? {color: COLORES_PRIORIDAD[prioridad]} : undefined}>
                        <Flag size={14} fill={prioridad === 'alta' || prioridad === 'muy_alta' ? COLORES_PRIORIDAD[prioridad] : 'none'} />
                        <span>{ETIQUETAS_PRIORIDAD[prioridad]}</span>
                    </Boton>
                </div>

                {/* Urgencia */}
                <div className="propiedadesCompactas__item">
                    <Boton ref={urgenciaRef} type="button" claseAdicional={`pillOpcion${!urgencia ? ' pillOpcion--vacio' : ''}`} onClick={() => abrirMenu('urgencia', urgenciaRef)} title="Urgencia" style={urgencia ? {color: COLORES_URGENCIA[urgencia]} : undefined}>
                        <Zap size={14} fill={urgencia ? COLORES_URGENCIA[urgencia] : 'none'} />
                        <span>{urgencia ? ETIQUETAS_URGENCIA[urgencia] : 'Urgencia'}</span>
                    </Boton>
                </div>

                {/* Fecha Limite */}
                <div className="propiedadesCompactas__item">
                    <Boton ref={fechaRef} type="button" claseAdicional={`pillOpcion${!fechaLimite ? ' pillOpcion--vacio' : ''}`} onClick={() => abrirMenu('fecha', fechaRef)} title="Fecha Limite">
                        <Calendar size={14} />
                        <span>{fechaLimite ? formatearFecha(fechaLimite) : 'Fecha'}</span>
                    </Boton>
                </div>
            </div>

            {/* Menu Prioridad */}
            {menuActivo === 'prioridad' && (
                <MenuContextual
                    opciones={opcionesMenuPrioridad(12)}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        onPrioridadChange(id as NivelPrioridad);
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}

            {/* Menu Urgencia */}
            {menuActivo === 'urgencia' && (
                <MenuContextual
                    opciones={opcionesMenuUrgencia(12, true)}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        onUrgenciaChange(id === 'ninguna' ? null : (id as NivelUrgencia));
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}

            {/* Menu Fecha - Calendario [253A-9] */}
            {menuActivo === 'fecha' && (
                <SelectorFechaCalendario
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    fechaActual={fechaLimite}
                    mostrarLimpiar={!!fechaLimite}
                    onSeleccionar={fechaISO => {
                        onFechaLimiteChange(fechaISO);
                        cerrarMenu();
                    }}
                    onLimpiar={() => {
                        onFechaLimiteChange('');
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}
        </div>
    );
}

export {ETIQUETAS_PRIORIDAD, ETIQUETAS_URGENCIA};

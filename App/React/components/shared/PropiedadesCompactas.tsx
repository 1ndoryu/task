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
import {obtenerFechaLocalISO} from '../../utils/fecha';
import type {NivelPrioridad, NivelUrgencia} from '../../types/dashboard';

/* Mapeo de etiquetas en espanol */
const ETIQUETAS_PRIORIDAD: Record<NivelPrioridad, string> = {
    muy_alta: 'Muy Alta',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja'
};

const ETIQUETAS_URGENCIA: Record<NivelUrgencia, string> = {
    bloqueante: 'Bloqueante',
    urgente: 'Urgente',
    normal: 'Normal',
    chill: 'Chill'
};

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

    const abrirMenu = (tipo: MenuActivo, ref: React.RefObject<HTMLButtonElement>) => {
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

    /* Opciones para cada menu */
    const opcionesPrioridad = Object.entries(ETIQUETAS_PRIORIDAD).map(([key, label]) => ({
        id: key,
        etiqueta: label,
        icono: <Flag size={12} />
    }));

    const opcionesUrgencia = [
        {id: 'ninguna', etiqueta: 'Sin urgencia', icono: <Zap size={12} />},
        ...Object.entries(ETIQUETAS_URGENCIA).map(([key, label]) => ({
            id: key,
            etiqueta: label,
            icono: <Zap size={12} />
        }))
    ];

    return (
        <div className="propiedadesCompactas">
            {mostrarEtiqueta && <span className="propiedadesCompactas__etiqueta">Propiedades</span>}
            <div className="propiedadesCompactas__contenido">
                {/* Prioridad */}
                <div className="propiedadesCompactas__item">
                    <button ref={prioridadRef} type="button" className={`pillOpcion${prioridad === 'media' ? ' pillOpcion--vacio' : ''}`} onClick={() => abrirMenu('prioridad', prioridadRef)} title="Prioridad" style={prioridad !== 'media' ? {color: prioridad === 'alta' ? 'var(--dashboard-estadoAlta)' : 'var(--dashboard-textoNormal)'} : undefined}>
                        <Flag size={14} fill={prioridad === 'alta' ? 'var(--dashboard-estadoAlta)' : 'none'} />
                        <span>{ETIQUETAS_PRIORIDAD[prioridad]}</span>
                    </button>
                </div>

                {/* Urgencia */}
                <div className="propiedadesCompactas__item">
                    <button ref={urgenciaRef} type="button" className={`pillOpcion${!urgencia ? ' pillOpcion--vacio' : ''}`} onClick={() => abrirMenu('urgencia', urgenciaRef)} title="Urgencia" style={urgencia ? {color: 'var(--dashboard-estadoMedia)'} : undefined}>
                        <Zap size={14} fill={urgencia ? 'var(--dashboard-estadoMedia)' : 'none'} />
                        <span>{urgencia ? ETIQUETAS_URGENCIA[urgencia] : 'Urgencia'}</span>
                    </button>
                </div>

                {/* Fecha Limite */}
                <div className="propiedadesCompactas__item">
                    <button ref={fechaRef} type="button" className={`pillOpcion${!fechaLimite ? ' pillOpcion--vacio' : ''}`} onClick={() => abrirMenu('fecha', fechaRef)} title="Fecha Limite">
                        <Calendar size={14} />
                        <span>{fechaLimite ? formatearFecha(fechaLimite) : 'Fecha'}</span>
                    </button>
                </div>
            </div>

            {/* Menu Prioridad */}
            {menuActivo === 'prioridad' && (
                <MenuContextual
                    opciones={opcionesPrioridad}
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
                    opciones={opcionesUrgencia}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        onUrgenciaChange(id === 'ninguna' ? null : (id as NivelUrgencia));
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}

            {/* Menu Fecha - usa opciones rapidas */}
            {menuActivo === 'fecha' && (
                <MenuContextual
                    opciones={[{id: 'hoy', etiqueta: 'Hoy', icono: <Calendar size={12} />}, {id: 'manana', etiqueta: 'Mañana', icono: <Calendar size={12} />}, {id: 'semana', etiqueta: 'En 7 días', icono: <Calendar size={12} />}, ...(fechaLimite ? [{id: 'quitar', etiqueta: 'Quitar fecha', peligroso: true}] : [])]}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        const hoy = new Date();
                        if (id === 'hoy') {
                            onFechaLimiteChange(obtenerFechaLocalISO(hoy));
                        } else if (id === 'manana') {
                            const manana = new Date(hoy);
                            manana.setDate(manana.getDate() + 1);
                            onFechaLimiteChange(obtenerFechaLocalISO(manana));
                        } else if (id === 'semana') {
                            const semana = new Date(hoy);
                            semana.setDate(semana.getDate() + 7);
                            onFechaLimiteChange(obtenerFechaLocalISO(semana));
                        } else if (id === 'quitar') {
                            onFechaLimiteChange('');
                        }
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}
        </div>
    );
}

export {ETIQUETAS_PRIORIDAD, ETIQUETAS_URGENCIA};

/*
 * PropiedadesCompactas
 * Grid de propiedades inline estilo Linear con menus contextuales
 * Muestra propiedades como Prioridad, Urgencia, Fecha en formato compacto
 *
 * Fase 9.2.3: Propiedades compactas (Key Properties)
 */

import {useState, useRef, useEffect} from 'react';
import {Calendar, Flag, Zap} from 'lucide-react';
import type {NivelPrioridad, NivelUrgencia} from '../../types/dashboard';

/* Mapeo de etiquetas en espanol */
const ETIQUETAS_PRIORIDAD: Record<NivelPrioridad, string> = {
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
}

export function PropiedadesCompactas({prioridad, onPrioridadChange, urgencia, onUrgenciaChange, fechaLimite, onFechaLimiteChange}: PropiedadesCompactasProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState<'prioridad' | 'urgencia' | 'fecha' | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    /* Cerrar menu al hacer clic fuera */
    useEffect(() => {
        const manejarClickFuera = (evento: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
                setMenuAbierto(null);
            }
        };

        if (menuAbierto) {
            document.addEventListener('mousedown', manejarClickFuera);
        }

        return () => {
            document.removeEventListener('mousedown', manejarClickFuera);
        };
    }, [menuAbierto]);

    const formatearFecha = (fechaISO: string): string => {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'});
    };

    return (
        <div className="propiedadesCompactas">
            <span className="propiedadesCompactas__etiqueta">Propiedades</span>
            <div className="propiedadesCompactas__contenido">
                {/* Prioridad */}
                <div className="propiedadesCompactas__item" ref={menuAbierto === 'prioridad' ? menuRef : null}>
                    <button type="button" className="pillOpcion" onClick={() => setMenuAbierto(menuAbierto === 'prioridad' ? null : 'prioridad')} title="Prioridad">
                        <Flag size={14} />
                        <span>{ETIQUETAS_PRIORIDAD[prioridad]}</span>
                    </button>
                    {menuAbierto === 'prioridad' && (
                        <div className="propiedadesCompactas__menu">
                            {Object.entries(ETIQUETAS_PRIORIDAD).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`propiedadesCompactas__menuOpcion ${prioridad === key ? 'propiedadesCompactas__menuOpcion--activo' : ''}`}
                                    onClick={() => {
                                        onPrioridadChange(key as NivelPrioridad);
                                        setMenuAbierto(null);
                                    }}>
                                    <Flag size={12} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Urgencia */}
                <div className="propiedadesCompactas__item" ref={menuAbierto === 'urgencia' ? menuRef : null}>
                    <button type="button" className={`pillOpcion${!urgencia ? ' pillOpcion--vacio' : ''}`} onClick={() => setMenuAbierto(menuAbierto === 'urgencia' ? null : 'urgencia')} title="Urgencia">
                        <Zap size={14} />
                        <span>{urgencia ? ETIQUETAS_URGENCIA[urgencia] : 'Urgencia'}</span>
                    </button>
                    {menuAbierto === 'urgencia' && (
                        <div className="propiedadesCompactas__menu">
                            <button
                                type="button"
                                className={`propiedadesCompactas__menuOpcion ${!urgencia ? 'propiedadesCompactas__menuOpcion--activo' : ''}`}
                                onClick={() => {
                                    onUrgenciaChange(null);
                                    setMenuAbierto(null);
                                }}>
                                <span>Sin urgencia</span>
                            </button>
                            {Object.entries(ETIQUETAS_URGENCIA).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`propiedadesCompactas__menuOpcion ${urgencia === key ? 'propiedadesCompactas__menuOpcion--activo' : ''}`}
                                    onClick={() => {
                                        onUrgenciaChange(key as NivelUrgencia);
                                        setMenuAbierto(null);
                                    }}>
                                    <Zap size={12} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fecha Limite */}
                <div className="propiedadesCompactas__item" ref={menuAbierto === 'fecha' ? menuRef : null}>
                    <button type="button" className={`pillOpcion${!fechaLimite ? ' pillOpcion--vacio' : ''}`} onClick={() => setMenuAbierto(menuAbierto === 'fecha' ? null : 'fecha')} title="Fecha Limite">
                        <Calendar size={14} />
                        <span>{fechaLimite ? formatearFecha(fechaLimite) : 'Fecha'}</span>
                    </button>
                    {menuAbierto === 'fecha' && (
                        <div className="propiedadesCompactas__menu propiedadesCompactas__menu--fecha">
                            <input
                                type="date"
                                className="propiedadesCompactas__inputFecha"
                                value={fechaLimite}
                                onChange={e => {
                                    onFechaLimiteChange(e.target.value);
                                    setMenuAbierto(null);
                                }}
                            />
                            {fechaLimite && (
                                <button
                                    type="button"
                                    className="propiedadesCompactas__menuOpcion propiedadesCompactas__menuOpcion--limpiar"
                                    onClick={() => {
                                        onFechaLimiteChange('');
                                        setMenuAbierto(null);
                                    }}>
                                    <span>Quitar fecha</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export {ETIQUETAS_PRIORIDAD, ETIQUETAS_URGENCIA};

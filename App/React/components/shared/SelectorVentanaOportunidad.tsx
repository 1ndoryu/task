/*
 * SelectorVentanaOportunidad
 * Componente para seleccionar la ventana de oportunidad de un hábito
 * Muestra un círculo minimalista tipo reloj para marcar inicio y fin
 * TAREA 4: Ventana de Oportunidad para Hábitos
 */

import {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import {Clock, X} from 'lucide-react';
import type {VentanaOportunidad} from '../../types/dashboard';

interface SelectorVentanaOportunidadProps {
    valor: VentanaOportunidad | undefined;
    onChange: (valor: VentanaOportunidad | undefined) => void;
}

/*
 * Formatea hora y minuto a string HH:MM
 */
function formatearHora(hora: number, minuto: number): string {
    return `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
}

/*
 * Calcula el ángulo en grados para una hora (0-360)
 */
function horaAAngulo(hora: number, minuto: number): number {
    const totalMinutos = hora * 60 + minuto;
    /* 360 grados = 24 horas = 1440 minutos */
    return (totalMinutos / 1440) * 360 - 90; /* -90 para que 00:00 esté arriba */
}

export function SelectorVentanaOportunidad({valor, onChange}: SelectorVentanaOportunidadProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [editando, setEditando] = useState<'inicio' | 'fin' | null>(null);

    /* Valores actuales o por defecto */
    const ventana = valor || {
        horaInicio: 8,
        minutoInicio: 0,
        horaFin: 12,
        minutoFin: 0,
        habilitada: false
    };

    /* Calcula si estamos actualmente dentro de la ventana */
    const estaEnVentana = useMemo(() => {
        if (!valor?.habilitada) return false;
        const ahora = new Date();
        const horaActual = ahora.getHours();
        const minutoActual = ahora.getMinutes();
        const totalActual = horaActual * 60 + minutoActual;
        const totalInicio = valor.horaInicio * 60 + valor.minutoInicio;
        const totalFin = valor.horaFin * 60 + valor.minutoFin;

        /* Manejar ventanas que cruzan medianoche */
        if (totalInicio <= totalFin) {
            return totalActual >= totalInicio && totalActual <= totalFin;
        } else {
            return totalActual >= totalInicio || totalActual <= totalFin;
        }
    }, [valor]);

    /* Toggle habilitado */
    const toggleHabilitado = useCallback(() => {
        if (!valor) {
            onChange({
                horaInicio: 8,
                minutoInicio: 0,
                horaFin: 12,
                minutoFin: 0,
                habilitada: true
            });
        } else {
            onChange({...valor, habilitada: !valor.habilitada});
        }
    }, [valor, onChange]);

    /* Eliminar ventana */
    const eliminarVentana = useCallback(() => {
        onChange(undefined);
        setMenuAbierto(false);
    }, [onChange]);

    /* Cambiar hora */
    const cambiarHora = useCallback(
        (tipo: 'inicio' | 'fin', hora: number, minuto: number) => {
            if (tipo === 'inicio') {
                onChange({...ventana, horaInicio: hora, minutoInicio: minuto, habilitada: true});
            } else {
                onChange({...ventana, horaFin: hora, minutoFin: minuto, habilitada: true});
            }
            setEditando(null);
        },
        [ventana, onChange]
    );

    /* Renderizar arco SVG para la ventana */
    const renderizarArco = () => {
        if (!valor?.habilitada) return null;

        const radio = 36;
        const centro = 45;
        const grosor = 8;

        const anguloInicio = horaAAngulo(valor.horaInicio, valor.minutoInicio);
        const anguloFin = horaAAngulo(valor.horaFin, valor.minutoFin);

        /* Convertir a radianes */
        const inicioRad = (anguloInicio * Math.PI) / 180;
        const finRad = (anguloFin * Math.PI) / 180;

        /* Calcular puntos del arco */
        const x1 = centro + radio * Math.cos(inicioRad);
        const y1 = centro + radio * Math.sin(inicioRad);
        const x2 = centro + radio * Math.cos(finRad);
        const y2 = centro + radio * Math.sin(finRad);

        /* Determinar si el arco es mayor a 180 grados */
        let largeArc = 0;
        let anguloDiff = anguloFin - anguloInicio;
        if (anguloDiff < 0) anguloDiff += 360;
        if (anguloDiff > 180) largeArc = 1;

        const path = `M ${x1} ${y1} A ${radio} ${radio} 0 ${largeArc} 1 ${x2} ${y2}`;

        return <path d={path} fill="none" stroke="var(--dashboard-acento)" strokeWidth={grosor} strokeLinecap="round" opacity={0.6} />;
    };

    /* Renderizar marcadores de hora */
    const renderizarMarcadores = () => {
        const marcadores = [];
        const radio = 36;
        const centro = 45;

        for (let h = 0; h < 24; h += 6) {
            const angulo = horaAAngulo(h, 0);
            const rad = (angulo * Math.PI) / 180;
            const x = centro + (radio - 5) * Math.cos(rad);
            const y = centro + (radio - 5) * Math.sin(rad);
            const etiqueta = h.toString().padStart(2, '0');

            marcadores.push(
                <text key={h} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="relojMarcador">
                    {etiqueta}
                </text>
            );
        }

        return marcadores;
    };

    /* Cerrar al hacer click fuera */
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuAbierto) return;

        const manejarClickFuera = (evento: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
                setMenuAbierto(false);
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') setMenuAbierto(false);
        };

        const timeout = setTimeout(() => {
            document.addEventListener('click', manejarClickFuera);
            document.addEventListener('keydown', manejarEscape);
        }, 0);

        return () => {
            clearTimeout(timeout);
            document.removeEventListener('click', manejarClickFuera);
            document.removeEventListener('keydown', manejarEscape);
        };
    }, [menuAbierto]);

    /* Texto del botón */
    const textoBoton = valor?.habilitada ? `${formatearHora(valor.horaInicio, valor.minutoInicio)} - ${formatearHora(valor.horaFin, valor.minutoFin)}` : 'Sin definir';

    return (
        <div className="selectorVentanaOportunidad">
            <button type="button" className={`selectorVentanaOportunidad__boton ${valor?.habilitada ? 'selectorVentanaOportunidad__boton--activo' : ''} ${estaEnVentana ? 'selectorVentanaOportunidad__boton--enVentana' : ''}`} onClick={() => setMenuAbierto(!menuAbierto)}>
                <Clock size={14} />
                <span>{textoBoton}</span>
            </button>

            {menuAbierto && (
                <>
                    {/* Overlay para móvil (solo visible vía CSS @media) */}
                    <div className="selectorVentanaOportunidad__overlay" onClick={() => setMenuAbierto(false)} />

                    <div className="selectorVentanaOportunidad__menu" ref={menuRef}>
                        <div className="selectorVentanaOportunidad__header">
                            <span className="selectorVentanaOportunidad__titulo">Ventana de Oportunidad</span>
                            <button type="button" className="selectorVentanaOportunidad__cerrar" onClick={() => setMenuAbierto(false)}>
                                <X size={14} />
                            </button>
                        </div>

                        {/* Reloj circular minimalista */}
                        <div className="selectorVentanaOportunidad__reloj">
                            <svg viewBox="0 0 90 90" className="selectorVentanaOportunidad__svg">
                                {/* Círculo base */}
                                <circle cx="45" cy="45" r="36" fill="none" stroke="var(--dashboard-bordeSutil)" strokeWidth="8" />
                                {/* Arco de la ventana */}
                                {renderizarArco()}
                                {/* Marcadores de hora */}
                                {renderizarMarcadores()}
                            </svg>
                        </div>

                        {/* Controles de hora */}
                        <div className="selectorVentanaOportunidad__controles">
                            <div className="selectorVentanaOportunidad__control">
                                <label>Inicio</label>
                                <input
                                    type="time"
                                    value={formatearHora(ventana.horaInicio, ventana.minutoInicio)}
                                    onChange={e => {
                                        const [h, m] = e.target.value.split(':').map(Number);
                                        cambiarHora('inicio', h, m);
                                    }}
                                    className="selectorVentanaOportunidad__inputHora"
                                />
                            </div>
                            <div className="selectorVentanaOportunidad__control">
                                <label>Fin</label>
                                <input
                                    type="time"
                                    value={formatearHora(ventana.horaFin, ventana.minutoFin)}
                                    onChange={e => {
                                        const [h, m] = e.target.value.split(':').map(Number);
                                        cambiarHora('fin', h, m);
                                    }}
                                    className="selectorVentanaOportunidad__inputHora"
                                />
                            </div>
                        </div>

                        {/* Toggle y eliminar */}
                        <div className="selectorVentanaOportunidad__acciones">
                            <button type="button" className={`selectorVentanaOportunidad__toggle ${valor?.habilitada ? 'selectorVentanaOportunidad__toggle--activo' : ''}`} onClick={toggleHabilitado}>
                                {valor?.habilitada ? 'Desactivar' : 'Activar'}
                            </button>
                            {valor && (
                                <button type="button" className="selectorVentanaOportunidad__eliminar" onClick={eliminarVentana}>
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

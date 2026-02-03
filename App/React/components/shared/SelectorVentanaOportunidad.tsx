/*
 * SelectorVentanaOportunidad
 * Componente para seleccionar la ventana de oportunidad de un hábito
 * Muestra un círculo minimalista tipo reloj para marcar inicio y fin
 * TAREA 4: Ventana de Oportunidad para Hábitos
 */

import {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import {X} from 'lucide-react';
import type {VentanaOportunidad} from '../../types/dashboard';

interface SelectorVentanaOportunidadProps {
    ventana: VentanaOportunidad | undefined;
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

export function SelectorVentanaOportunidad({ventana: propVentana, onChange}: SelectorVentanaOportunidadProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);

    /* Valores actuales o por defecto si no existe el prop */
    const ventanaActual = useMemo(
        () =>
            propVentana || {
                horaInicio: 8,
                minutoInicio: 0,
                horaFin: 12,
                minutoFin: 0,
                habilitada: false
            },
        [propVentana]
    );

    /* Estado local para los inputs (para permitir escribir libremente sin que el componente padre bloquee) */
    const [tempInicio, setTempInicio] = useState(formatearHora(ventanaActual.horaInicio, ventanaActual.minutoInicio));
    const [tempFin, setTempFin] = useState(formatearHora(ventanaActual.horaFin, ventanaActual.minutoFin));

    /* Sincronizar estados locales cuando cambia el prop externo (solo si el menú cambia o se abre) */
    /* Sincronizar estados locales cuando cambia el prop externo */
    /* Usamos refs para evitar sobreescribir el input mientras el usuario escribe */
    const prevHabilitada = useRef(ventanaActual.habilitada);
    const prevAbierto = useRef(menuAbierto);

    useEffect(() => {
        const seAbrio = !prevAbierto.current && menuAbierto;
        const cambioHabilitado = prevHabilitada.current !== ventanaActual.habilitada;

        /* Solo actualizamos los inputs temporales si:
           1. Se acaba de abrir el menú
           2. Cambio el estado de habilitado (ej: clic en botón activar/eliminar)
           Nota: NO actualizamos si solo cambia hora/minuto, para no interrumpir al usuario escribiendo
        */
        if (seAbrio || cambioHabilitado) {
            setTempInicio(formatearHora(ventanaActual.horaInicio, ventanaActual.minutoInicio));
            setTempFin(formatearHora(ventanaActual.horaFin, ventanaActual.minutoFin));
        }

        prevAbierto.current = menuAbierto;
        prevHabilitada.current = ventanaActual.habilitada;
    }, [ventanaActual, menuAbierto]);

    /* Forzar re-render cada minuto para actualizar el punto de "hora actual" */
    const [, setTick] = useState(0);
    useEffect(() => {
        if (menuAbierto) {
            const timer = setInterval(() => setTick(t => t + 1), 60000);
            return () => clearInterval(timer);
        }
    }, [menuAbierto]);

    /* Calcula si estamos actualmente dentro de la ventana */
    const estaEnVentana = useMemo(() => {
        if (!ventanaActual.habilitada) return false;
        const ahora = new Date();
        const horaActual = ahora.getHours();
        const minutoActual = ahora.getMinutes();
        const totalActual = horaActual * 60 + minutoActual;
        const totalInicio = ventanaActual.horaInicio * 60 + ventanaActual.minutoInicio;
        const totalFin = ventanaActual.horaFin * 60 + ventanaActual.minutoFin;

        /* Manejar ventanas que cruzan medianoche */
        if (totalInicio <= totalFin) {
            return totalActual >= totalInicio && totalActual <= totalFin;
        } else {
            return totalActual >= totalInicio || totalActual <= totalFin;
        }
    }, [ventanaActual]);

    /* Toggle habilitado */
    const toggleHabilitado = useCallback(() => {
        onChange({...ventanaActual, habilitada: !ventanaActual.habilitada});
    }, [ventanaActual, onChange]);

    /* Eliminar ventana */
    const eliminarVentana = useCallback(() => {
        onChange(undefined);
        setMenuAbierto(false);
    }, [onChange]);

    /* Parsing flexible de hora */
    const parsearHoraFlexible = (texto: string): {h: number; m: number} | null => {
        const t = texto.trim();
        if (!t) return null;

        let h = -1;
        let m = -1;

        if (t.includes(':')) {
            const partes = t.split(':');
            if (partes.length === 2 && partes[0] !== '' && partes[1] !== '') {
                h = parseInt(partes[0]);
                m = parseInt(partes[1]);
            }
        } else if (/^\d+$/.test(t)) {
            /* Si solo escribe números (hasta 4 dígitos) */
            if (t.length <= 2) {
                h = parseInt(t);
                m = 0;
            } else if (t.length === 3) {
                h = parseInt(t.substring(0, 1));
                m = parseInt(t.substring(1));
            } else if (t.length === 4) {
                h = parseInt(t.substring(0, 2));
                m = parseInt(t.substring(2));
            }
        }

        if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return {h, m};
        }
        return null; // Hora inválida o incompleta
    };

    /* Procesar cambio de texto y teclas especiales */
    const manejarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, tipo: 'inicio' | 'fin') => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const horaActual = tipo === 'inicio' ? ventanaActual.horaInicio : ventanaActual.horaFin;
            const minutoActual = tipo === 'inicio' ? ventanaActual.minutoInicio : ventanaActual.minutoFin;

            let nuevaHora = horaActual;
            if (e.key === 'ArrowUp') nuevaHora = (horaActual + 1) % 24;
            if (e.key === 'ArrowDown') nuevaHora = (horaActual - 1 + 24) % 24;

            const nuevaVentana = {...ventanaActual, habilitada: true};
            if (tipo === 'inicio') {
                nuevaVentana.horaInicio = nuevaHora;
                setTempInicio(formatearHora(nuevaHora, minutoActual));
            } else {
                nuevaVentana.horaFin = nuevaHora;
                setTempFin(formatearHora(nuevaHora, minutoActual));
            }
            onChange(nuevaVentana);
        }
    };

    const manejarCambioTexto = (tipo: 'inicio' | 'fin', valorTexto: string) => {
        /* Permitir solo números y dos puntos */
        if (!/^[\d:]*$/.test(valorTexto)) return;

        /* Prevenir inputs absurdamente largos */
        if (valorTexto.length > 5) return;

        if (tipo === 'inicio') setTempInicio(valorTexto);
        else setTempFin(valorTexto);

        const resultado = parsearHoraFlexible(valorTexto);
        if (resultado) {
            const {h, m} = resultado;
            const horaActual = tipo === 'inicio' ? ventanaActual.horaInicio : ventanaActual.horaFin;
            const minutoActual = tipo === 'inicio' ? ventanaActual.minutoInicio : ventanaActual.minutoFin;

            if (h !== horaActual || m !== minutoActual) {
                const nuevaVentana = {...ventanaActual, habilitada: true};
                if (tipo === 'inicio') {
                    nuevaVentana.horaInicio = h;
                    nuevaVentana.minutoInicio = m;
                } else {
                    nuevaVentana.horaFin = h;
                    nuevaVentana.minutoFin = m;
                }
                onChange(nuevaVentana);
            }
        }
    };

    /* Al perder el foco, somos más flexibles y formateamos */
    const manejarBlur = (tipo: 'inicio' | 'fin', valorTexto: string) => {
        const resultado = parsearHoraFlexible(valorTexto);

        if (resultado) {
            const {h, m} = resultado;
            const nuevaVentana = {...ventanaActual, habilitada: true};
            if (tipo === 'inicio') {
                nuevaVentana.horaInicio = h;
                nuevaVentana.minutoInicio = m;
                setTempInicio(formatearHora(h, m));
            } else {
                nuevaVentana.horaFin = h;
                nuevaVentana.minutoFin = m;
                setTempFin(formatearHora(h, m));
            }
            onChange(nuevaVentana);
        } else {
            /* Si es invalido, revertir al valor actual */
            if (tipo === 'inicio') setTempInicio(formatearHora(ventanaActual.horaInicio, ventanaActual.minutoInicio));
            else setTempFin(formatearHora(ventanaActual.horaFin, ventanaActual.minutoFin));
        }
    };

    /* Renderizar arco SVG para la ventana */
    const renderizarArco = () => {
        if (!ventanaActual.habilitada) return null;

        const radio = 36;
        const centro = 45;
        const grosor = 6;

        const anguloInicio = horaAAngulo(ventanaActual.horaInicio, ventanaActual.minutoInicio);
        const anguloFin = horaAAngulo(ventanaActual.horaFin, ventanaActual.minutoFin);

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

        /* Si es un círculo completo (mismo inicio y fin), forzar arco */
        if (anguloDiff === 0) {
            return <circle cx={centro} cy={centro} r={radio} fill="none" stroke="var(--dashboard-estadoExito)" strokeWidth={grosor} opacity={0.4} />;
        }

        const path = `M ${x1} ${y1} A ${radio} ${radio} 0 ${largeArc} 1 ${x2} ${y2}`;
        return <path d={path} fill="none" stroke="var(--dashboard-estadoExito)" strokeWidth={grosor} strokeLinecap="round" opacity={0.6} />;
    };

    /* Renderizar marcadores (solo líneas sutiles sin números) */
    const renderizarMarcadores = () => {
        const marcadores = [];
        const radio = 36;
        const centro = 45;

        for (let h = 0; h < 24; h += 6) {
            const angulo = horaAAngulo(h, 0);
            const rad = (angulo * Math.PI) / 180;
            const x1 = centro + (radio - 2) * Math.cos(rad);
            const y1 = centro + (radio - 2) * Math.sin(rad);
            const x2 = centro + (radio + 2) * Math.cos(rad);
            const y2 = centro + (radio + 2) * Math.sin(rad);

            marcadores.push(<line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--dashboard-bordeSutil)" strokeWidth="1" />);
        }

        return marcadores;
    };

    /* Renderizar punto de hora actual */
    const renderizarHoraActual = () => {
        const ahora = new Date();
        const hora = ahora.getHours();
        const minuto = ahora.getMinutes();

        const radio = 36;
        const centro = 45;

        const angulo = horaAAngulo(hora, minuto);
        const rad = (angulo * Math.PI) / 180;

        const x = centro + radio * Math.cos(rad);
        const y = centro + radio * Math.sin(rad);

        return <circle cx={x} cy={y} r="3" className="indicadorHoraActual" />;
    };

    /* Manejo del menú */
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
    const textoBoton = propVentana?.habilitada ? `${formatearHora(ventanaActual.horaInicio, ventanaActual.minutoInicio)} - ${formatearHora(ventanaActual.horaFin, ventanaActual.minutoFin)}` : 'Sin definir';

    return (
        <div className="selectorVentanaOportunidad">
            <button type="button" className={`selectorVentanaOportunidad__boton ${estaEnVentana ? 'selectorVentanaOportunidad__boton--enVentana' : ''}`} onClick={() => setMenuAbierto(!menuAbierto)}>
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
                                {/* Indicador hora actual */}
                                {renderizarHoraActual()}
                            </svg>
                        </div>

                        {/* Controles de hora (Inputs manuales) */}
                        <div className="selectorVentanaOportunidad__controles">
                            <div className="selectorVentanaOportunidad__control">
                                <label>Inicio</label>
                                <input type="text" placeholder="08:00" value={tempInicio} onChange={e => manejarCambioTexto('inicio', e.target.value)} onBlur={e => manejarBlur('inicio', e.target.value)} onKeyDown={e => manejarKeyDown(e, 'inicio')} className="selectorVentanaOportunidad__inputHora" />
                            </div>
                            <div className="selectorVentanaOportunidad__control">
                                <label>Fin</label>
                                <input type="text" placeholder="12:00" value={tempFin} onChange={e => manejarCambioTexto('fin', e.target.value)} onBlur={e => manejarBlur('fin', e.target.value)} onKeyDown={e => manejarKeyDown(e, 'fin')} className="selectorVentanaOportunidad__inputHora" />
                            </div>
                        </div>

                        {/* Toggle y eliminar */}
                        <div className="selectorVentanaOportunidad__acciones">
                            <button type="button" className={`selectorVentanaOportunidad__toggle ${ventanaActual.habilitada ? 'selectorVentanaOportunidad__toggle--activo' : ''}`} onClick={toggleHabilitado}>
                                {ventanaActual.habilitada ? 'Desactivar' : 'Activar'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

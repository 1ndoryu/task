/*
 * useSelectorVentanaOportunidad
 * Hook que encapsula la lógica del selector de ventana de oportunidad.
 * Maneja estado del menú, parsing de horas, sincronización de inputs
 * temporales, tick para hora actual y cálculo de si estamos dentro de la ventana.
 */

import {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import type {VentanaOportunidad} from '../../types/dashboard';

/*
 * Formatea hora y minuto a string HH:MM
 */
export function formatearHora(hora: number, minuto: number): string {
    return `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
}

/*
 * Calcula el ángulo en grados para una hora (0-360)
 */
export function horaAAngulo(hora: number, minuto: number): number {
    const totalMinutos = hora * 60 + minuto;
    /* 360 grados = 24 horas = 1440 minutos */
    return (totalMinutos / 1440) * 360 - 90; /* -90 para que 00:00 esté arriba */
}

/*
 * Parsing flexible de texto a hora y minuto.
 * Acepta formatos: "8", "08", "830", "0830", "8:30", "08:30"
 */
function parsearHoraFlexible(texto: string): {h: number; m: number} | null {
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
    return null;
}

interface UseSelectorVentanaOportunidadParams {
    ventana: VentanaOportunidad | undefined;
    onChange: (valor: VentanaOportunidad | undefined) => void;
}

export function useSelectorVentanaOportunidad({ventana: propVentana, onChange}: UseSelectorVentanaOportunidadParams) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    /* [243A-15] Preselección rápida Día: 06:00 - 18:00 (hora militar) */
    const preseleccionarDia = useCallback(() => {
        setTempInicio('06:00');
        setTempFin('18:00');
        onChange({horaInicio: 6, minutoInicio: 0, horaFin: 18, minutoFin: 0, habilitada: true});
    }, [onChange]);

    /* [243A-15] Preselección rápida Noche: 18:00 - 06:00 (cruza medianoche) */
    const preseleccionarNoche = useCallback(() => {
        setTempInicio('18:00');
        setTempFin('06:00');
        onChange({horaInicio: 18, minutoInicio: 0, horaFin: 6, minutoFin: 0, habilitada: true});
    }, [onChange]);

    /* Procesar cambio de texto y teclas especiales */
    const manejarKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>, tipo: 'inicio' | 'fin') => {
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
        },
        [ventanaActual, onChange]
    );

    /* Manejar cambio de texto en inputs de hora */
    const manejarCambioTexto = useCallback(
        (tipo: 'inicio' | 'fin', valorTexto: string) => {
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
        },
        [ventanaActual, onChange]
    );

    /* Al perder el foco, formateamos o revertimos */
    const manejarBlur = useCallback(
        (tipo: 'inicio' | 'fin', valorTexto: string) => {
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
                /* Si es inválido, revertir al valor actual */
                if (tipo === 'inicio') setTempInicio(formatearHora(ventanaActual.horaInicio, ventanaActual.minutoInicio));
                else setTempFin(formatearHora(ventanaActual.horaFin, ventanaActual.minutoFin));
            }
        },
        [ventanaActual, onChange]
    );

    /* Cerrar menú al hacer clic fuera o Escape */
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

    /* Texto del botón principal */
    const textoBoton = propVentana?.habilitada ? `${formatearHora(ventanaActual.horaInicio, ventanaActual.minutoInicio)} - ${formatearHora(ventanaActual.horaFin, ventanaActual.minutoFin)}` : 'Sin definir';

    return {
        menuAbierto,
        setMenuAbierto,
        menuRef,
        ventanaActual,
        tempInicio,
        tempFin,
        estaEnVentana,
        textoBoton,
        toggleHabilitado,
        eliminarVentana,
        preseleccionarDia,
        preseleccionarNoche,
        manejarKeyDown,
        manejarCambioTexto,
        manejarBlur
    };
}

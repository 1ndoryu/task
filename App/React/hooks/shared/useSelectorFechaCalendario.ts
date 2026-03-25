/*
 * useSelectorFechaCalendario
 * [253A-9] Hook que centraliza la lógica del selector de fecha con calendario.
 * Maneja: navegación de meses, grid del calendario, cerrar fuera/escape, ajuste de posición.
 */

import {useState, useRef, useEffect, useCallback} from 'react';
import {obtenerFechaLocalISO} from '../../utils/fecha';

interface UseSelectorFechaCalendarioProps {
    posicionX: number;
    posicionY: number;
    fechaActual?: string;
    onCerrar: () => void;
    onSeleccionar: (fechaISO: string) => void;
}

interface CeldaCalendario {
    fecha: string;
    dia: number;
    esOtroMes: boolean;
}

/* Genera la cuadrícula del mes: celdas con fecha ISO, día numérico y si es otro mes */
function generarGridMes(anio: number, mes: number): CeldaCalendario[] {
    const primerDia = new Date(anio, mes, 1);
    /* Lunes = 0, Domingo = 6 */
    let diaInicio = primerDia.getDay() - 1;
    if (diaInicio < 0) diaInicio = 6;

    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const diasMesAnterior = new Date(anio, mes, 0).getDate();
    const celdas: CeldaCalendario[] = [];

    for (let i = diaInicio - 1; i >= 0; i--) {
        const d = diasMesAnterior - i;
        const mesAnt = mes === 0 ? 11 : mes - 1;
        const anioAnt = mes === 0 ? anio - 1 : anio;
        celdas.push({fecha: obtenerFechaLocalISO(new Date(anioAnt, mesAnt, d)), dia: d, esOtroMes: true});
    }

    for (let d = 1; d <= diasEnMes; d++) {
        celdas.push({fecha: obtenerFechaLocalISO(new Date(anio, mes, d)), dia: d, esOtroMes: false});
    }

    const restantes = 7 - (celdas.length % 7);
    if (restantes < 7) {
        for (let d = 1; d <= restantes; d++) {
            const mesSig = mes === 11 ? 0 : mes + 1;
            const anioSig = mes === 11 ? anio + 1 : anio;
            celdas.push({fecha: obtenerFechaLocalISO(new Date(anioSig, mesSig, d)), dia: d, esOtroMes: true});
        }
    }

    return celdas;
}

export function useSelectorFechaCalendario({posicionX, posicionY, fechaActual, onCerrar, onSeleccionar}: UseSelectorFechaCalendarioProps) {
    const hoy = obtenerFechaLocalISO(new Date());
    const fechaInicial = fechaActual ? new Date(fechaActual + 'T12:00:00') : new Date();
    const [mesVista, setMesVista] = useState({anio: fechaInicial.getFullYear(), mes: fechaInicial.getMonth()});
    const [posicionAjustada, setPosicionAjustada] = useState({x: posicionX, y: posicionY});
    const contenedorRef = useRef<HTMLDivElement>(null);

    /* Cerrar al clic fuera */
    useEffect(() => {
        const manejarClickFuera = (e: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                onCerrar();
            }
        };
        const timeoutId = setTimeout(() => document.addEventListener('mousedown', manejarClickFuera), 10);
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', manejarClickFuera);
        };
    }, [onCerrar]);

    /* Cerrar con Escape */
    useEffect(() => {
        const manejarTecla = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCerrar();
        };
        document.addEventListener('keydown', manejarTecla);
        return () => document.removeEventListener('keydown', manejarTecla);
    }, [onCerrar]);

    /* Ajustar posición si se sale de la pantalla */
    useEffect(() => {
        if (!contenedorRef.current) return;
        const rect = contenedorRef.current.getBoundingClientRect();
        let x = posicionX;
        let y = posicionY;
        if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 8;
        if (y + rect.height > window.innerHeight) y = posicionY - rect.height - 8;
        if (x < 0) x = 8;
        if (y < 0) y = 8;
        setPosicionAjustada({x, y});
    }, [posicionX, posicionY]);

    const mesAnterior = useCallback(() => {
        setMesVista(prev => prev.mes === 0 ? {anio: prev.anio - 1, mes: 11} : {anio: prev.anio, mes: prev.mes - 1});
    }, []);

    const mesSiguiente = useCallback(() => {
        setMesVista(prev => prev.mes === 11 ? {anio: prev.anio + 1, mes: 0} : {anio: prev.anio, mes: prev.mes + 1});
    }, []);

    const seleccionarRapida = useCallback((tipo: 'hoy' | 'manana' | 'semana') => {
        const fecha = new Date();
        if (tipo === 'manana') fecha.setDate(fecha.getDate() + 1);
        if (tipo === 'semana') fecha.setDate(fecha.getDate() + 7);
        onSeleccionar(obtenerFechaLocalISO(fecha));
    }, [onSeleccionar]);

    const celdas = generarGridMes(mesVista.anio, mesVista.mes);

    return {
        hoy,
        mesVista,
        celdas,
        contenedorRef,
        posicionAjustada,
        mesAnterior,
        mesSiguiente,
        seleccionarRapida
    };
}

export type {CeldaCalendario};

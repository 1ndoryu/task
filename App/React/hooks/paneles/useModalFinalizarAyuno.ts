/*
 * useModalFinalizarAyuno
 * Hook con la lógica del modal de finalizar ayuno
 * Maneja hora de fin de comida, cálculos de ventana y tiempo
 */

import {useEffect, useMemo, useState} from 'react';
import type {FrecuenciaHabito} from '../../types/dashboard';
import {calcularVentanaComidaMs, formatearDuracionAyuno} from '../../utils/ayunoVentanas';

interface UseModalFinalizarAyunoParams {
    estaAbierto: boolean;
    inicioAyunoMs: number;
    finAyunoMs: number;
    duracionObjetivoMs: number;
    frecuencia: FrecuenciaHabito | undefined;
}

function formatearHoraHHMM(ms: number): string {
    const fecha = new Date(ms);
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minuto = String(fecha.getMinutes()).padStart(2, '0');
    return `${hora}:${minuto}`;
}

function parsearHoraHHMM(valor: string): {hora: number; minuto: number} | null {
    const coincide = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
    if (!coincide) return null;
    const hora = Number(coincide[1]);
    const minuto = Number(coincide[2]);
    if (!Number.isFinite(hora) || !Number.isFinite(minuto)) return null;
    if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null;
    return {hora, minuto};
}

function construirFinComidaMs(baseMs: number, horaTexto: string): number {
    const horaParseada = parsearHoraHHMM(horaTexto);
    if (!horaParseada) return baseMs;
    const base = new Date(baseMs);
    base.setHours(horaParseada.hora, horaParseada.minuto, 0, 0);
    return base.getTime();
}

export function ajustarHoraPorMinutos(horaTexto: string, deltaMinutos: number): string {
    const parsed = parsearHoraHHMM(horaTexto) ?? {hora: 0, minuto: 0};
    const base = new Date();
    base.setHours(parsed.hora, parsed.minuto, 0, 0);
    base.setMinutes(base.getMinutes() + deltaMinutos);
    return `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`;
}

export function useModalFinalizarAyuno({estaAbierto, inicioAyunoMs, finAyunoMs, duracionObjetivoMs, frecuencia}: UseModalFinalizarAyunoParams) {
    const [horaFinComida, setHoraFinComida] = useState(() => formatearHoraHHMM(finAyunoMs));

    useEffect(() => {
        if (!estaAbierto) return;
        setHoraFinComida(formatearHoraHHMM(finAyunoMs));
    }, [estaAbierto, finAyunoMs]);

    const finComidaMs = useMemo(() => {
        return construirFinComidaMs(finAyunoMs, horaFinComida);
    }, [finAyunoMs, horaFinComida]);

    const tiempoEfectivoMs = Math.max(0, finComidaMs - inicioAyunoMs);
    const completado = tiempoEfectivoMs >= duracionObjetivoMs;

    const ventana = useMemo(() => {
        return calcularVentanaComidaMs({finAyunoMs: finComidaMs, duracionObjetivoMs, frecuencia});
    }, [finComidaMs, duracionObjetivoMs, frecuencia]);

    const tiempoHastaProximo = useMemo(() => {
        const delta = ventana.inicioProximoAyunoMs - Date.now();
        if (delta <= 0) return 'Ya disponible';
        return `En ${formatearDuracionAyuno(delta)}`;
    }, [ventana.inicioProximoAyunoMs]);

    return {
        horaFinComida,
        setHoraFinComida,
        finComidaMs,
        tiempoEfectivoMs,
        completado,
        ventana,
        tiempoHastaProximo
    };
}

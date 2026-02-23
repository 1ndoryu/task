/*
 * useSelectorRelojCircular
 * Hook que encapsula la lógica de arrastre circular y conversión
 * ángulo-tiempo para el selector de hora circular (24h).
 * Incluye: tracking de arrastre, cálculo de coordenadas a minutos,
 * listeners globales para arrastre fluido, y posición de manecilla.
 */

import {useState, useRef, useEffect, useCallback, useMemo} from 'react';

interface UseSelectorRelojCircularParams {
    valor: string;
    onChange: (valor: string) => void;
    intervaloMinutos?: number;
    radio?: number;
}

/* Helper para formatear HH:MM */
function formatearHora(h: number, m: number): string {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/* Helper para parsear HH:MM */
function parsearHora(valor: string): {h: number; m: number} {
    const [hStr, mStr] = valor.split(':');
    const h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    return {h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m};
}

export function useSelectorRelojCircular({valor, onChange, intervaloMinutos = 5, radio = 100}: UseSelectorRelojCircularParams) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [arrastrando, setArrastrando] = useState(false);

    /* Dimensiones internas */
    const centro = radio + 20;
    const area = centro * 2;
    const radioReloj = radio;

    /* Parsear valor actual */
    const {h, m} = useMemo(() => parsearHora(valor), [valor]);
    const totalMinutosActual = h * 60 + m;

    /* Convertir tiempo a ángulo (grados). 00:00 = -90 grados (arriba) */
    const minutosAAngulo = (minutos: number) => {
        return (minutos / 1440) * 360 - 90;
    };

    const anguloActual = minutosAAngulo(totalMinutosActual);

    /* Convertir coordenadas del mouse/touch a minutos */
    const calcularMinutosDesdeEvento = useCallback(
        (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
            if (!svgRef.current) return 0;

            const rect = svgRef.current.getBoundingClientRect();
            let clientX, clientY;

            if ('touches' in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = (e as MouseEvent).clientX;
                clientY = (e as MouseEvent).clientY;
            }

            const dx = clientX - (rect.left + rect.width / 2);
            const dy = clientY - (rect.top + rect.height / 2);

            /*
             * atan2: 0 es derecha (06:00), 90 abajo (12:00),
             * -90 arriba (00:00), +-180 izquierda (18:00).
             * Normalizamos para que arriba = 0 minutos.
             */
            let angulo = Math.atan2(dy, dx) * (180 / Math.PI);
            let anguloAjustado = angulo + 90;
            if (anguloAjustado < 0) anguloAjustado += 360;

            const minutosRaw = (anguloAjustado / 360) * 1440;
            const intervalo = Math.max(1, intervaloMinutos);
            const minutosSnap = Math.round(minutosRaw / intervalo) * intervalo;

            return minutosSnap % 1440;
        },
        [intervaloMinutos]
    );

    /* Actualizar hora a partir de minutos totales */
    const actualizarHora = useCallback(
        (minutosTotal: number) => {
            const hNuevo = Math.floor(minutosTotal / 60);
            const mNuevo = minutosTotal % 60;
            onChange(formatearHora(hNuevo, mNuevo));
        },
        [onChange]
    );

    /* Manejar inicio de arrastre */
    const manejarInicioArrastre = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            setArrastrando(true);
            const minutos = calcularMinutosDesdeEvento(e);
            actualizarHora(minutos);
        },
        [calcularMinutosDesdeEvento, actualizarHora]
    );

    /* Listeners globales para arrastre fluido */
    useEffect(() => {
        if (!arrastrando) return;

        const manejarMovimiento = (e: MouseEvent | TouchEvent) => {
            const minutos = calcularMinutosDesdeEvento(e);
            actualizarHora(minutos);
        };

        const manejarFinArrastre = () => {
            setArrastrando(false);
        };

        window.addEventListener('mousemove', manejarMovimiento);
        window.addEventListener('mouseup', manejarFinArrastre);
        window.addEventListener('touchmove', manejarMovimiento, {passive: false});
        window.addEventListener('touchend', manejarFinArrastre);

        return () => {
            window.removeEventListener('mousemove', manejarMovimiento);
            window.removeEventListener('mouseup', manejarFinArrastre);
            window.removeEventListener('touchmove', manejarMovimiento);
            window.removeEventListener('touchend', manejarFinArrastre);
        };
    }, [arrastrando, calcularMinutosDesdeEvento, actualizarHora]);

    /* Calcular posición del indicador (manecilla) */
    const anguloRad = (anguloActual * Math.PI) / 180;
    const handX = centro + radioReloj * Math.cos(anguloRad);
    const handY = centro + radioReloj * Math.sin(anguloRad);

    return {
        svgRef,
        arrastrando,
        centro,
        area,
        radioReloj,
        h,
        m,
        handX,
        handY,
        manejarInicioArrastre
    };
}

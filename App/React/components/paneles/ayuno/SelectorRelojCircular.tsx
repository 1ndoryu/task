/*
 * SelectorRelojCircular
 * Componente de selección de hora circular interactivo (24h)
 * Permite arrastrar para seleccionar la hora con precisión configurada.
 */

import {useState, useRef, useEffect, useCallback, useMemo} from 'react';

interface SelectorRelojCircularProps {
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

export function SelectorRelojCircular({
    valor,
    onChange,
    intervaloMinutos = 5,
    radio = 100 // Tamaño por defecto (radio px)
}: SelectorRelojCircularProps): JSX.Element {
    const svgRef = useRef<SVGSVGElement>(null);
    const [arrastrando, setArrastrando] = useState(false);

    // Dimensiones internas
    const centro = radio + 20; // Padding
    const area = centro * 2;
    const radioReloj = radio;

    // Parsear valor actual
    const {h, m} = useMemo(() => parsearHora(valor), [valor]);
    const totalMinutosActual = h * 60 + m;

    // Convertir tiempo a ángulo (grados)
    // 00:00 debe ser -90 grados (arriba)
    const minutosAAngulo = (minutos: number) => {
        return (minutos / 1440) * 360 - 90;
    };

    const anguloActual = minutosAAngulo(totalMinutosActual);

    // Convertir coordenadas del mouse a minutos
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

            // Calcular ángulo en radianes y convertir a grados
            let angulo = Math.atan2(dy, dx) * (180 / Math.PI);

            // Ajustar para que -90 sea 0 (00:00)
            // atan2: 0 es derecha (06:00), 90 es abajo (12:00), -90 es arriba (00:00), 180/-180 es izquierda (18:00)
            // Queremos: arriba = 0 min

            // Normalizar a 0-360 empezando desde arriba (-90 en atan2)
            // angulo + 90 hace que -90 sea 0.
            let anguloAjustado = angulo + 90;
            if (anguloAjustado < 0) anguloAjustado += 360;

            // Convertir 0-360 a 0-1440 minutos
            let minutosRaw = (anguloAjustado / 360) * 1440;

            // Snap al intervalo
            const intervalo = Math.max(1, intervaloMinutos);
            const minutosSnap = Math.round(minutosRaw / intervalo) * intervalo;

            // Normalizar 1440 a 0
            return minutosSnap % 1440;
        },
        [intervaloMinutos]
    );

    const manejarInicioArrastre = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // Prevenir scroll en touch
        setArrastrando(true);
        const minutos = calcularMinutosDesdeEvento(e);
        actualizarHora(minutos);
    };

    const actualizarHora = (minutosTotal: number) => {
        const hNuevo = Math.floor(minutosTotal / 60);
        const mNuevo = minutosTotal % 60;
        onChange(formatearHora(hNuevo, mNuevo));
    };

    // Listeners globales para arrastre fluido
    useEffect(() => {
        const manejarMovimiento = (e: MouseEvent | TouchEvent) => {
            if (arrastrando) {
                const minutos = calcularMinutosDesdeEvento(e);
                actualizarHora(minutos);
            }
        };

        const manejarFinArrastre = () => {
            setArrastrando(false);
        };

        if (arrastrando) {
            window.addEventListener('mousemove', manejarMovimiento);
            window.addEventListener('mouseup', manejarFinArrastre);
            window.addEventListener('touchmove', manejarMovimiento, {passive: false});
            window.addEventListener('touchend', manejarFinArrastre);
        }

        return () => {
            window.removeEventListener('mousemove', manejarMovimiento);
            window.removeEventListener('mouseup', manejarFinArrastre);
            window.removeEventListener('touchmove', manejarMovimiento);
            window.removeEventListener('touchend', manejarFinArrastre);
        };
    }, [arrastrando, calcularMinutosDesdeEvento]);

    // Renderizar marcadores de hora (0, 6, 12, 18 y puntos intermedios)
    const renderizarMarcadores = () => {
        const items = [];
        for (let i = 0; i < 24; i++) {
            const angulo = (i / 24) * 360 - 90;
            const rad = (angulo * Math.PI) / 180;
            const esPrincipal = i % 6 === 0;

            // Posición exterior
            const rExt = radioReloj;
            // Longitud de la marca
            const longitud = esPrincipal ? 10 : 5;
            const rInt = radioReloj - longitud;

            const x1 = centro + rInt * Math.cos(rad);
            const y1 = centro + rInt * Math.sin(rad);
            const x2 = centro + rExt * Math.cos(rad);
            const y2 = centro + rExt * Math.sin(rad);

            items.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--dashboard-bordeSutil)" strokeWidth={esPrincipal ? 2 : 1} opacity={esPrincipal ? 1 : 0.6} />);

            // Texto para horas principales
            if (esPrincipal) {
                const rTexto = radioReloj - 25;
                const xTexto = centro + rTexto * Math.cos(rad);
                const yTexto = centro + rTexto * Math.sin(rad);
                items.push(
                    <text key={`t-${i}`} x={xTexto} y={yTexto} textAnchor="middle" dominantBaseline="central" fill="var(--dashboard-textoSecundario)" fontSize="12" fontWeight="500" style={{pointerEvents: 'none'}}>
                        {i.toString().padStart(2, '0')}
                    </text>
                );
            }
        }
        return items;
    };

    // Calcular posición del indicador (hand)
    const anguloRad = (anguloActual * Math.PI) / 180;
    const handX = centro + radioReloj * Math.cos(anguloRad);
    const handY = centro + radioReloj * Math.sin(anguloRad);

    return (
        <div className="selectorRelojCircular">
            {/* Display digital central */}
            <div className="selectorRelojCircular__display">
                <span className="selectorRelojCircular__hora">{h.toString().padStart(2, '0')}</span>
                <span className="selectorRelojCircular__separador">:</span>
                <span className="selectorRelojCircular__minuto">{m.toString().padStart(2, '0')}</span>
            </div>

            <svg
                ref={svgRef}
                width={area}
                height={area}
                className={`selectorRelojCircular__svg ${arrastrando ? 'selectorRelojCircular__svg--arrastrando' : ''}`}
                onMouseDown={manejarInicioArrastre}
                onTouchStart={manejarInicioArrastre}
                style={{cursor: 'pointer'}} // Mostrar mano al hover
            >
                {/* Fondo circular interactivo */}
                <circle cx={centro} cy={centro} r={radioReloj} fill="transparent" stroke="var(--dashboard-bordeSutil)" strokeWidth="1" />

                {/* Zona de touch extendida invisible para mejor usabilidad */}
                <circle cx={centro} cy={centro} r={radioReloj + 15} fill="transparent" />

                {/* Marcadores */}
                {renderizarMarcadores()}

                {/* Manecilla */}
                <line x1={centro} y1={centro} x2={handX} y2={handY} stroke="var(--dashboard-acento)" strokeWidth="2" />

                {/* Knob (Punto arrastrable) */}
                <circle
                    cx={handX}
                    cy={handY}
                    r="8" // Mas grande para touch
                    fill="var(--dashboard-acento)"
                    stroke="var(--dashboard-fondoTarjeta)"
                    strokeWidth="2"
                    className="selectorRelojCircular__knob"
                />

                {/* Knob decorativo central */}
                <circle cx={centro} cy={centro} r="4" fill="var(--dashboard-acento)" />
            </svg>

            <p className="selectorRelojCircular__instruccion">Arrastra para cambiar la hora</p>
        </div>
    );
}

/*
 * SelectorRelojCircular
 * Componente de selección de hora circular interactivo (24h)
 * Permite arrastrar para seleccionar la hora con precisión configurada.
 * Lógica de arrastre y cálculo de ángulos extraída a useSelectorRelojCircular
 */

import {useSelectorRelojCircular} from '../../../hooks/shared/useSelectorRelojCircular';

interface SelectorRelojCircularProps {
    valor: string;
    onChange: (valor: string) => void;
    intervaloMinutos?: number;
    radio?: number;
}

export function SelectorRelojCircular({
    valor,
    onChange,
    intervaloMinutos = 5,
    radio = 100
}: SelectorRelojCircularProps): JSX.Element {
    const {svgRef, arrastrando, centro, area, radioReloj, h, m, handX, handY, manejarInicioArrastre} = useSelectorRelojCircular({
        valor,
        onChange,
        intervaloMinutos,
        radio
    });

    /* Calcular posición de marcadores de hora */
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

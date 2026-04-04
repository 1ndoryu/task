/*
 * SelectorVentanaOportunidad
 * Componente para seleccionar la ventana de oportunidad de un hábito
 * Muestra un círculo minimalista tipo reloj para marcar inicio y fin
 * TAREA 4: Ventana de Oportunidad para Hábitos
 */

import {X, Sun, Moon} from 'lucide-react';
import type {VentanaOportunidad} from '../../types/dashboard';
import {Boton} from '../ui';
import {Input} from '../ui/Input';
import {useSelectorVentanaOportunidad, horaAAngulo} from '../../hooks/dashboard/useSelectorVentanaOportunidad';

interface SelectorVentanaOportunidadProps {
    ventana: VentanaOportunidad | undefined;
    onChange: (valor: VentanaOportunidad | undefined) => void;
}

export function SelectorVentanaOportunidad({ventana, onChange}: SelectorVentanaOportunidadProps): JSX.Element {
    const {menuAbierto, setMenuAbierto, menuRef, ventanaActual, tempInicio, tempFin, estaEnVentana, textoBoton, toggleHabilitado, eliminarVentana: _eliminarVentana, preseleccionarDia, preseleccionarNoche, manejarKeyDown, manejarCambioTexto, manejarBlur} = useSelectorVentanaOportunidad({ventana, onChange});

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

    return (
        <div className="selectorVentanaOportunidad">
            <Boton type="button" variante="ghost" claseAdicional={`selectorVentanaOportunidad__boton ${estaEnVentana ? 'selectorVentanaOportunidad__boton--enVentana' : ''}`} onClick={() => setMenuAbierto(!menuAbierto)}>
                <span>{textoBoton}</span>
            </Boton>

            {menuAbierto && (
                <>
                    {/* Overlay para móvil (solo visible vía CSS @media) */}
                    {/* sentinel-disable-next-line componente-artesanal — overlay condicional solo para mobile via CSS */}
                    <div className="selectorVentanaOportunidad__overlay" onClick={() => setMenuAbierto(false)} />

                    <div className="selectorVentanaOportunidad__menu" ref={menuRef}>
                        <div className="selectorVentanaOportunidad__header">
                            <span className="selectorVentanaOportunidad__titulo">Ventana de Oportunidad</span>
                            <Boton type="button" variante="ghost" claseAdicional="selectorVentanaOportunidad__cerrar" onClick={() => setMenuAbierto(false)}>
                                <X size={14} />
                            </Boton>
                        </div>

                        {/* Reloj circular minimalista con presets de sol/luna a los lados [243A-15] */}
                        <div className="selectorVentanaOportunidad__reloj">
                            <Boton type="button" variante="icono" claseAdicional="selectorVentanaOportunidad__presetBtn" onClick={preseleccionarDia} title="Día (06:00 - 18:00)">
                                <Sun size={15} />
                            </Boton>
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
                            <Boton type="button" variante="icono" claseAdicional="selectorVentanaOportunidad__presetBtn" onClick={preseleccionarNoche} title="Noche (18:00 - 06:00)">
                                <Moon size={15} />
                            </Boton>
                        </div>

                        {/* Controles de hora (Inputs manuales) */}
                        <div className="selectorVentanaOportunidad__controles">
                            <div className="selectorVentanaOportunidad__control">
                                <label>Inicio</label>
                                <Input tipo="text" placeholder="08:00" value={tempInicio} onChange={e => manejarCambioTexto('inicio', (e.target as HTMLInputElement).value)} onBlur={e => manejarBlur('inicio', (e.target as HTMLInputElement).value)} onKeyDown={e => manejarKeyDown(e, 'inicio')} claseAdicional="selectorVentanaOportunidad__inputHora" />
                            </div>
                            <div className="selectorVentanaOportunidad__control">
                                <label>Fin</label>
                                <Input tipo="text" placeholder="12:00" value={tempFin} onChange={e => manejarCambioTexto('fin', (e.target as HTMLInputElement).value)} onBlur={e => manejarBlur('fin', (e.target as HTMLInputElement).value)} onKeyDown={e => manejarKeyDown(e, 'fin')} claseAdicional="selectorVentanaOportunidad__inputHora" />
                            </div>
                        </div>

                        {/* Toggle y eliminar */}
                        <div className="selectorVentanaOportunidad__acciones">
                            <Boton type="button" variante="ghost" claseAdicional={`selectorVentanaOportunidad__toggle ${ventanaActual.habilitada ? 'selectorVentanaOportunidad__toggle--activo' : ''}`} onClick={toggleHabilitado}>
                                {ventanaActual.habilitada ? 'Desactivar' : 'Activar'}
                            </Boton>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

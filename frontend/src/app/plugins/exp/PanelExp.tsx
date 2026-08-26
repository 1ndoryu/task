/*
 * plugins/exp/PanelExp.tsx
 * Panel FIJO superior del plugin EXP: una sola columna, siempre visible arriba
 * del dashboard (grid y sidebar). Muestra la barra de vida y la barra de
 * EXP/nivel. No es un panel del grid: se renderiza desde DashboardIsland cuando
 * el plugin está activo.
 *
 * [27-08-2026] Reescrito para ser visualmente coherente con el resto de paneles:
 * usa el contenedor canónico `.panelDashboard` (superficie, borde, radio) y el
 * encabezado `SeccionEncabezado` con `variante="panelHeader"` (mismo fondo,
 * borde inferior y hover de opacidad que los demás paneles), con el nivel en la
 * zona de acciones y las barras como cuerpo del panel.
 */

import {GripVertical, Heart, Sparkles, Zap} from 'lucide-react';
import {SeccionEncabezado} from '../../components/dashboard/SeccionEncabezado';
import {useExpStore} from './store';
import {usePluginActivo} from '../../stores/pluginsStore';

function Barra({valor, maximo, clase, icono, etiqueta, colorClase}: {valor: number; maximo: number; clase: string; icono: React.ReactNode; etiqueta: string; colorClase: string}): JSX.Element {
    const porcentaje = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0;
    return (
        <div className="panelExpItem">
            <div className="panelExpEtiqueta">
                {icono}
                <span>{etiqueta}</span>
                <span className="panelExpValor">{Math.round(valor)} / {Math.round(maximo)}</span>
            </div>
            <div className={`panelExpBarra ${clase}`}>
                <div className={`panelExpBarraRelleno ${colorClase}`} style={{width: `${porcentaje}%`}} />
            </div>
        </div>
    );
}

export function PanelExp(): JSX.Element | null {
    const activo = usePluginActivo('exp');
    const vida = useExpStore(s => s.vida);
    const config = useExpStore(s => s.config);
    const expEnNivel = useExpStore(s => s.expEnNivel);
    const expParaSiguienteNivel = useExpStore(s => s.expParaSiguienteNivel);
    const nivel = useExpStore(s => s.nivel);
    const exp = useExpStore(s => s.exp);

    if (!activo) return null;

    /* Clase de color según el estado de vida (verde/amarillo/rojo). */
    const vidaClase = vida >= 60 ? 'panelExpVida--alta' : vida >= 30 ? 'panelExpVida--media' : 'panelExpVida--baja';

    return (
        <div className="panelDashboard panelExpFijo">
            <SeccionEncabezado
                icono={<GripVertical size={12} />}
                titulo="EXP y Vida"
                variante="panelHeader"
                acciones={
                    <span className="panelExpNivel" title={`${exp} EXP acumulada`}>
                        <Zap size={12} />
                        Nv. {nivel}
                    </span>
                }
            />
            <div className="panelExpCuerpo">
                <Barra valor={vida} maximo={config.vidaMaxima} clase="panelExpBarra--vida" icono={<Heart size={13} />} etiqueta="Vida" colorClase={vidaClase} />
                <Barra valor={expEnNivel} maximo={expParaSiguienteNivel || 1} clase="panelExpBarra--exp" icono={<Sparkles size={13} />} etiqueta="EXP" colorClase="panelExpExp" />
            </div>
        </div>
    );
}

/*
 * plugins/exp/PanelExp.tsx
 * Panel FIJO superior del plugin EXP: una sola columna, siempre visible arriba
 * del dashboard (grid y sidebar). Muestra la barra de vida y la barra de
 * EXP/nivel. No es un panel del grid: se renderiza desde DashboardIsland cuando
 * el plugin está activo.
 *
 * [27-08-2026] Visualmente coherente con el resto de paneles: contenedor
 * canónico `.panelDashboard` + encabezado `SeccionEncabezado` con
 * `variante="panelHeader"`. El encabezado muestra "Game" y dos botones de
 * acción: engranaje (abre la configuración del plugin) y minimizar (colapsa el
 * cuerpo dejando solo la cabecera; el estado persiste en el store).
 */

import {GripVertical, Heart, Minus, Settings, Sparkles, Zap} from 'lucide-react';
import {Boton} from '../../components/ui';
import {SeccionEncabezado} from '../../components/dashboard/SeccionEncabezado';
import {useExpStore} from './store';
import {usePluginActivo} from '../../stores/pluginsStore';

interface PanelExpProps {
    /* Abre la configuración del plugin (Configuración → Plugins → EXP). */
    onAbrirConfig?: () => void;
}

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

export function PanelExp({onAbrirConfig}: PanelExpProps): JSX.Element | null {
    const activo = usePluginActivo('exp');
    const vida = useExpStore(s => s.vida);
    const config = useExpStore(s => s.config);
    const expEnNivel = useExpStore(s => s.expEnNivel);
    const expParaSiguienteNivel = useExpStore(s => s.expParaSiguienteNivel);
    const nivel = useExpStore(s => s.nivel);
    const exp = useExpStore(s => s.exp);
    const minimizado = useExpStore(s => s.minimizado);
    const alternarMinimizado = useExpStore(s => s.alternarMinimizado);

    if (!activo) return null;

    /* Clase de color según el estado de vida (verde/amarillo/rojo). */
    const vidaClase = vida >= 60 ? 'panelExpVida--alta' : vida >= 30 ? 'panelExpVida--media' : 'panelExpVida--baja';

    return (
        <div className="panelDashboard panelExpFijo">
            <SeccionEncabezado
                icono={<GripVertical size={12} />}
                titulo="Game"
                variante="panelHeader"
                acciones={
                    <>
                        <Boton variante="badge" soloIcono onClick={onAbrirConfig} title="Configurar plugin" icono={<Settings size={12} />} />
                        <Boton variante="badge" soloIcono onClick={alternarMinimizado} title={minimizado ? 'Restaurar panel' : 'Minimizar panel'} icono={<Minus size={12} />} />
                    </>
                }
            />
            {!minimizado && (
                <div className="panelExpCuerpo">
                    <div className="panelExpNivel" title={`${exp} EXP acumulada`}>
                        <Zap size={13} />
                        <span>Nv. {nivel}</span>
                    </div>
                    <Barra valor={vida} maximo={config.vidaMaxima} clase="panelExpBarra--vida" icono={<Heart size={13} />} etiqueta="Vida" colorClase={vidaClase} />
                    <Barra valor={expEnNivel} maximo={expParaSiguienteNivel || 1} clase="panelExpBarra--exp" icono={<Sparkles size={13} />} etiqueta="EXP" colorClase="panelExpExp" />
                </div>
            )}
        </div>
    );
}

/*
 * plugins/exp/PanelExp.tsx
 * Panel superior del plugin EXP (Game). Muestra Nv · Vida · EXP y el árbol de
 * vida en pixel art, con su copa reflejando el nivel de vida. Incluye un botón
 * que abre el editor del árbol (los 5 estados) y el estado minimizado.
 *
 * [27-08-2026] El árbol carga su copa del store (`copasArbol`): si el usuario
 * editó el estado actual, se usa esa copa (persistida); si no, la por defecto
 * de ArbolVida. Un botón "Editar árbol" abre ModalEditorArbol.
 */

import {useState} from 'react';
import {Edit3, GripVertical, Heart, Minus, Settings, Sparkles, Zap} from 'lucide-react';
import {Boton} from '../../components/ui';
import {SeccionEncabezado} from '../../components/dashboard/SeccionEncabezado';
import {useExpStore} from './store';
import {usePluginActivo} from '../../stores/pluginsStore';
import {ArbolVida, type EstadoVida} from './ArbolVida';
import {ModalEditorArbol} from './ModalEditorArbol';

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

function mapearAEscala(vida: number): EstadoVida {
    if (vida <= 0) return 0;
    if (vida <= 25) return 25;
    if (vida <= 50) return 50;
    if (vida <= 75) return 75;
    return 100;
}

export function PanelExp({onAbrirConfig}: PanelExpProps): JSX.Element | null {
    const [editorAbierto, setEditorAbierto] = useState(false);
    const activo = usePluginActivo('exp');
    const vida = useExpStore(s => s.vida);
    const config = useExpStore(s => s.config);
    const expEnNivel = useExpStore(s => s.expEnNivel);
    const expParaSiguienteNivel = useExpStore(s => s.expParaSiguienteNivel);
    const nivel = useExpStore(s => s.nivel);
    const exp = useExpStore(s => s.exp);
    const minimizado = useExpStore(s => s.minimizado);
    const alternarMinimizado = useExpStore(s => s.alternarMinimizado);
    const copasArbol = useExpStore(s => s.copasArbol);

    if (!activo) return null;

    const vidaClase = vida >= 60 ? 'panelExpVida--alta' : vida >= 30 ? 'panelExpVida--media' : 'panelExpVida--baja';

    /* Copa del estado actual: editada (persistida) o por defecto. */
    const escala = mapearAEscala(vida);
    const copaEditada = copasArbol[String(escala)];

    return (
        <div className="panelDashboard panelExpFijo">
            <SeccionEncabezado
                icono={<GripVertical size={12} />}
                titulo="Game"
                variante="panelHeader"
                acciones={
                    <>
                        <Boton variante="badge" soloIcono onClick={() => setEditorAbierto(true)} title="Editar árbol de vida" icono={<Edit3 size={12} />} />
                        <Boton variante="badge" soloIcono onClick={onAbrirConfig} title="Configurar plugin" icono={<Settings size={12} />} />
                        <Boton variante="badge" soloIcono onClick={alternarMinimizado} title={minimizado ? 'Restaurar panel' : 'Minimizar panel'} icono={<Minus size={12} />} />
                    </>
                }
            />
            {!minimizado && (
                <div className="panelExpCuerpo">
                    <div className="panelExpFila">
                        <div className="panelExpNivel" title={`${exp} EXP acumulada`}>
                            <Zap size={13} />
                            <span>Nv. {nivel}</span>
                        </div>
                        <Barra valor={vida} maximo={config.vidaMaxima} clase="panelExpBarra--vida" icono={<Heart size={13} />} etiqueta="Vida" colorClase={vidaClase} />
                        <Barra valor={expEnNivel} maximo={expParaSiguienteNivel || 1} clase="panelExpBarra--exp" icono={<Sparkles size={13} />} etiqueta="EXP" colorClase="panelExpExp" />
                    </div>
                    <div className="panelExpArbol" title={`Vida ${Math.round(vida)} / ${config.vidaMaxima}%`}>
                        <ArbolVida vida={vida} copaEditada={copaEditada ? new Set(copaEditada) : undefined} />
                    </div>
                </div>
            )}

            <ModalEditorArbol activo={editorAbierto} onCerrar={() => setEditorAbierto(false)} />
        </div>
    );
}
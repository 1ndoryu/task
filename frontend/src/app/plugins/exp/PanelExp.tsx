/*
 * plugins/exp/PanelExp.tsx
 * Panel superior del plugin EXP (Game). Muestra Nv · Vida · EXP y el árbol de
 * vida en pixel art, con su copa reflejando el nivel de vida. Incluye un botón
 * que abre el editor del árbol (los 5 estados) y el estado minimizado.
 *
 * [27-08-2026] El árbol carga su copa del store (`copasArbol`): si el usuario
 * editó el estado actual, se usa esa copa (persistida); si no, la por defecto
 * de ArbolVida. Un botón "Editar árbol" abre ModalEditorArbol.
 *
 * [28-08-2026] A los lados del árbol se muestran dos contadores derivados del
 * historial real de hábitos (coherentes con el cálculo de vida/actividad):
 * a la izquierda los PENDIENTES hoy (hábitos que debían cumplirse hoy y no
 * están completados/pospuestos), a la derecha los COMPLETADOS ayer.
 */

import {useMemo, useState} from 'react';
import {Edit3, GripVertical, Heart, Minus, Settings, Sparkles, Zap} from 'lucide-react';
import {Boton} from '../../components/ui';
import {SeccionEncabezado} from '../../components/dashboard/SeccionEncabezado';
import {useExpStore} from './store';
import {usePluginActivo} from '../../stores/pluginsStore';
import {useHabitos} from '../../stores/habitosStore';
import {obtenerFechaHoy, sumarDias} from '../../utils/fecha';
import {ArbolVida, type EstadoVida} from './ArbolVida';
import {debioCumplirse} from './logica';
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
    const habitos = useHabitos();

    if (!activo) return null;

    /* [28-08-2026] Contadores derivados del historial real para flanquear el
     * árbol: pendientes de HOY (debían cumplirse y no están) y completados de
     * AYER. Coinciden con la lógica de vida (debioCumplirse) y de actividad.
     * Un hábito pausado o pospuesto hoy no cuenta como pendiente. */
    const {pendientesHoy, completadosAyer} = useMemo(() => {
        const hoy = obtenerFechaHoy();
        const ayer = sumarDias(hoy, -1);
        let pendientes = 0;
        let completadosAyer = 0;
        for (const h of habitos) {
            if (h.pausado) continue;
            const completados = h.historialCompletados || [];
            if (completados.includes(ayer)) completadosAyer++;
            /* Pendiente hoy: debe cumplirse, no completado, no pospuesto hoy. */
            if (h.historialPospuestos?.includes(hoy)) continue;
            if (completados.includes(hoy)) continue;
            if (debioCumplirse(h.frecuencia as never, hoy)) pendientes++;
        }
        return {pendientesHoy: pendientes, completadosAyer};
    }, [habitos]);

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
                    <div className="panelExpArbolFila">
                        <div className="panelExpArbolLateral panelExpArbolLateral--izq" title={`Hábitos que debían cumplirse hoy y aún no se completaron`}>
                            <span className="panelExpArbolLateralValor">{pendientesHoy}</span>
                            <span className="panelExpArbolLateralEtiqueta">pendientes hoy</span>
                        </div>
                        <div className="panelExpArbol" title={`Vida ${Math.round(vida)} / ${config.vidaMaxima}%`}>
                            <ArbolVida vida={vida} copaEditada={copaEditada ? new Set(copaEditada) : undefined} />
                        </div>
                        <div className="panelExpArbolLateral panelExpArbolLateral--der" title={`Hábitos completados ayer`}>
                            <span className="panelExpArbolLateralValor">{completadosAyer}</span>
                            <span className="panelExpArbolLateralEtiqueta">completados ayer</span>
                        </div>
                    </div>
                </div>
            )}

            <ModalEditorArbol activo={editorAbierto} onCerrar={() => setEditorAbierto(false)} />
        </div>
    );
}
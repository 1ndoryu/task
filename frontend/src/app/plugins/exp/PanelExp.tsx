/*
 * plugins/exp/PanelExp.tsx
 * Panel del plugin EXP (Game). Muestra Nv · Vida · EXP y el árbol de vida en
 * pixel art, con su copa reflejando el nivel de vida. Incluye un botón que
 * abre el editor del árbol (los 5 estados).
 *
 * [27-08-2026] Convertido en panel REAL registrado en el grid (patrón
 * PanelAyuno): recibe `renderHandleArrastre`/`handleMinimizar` del framework
 * (el colapso ahora lo gestiona el layout, ya no el store). El contenedor
 * visual `.panelDashboard` lo aporta el framework; aquí solo el cuerpo.
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
import {Edit3, Heart, Settings, Sparkles, Zap} from 'lucide-react';
import {Boton} from '../../components/ui';
import {SeccionEncabezado} from '../../components/dashboard/SeccionEncabezado';
import {useExpStore} from './store';
import {usePluginActivo} from '../../stores/pluginsStore';
import {useHabitos} from '../../stores/habitosStore';
import {obtenerFechaHoy, sumarDias} from '../../utils/fecha';
import {ArbolVida, type EstadoVida} from './ArbolVida';
import {debioCumplirse} from './logica';
import {ModalEditorArbol} from './ModalEditorArbol';
import type {PanelBaseProps} from '../../types/paneles';

interface PanelExpProps extends PanelBaseProps {
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

export function PanelExp({renderHandleArrastre, handleMinimizar, onAbrirConfig}: PanelExpProps): JSX.Element | null {
    const [editorAbierto, setEditorAbierto] = useState(false);
    const activo = usePluginActivo('exp');
    const vida = useExpStore(s => s.vida);
    const config = useExpStore(s => s.config);
    const expEnNivel = useExpStore(s => s.expEnNivel);
    const expParaSiguienteNivel = useExpStore(s => s.expParaSiguienteNivel);
    const nivel = useExpStore(s => s.nivel);
    const exp = useExpStore(s => s.exp);
    const copasArbol = useExpStore(s => s.copasArbol);
    const habitos = useHabitos();

    if (!activo) return null;

    /* [28-08-2026] Contadores + porcentajes derivados del historial real de
     * hábitos para flanquear el árbol. Pendientes HOY: hábitos que debían
     * cumplirse hoy y aún no están completados/pospuestos; su barra refleja el
     * % ya cumplido hoy (completados / total debidos hoy) — si completas la
     * mitad de los pendientes, la barra queda a la mitad. Completados AYER:
     * hábitos con la fecha de ayer en su historial; su barra es el % cumplido
     * ayer sobre el total de hábitos que debían cumplirse ayer. El resto usa
     * la misma lógica de vida (debioCumplirse). */
    const {pendientesHoy, pctPendientes, completadosAyer, pctCompletadosAyer} = useMemo(() => {
        const hoy = obtenerFechaHoy();
        const ayer = sumarDias(hoy, -1);
        let debidosHoy = 0;
        let cumplidosHoy = 0;
        let pospuestosHoy = 0;
        let debidosAyer = 0;
        let completadosAyer = 0;
        for (const h of habitos) {
            if (h.pausado) continue;
            const completados = h.historialCompletados || [];
            const pospuestoHoy = h.historialPospuestos?.includes(hoy) ?? false;

            /* Ayer: hábitos que debían cumplirse y cuántos completaron. */
            if (debioCumplirse(h.frecuencia as never, ayer)) {
                debidosAyer++;
                if (completados.includes(ayer)) completadosAyer++;
            }

            /* Hoy: debidos, completados y pospuestos del día. */
            if (!debioCumplirse(h.frecuencia as never, hoy)) continue;
            debidosHoy++;
            if (completados.includes(hoy)) cumplidosHoy++;
            else if (pospuestoHoy) pospuestosHoy++;
        }
        /* Pendientes reales hoy = debidos no completados ni pospuestos. */
        const pendientesHoy = Math.max(0, debidosHoy - cumplidosHoy - pospuestosHoy);
        /* Barra: % ya cumplido hoy sobre el total de debidos hoy — al completar
         * la mitad de los pendientes queda a la mitad. */
        const pctPendientes = debidosHoy > 0 ? Math.round((cumplidosHoy / debidosHoy) * 100) : 0;
        const pctCompletadosAyer = debidosAyer > 0 ? Math.round((completadosAyer / debidosAyer) * 100) : 0;
        return {pendientesHoy, pctPendientes, completadosAyer, pctCompletadosAyer};
    }, [habitos]);

    const vidaClase = vida >= 60 ? 'panelExpVida--alta' : vida >= 30 ? 'panelExpVida--media' : 'panelExpVida--baja';

    /* Copa del estado actual: editada (persistida) o por defecto. */
    const escala = mapearAEscala(vida);
    const copaEditada = copasArbol[String(escala)];

    return (
        <div className="panelExp">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Game')}
                variante="panelHeader"
                acciones={
                    <>
                        <Boton variante="badge" soloIcono onClick={() => setEditorAbierto(true)} title="Editar árbol de vida" icono={<Edit3 size={12} />} />
                        <Boton variante="badge" soloIcono onClick={onAbrirConfig} title="Configurar plugin" icono={<Settings size={12} />} />
                        {handleMinimizar}
                    </>
                }
            />
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
                        <div className="panelExpArbolLateralFila">
                            <div className="panelExpArbolLateralBarra">
                                <div className="panelExpArbolLateralBarraRelleno panelExpArbolLateralBarra--pendientes" style={{width: `${pctPendientes}%`}} />
                            </div>
                            <span className="panelExpArbolLateralValor">{pendientesHoy}</span>
                        </div>
                        <span className="panelExpArbolLateralEtiqueta">pendientes hoy</span>
                    </div>
                    <div className="panelExpArbolArbolWrap">
                        <div className="panelExpArbol" title={`Vida ${Math.round(vida)} / ${config.vidaMaxima}%`}>
                            <ArbolVida vida={vida} copaEditada={copaEditada ? new Set(copaEditada) : undefined} />
                        </div>
                    </div>
                    <div className="panelExpArbolLateral panelExpArbolLateral--der" title={`Hábitos completados ayer`}>
                        <div className="panelExpArbolLateralFila">
                            <div className="panelExpArbolLateralBarra">
                                <div className="panelExpArbolLateralBarraRelleno panelExpArbolLateralBarra--ayer" style={{width: `${pctCompletadosAyer}%`}} />
                            </div>
                            <span className="panelExpArbolLateralValor">{completadosAyer}</span>
                        </div>
                        <span className="panelExpArbolLateralEtiqueta">completados ayer</span>
                    </div>
                </div>
            </div>

            <ModalEditorArbol activo={editorAbierto} onCerrar={() => setEditorAbierto(false)} />
        </div>
    );
}
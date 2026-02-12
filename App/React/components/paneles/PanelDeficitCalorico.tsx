/*
 * PanelDeficitCalorico
 * Panel visual del plugin de déficit calórico
 * Muestra resumen diario, input de comidas (texto/foto) e historial
 *
 * Sub-componentes internos para cumplir SRP:
 * - ResumenDiario: indicador visual de déficit/superávit
 * - EntradaComida: input de texto + botón de foto
 * - ListaComidas: comidas registradas hoy
 * - HistorialSemanal: últimos 7 días
 */

import {useState, useMemo} from 'react';
import {Loader2, Trash2, AlertCircle, Settings, Maximize2, RotateCcw, Eye} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {useDeficitCalorico} from '../../hooks/useDeficitCalorico';
import {OverlayEnfoque} from '../shared';
import {calcularObjetivosMacro} from '../../utils/calculoTMB';
import {HistorialCalorias} from './deficitCalorico/HistorialCalorias';
import {ModalInspeccionIA} from './deficitCalorico/ModalInspeccionIA';
import type {DatosUsuarioTMB} from '../../types/deficitCalorico';
import {Boton} from '../ui';

interface PanelDeficitCaloricoProps {
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    onAbrirConfiguracion: () => void;
}

/* Indicador visual de macros y objetivos */
function ResumenNutricional({calorias, proteinas, carbohidratos, grasas, azucar, tdee, datosUsuario}: {calorias: number; proteinas: number; carbohidratos: number; grasas: number; azucar: number; tdee: number | null; datosUsuario: DatosUsuarioTMB}): JSX.Element {
    const objetivos = useMemo(() => {
        if (!tdee) return null;
        return calcularObjetivosMacro(tdee, datosUsuario.objetivoDeficit ?? 'moderado');
    }, [tdee, datosUsuario.objetivoDeficit]);

    if (!objetivos) {
        return (
            <div className="deficitResumenSimple">
                <span className="deficitResumenValor">{calorias}</span>
                <span className="deficitResumenEtiqueta">kcal consumidas</span>
            </div>
        );
    }

    const MetaBarra = ({label, actual, meta, color}: {label: string; actual: number; meta: number; color: string}) => {
        const porcentaje = Math.min((actual / meta) * 100, 100);
        return (
            <div className="deficitMacroItem">
                <div className="deficitMacroHeader">
                    <span className="deficitMacroLabel">{label}</span>
                    <span className="deficitMacroValor">
                        {actual} / {meta}g
                    </span>
                </div>
                <div className="deficitMacroBarraFondo">
                    <div className="deficitMacroBarraProgreso" style={{width: `${porcentaje}%`, backgroundColor: color}} />
                </div>
            </div>
        );
    };

    const porcentajeCal = Math.min((calorias / objetivos.calorias) * 100, 100);
    const caloriasRestantes = objetivos.calorias - calorias;
    const estadoCalorias = caloriasRestantes >= 0 ? `${caloriasRestantes} restantes` : `${Math.abs(caloriasRestantes)} exceso`;

    /* Usar variables estándar o locales definidas en CSS */
    const colorCalorias = calorias > objetivos.calorias ? 'var(--dashboard-estadoAlta)' : 'var(--dashboard-estadoExito)';

    return (
        <div className="deficitResumenNutricional">
            {/* Calorías Principal */}
            <div className="deficitCaloriasPrincipal">
                <div className="deficitCaloriasInfo">
                    <span className="deficitCaloriasValor">{calorias}</span>
                    <span className="deficitCaloriasMeta">/ {objetivos.calorias} kcal</span>
                </div>
                <span className="deficitCaloriasEstado" style={{color: caloriasRestantes < 0 ? 'var(--dashboard-estadoAlta)' : 'var(--dashboard-textoSecundario)'}}>
                    {estadoCalorias} (Meta: {datosUsuario.objetivoDeficit || 'moderado'})
                </span>
                <div className="deficitBarraGrandeFondo">
                    <div className="deficitBarraGrandeProgreso" style={{width: `${porcentajeCal}%`, backgroundColor: colorCalorias}} />
                </div>
            </div>

            {/* Grilla de Macros con colores locales del CSS */}
            <div className="deficitMacrosGrid">
                <MetaBarra label="Proteínas" actual={proteinas} meta={objetivos.proteinas} color="var(--color-proteina)" />
                <MetaBarra label="Carbohidratos" actual={carbohidratos} meta={objetivos.carbohidratos} color="var(--color-carbo)" />
                <MetaBarra label="Grasas" actual={grasas} meta={objetivos.grasas} color="var(--color-grasa)" />
                <MetaBarra label="Azúcar" actual={azucar} meta={objetivos.azucar} color="var(--color-azucar)" />
            </div>
        </div>
    );
}

/* Input de texto para registrar comidas */
function EntradaComida({onEnviarTexto, cargando}: {onEnviarTexto: (texto: string) => void; cargando: boolean}): JSX.Element {
    const [texto, setTexto] = useState('');

    const manejarEnviar = () => {
        const descripcion = texto.trim();
        if (!descripcion || cargando) return;
        onEnviarTexto(descripcion);
        setTexto('');
    };

    const manejarTecla = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            manejarEnviar();
        }
    };

    return (
        <div className="deficitEntrada">
            <div className="deficitEntradaInputContenedor">
                <input type="text" className="deficitEntradaInput" placeholder="Describe tu comida (ej: 2 huevos y pan)..." value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={manejarTecla} disabled={cargando} />
            </div>
            {cargando && (
                <div className="deficitEntradaCargando">
                    <Loader2 size={14} className="deficitSpinner" />
                    <span>Analizando...</span>
                </div>
            )}
        </div>
    );
}

/* Componente eliminado - ahora HistorialCalorias muestra todas las comidas agrupadas por día */

/* Componente eliminado - ahora se usa HistorialCalorias */

export function PanelDeficitCalorico({renderHandleArrastre, handleMinimizar, onAbrirConfiguracion}: PanelDeficitCaloricoProps): JSX.Element {
    const [modoEnfoque, setModoEnfoque] = useState(false);
    const [logInspeccion, setLogInspeccion] = useState<string[] | null>(null);

    const {comidasHoy, caloriasHoy, tdee, deficit, apiKey, cargandoIA, errorIA, historial, registrarPorTexto, eliminarComida, datosUsuario} = useDeficitCalorico();

    /* Calcular totales de macros */
    const macros = useMemo(() => {
        return comidasHoy.reduce(
            (acc, c) => ({
                proteinas: acc.proteinas + (c.proteinas || 0),
                carbohidratos: acc.carbohidratos + (c.carbohidratos || 0),
                grasas: acc.grasas + (c.grasas || 0),
                azucar: acc.azucar + (c.azucar || 0)
            }),
            {proteinas: 0, carbohidratos: 0, grasas: 0, azucar: 0}
        );
    }, [comidasHoy]);

    /* Mensaje si no hay API Key configurada */
    const sinApiKey = !apiKey;

    const contenidoPanel = (
        <div className="deficitContenido">
            {sinApiKey && (
                <div className="deficitAviso">
                    <AlertCircle size={14} />
                    <span>Configura tu API Key de Gemini en Plugins → Déficit Calórico</span>
                </div>
            )}

            <ResumenNutricional calorias={caloriasHoy} tdee={tdee} proteinas={macros.proteinas} carbohidratos={macros.carbohidratos} grasas={macros.grasas} azucar={macros.azucar} datosUsuario={datosUsuario} />
            <EntradaComida onEnviarTexto={registrarPorTexto} cargando={cargandoIA} />

            {errorIA && (
                <div className="deficitError">
                    <AlertCircle size={12} />
                    <span>{errorIA}</span>
                </div>
            )}

            <HistorialCalorias comidas={[...comidasHoy, ...historial.flatMap(d => d.comidas)]} maxPorPagina={3} onEliminar={eliminarComida} onReintentar={registrarPorTexto} onInspeccionar={(log: string[]) => setLogInspeccion(log)} />
        </div>
    );

    return (
        <>
            <div id="panelDeficitCalorico" className="panelDeficitCalorico internaColumna">
                <SeccionEncabezado
                    icono={null}
                    titulo={renderHandleArrastre('Calorías') as any}
                    variante="panelHeader"
                    acciones={
                        <>
                            <Boton variante="ghost" claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirConfiguracion} title="Configuración" type="button">
                                <span className="selectorBadgeIcono">
                                    <Settings size={12} />
                                </span>
                            </Boton>
                            <Boton variante="ghost" claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setModoEnfoque(true)} title="Modo enfoque" type="button">
                                <span className="selectorBadgeIcono">
                                    <Maximize2 size={12} />
                                </span>
                            </Boton>
                            {handleMinimizar}
                        </>
                    }
                />

                {contenidoPanel}
            </div>

            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Calorías">
                <div className="panelDeficitCalorico internaColumna">{contenidoPanel}</div>
            </OverlayEnfoque>

            <ModalInspeccionIA estaAbierto={!!logInspeccion} onCerrar={() => setLogInspeccion(null)} log={logInspeccion || []} />
        </>
    );
}

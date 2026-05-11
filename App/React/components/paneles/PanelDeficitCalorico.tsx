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
import {Loader2, AlertCircle, Settings, Maximize2, ChevronLeft, ChevronRight} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {usePanelDeficitCalorico} from '../../hooks/dashboard/usePanelDeficitCalorico';
import {OverlayEnfoque} from '../shared';
import {Input} from '../ui/Input';
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

function formatearFechaVisible(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    const fecha = new Date(anio, (mes ?? 1) - 1, dia ?? 1, 12, 0, 0);
    return fecha.toLocaleDateString('es-ES', {weekday: 'short', day: '2-digit', month: 'short'});
}

/* Indicador visual de macros y objetivos */
function ResumenNutricional({
    calorias,
    proteinas,
    carbohidratos,
    grasas,
    azucar,
    tdee,
    datosUsuario,
    fechaActiva,
    onCambiarDia
}: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
    azucar: number;
    tdee: number | null;
    datosUsuario: DatosUsuarioTMB;
    fechaActiva: string;
    onCambiarDia: (delta: number) => void;
}): JSX.Element {
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

    const MetaBarra = ({label, actual, meta}: {label: string; actual: number; meta: number}) => {
        const porcentaje = Math.min((actual / meta) * 100, 100);
        const excedido = actual > meta;
        return (
            <div className="deficitMacroItem">
                <div className="deficitMacroHeader">
                    <span className="deficitMacroLabel">{label}</span>
                    <span className="deficitMacroValor">
                        {actual} / {meta}g
                    </span>
                </div>
                <div className="deficitMacroBarraFondo">
                    <div className={`deficitMacroBarraProgreso ${excedido ? 'deficitMacroBarraProgreso--excedido' : ''}`} style={{/* sentinel-disable inline-style-prohibido */ width: `${porcentaje}%`}} />
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
                <div className="deficitNavegacionFecha" role="group" aria-label="Cambiar día del resumen calórico">
                    <Boton variante="icono" claseAdicional="deficitNavegacionFechaBoton" onClick={() => onCambiarDia(-1)} title="Día anterior" type="button" icono={<ChevronLeft size={12} />} />
                    <span className="deficitNavegacionFechaTexto">{formatearFechaVisible(fechaActiva)}</span>
                    <Boton variante="icono" claseAdicional="deficitNavegacionFechaBoton" onClick={() => onCambiarDia(1)} title="Día siguiente" type="button" icono={<ChevronRight size={12} />} />
                </div>
                <div className="deficitCaloriasInfo">
                    <span className="deficitCaloriasValor">{calorias}</span>
                    <span className="deficitCaloriasMeta">/ {objetivos.calorias} kcal</span>
                </div>
                <span className="deficitCaloriasEstado" style={{/* sentinel-disable inline-style-prohibido */ color: caloriasRestantes < 0 ? 'var(--dashboard-estadoAlta)' : 'var(--dashboard-textoSecundario)'}}>
                    {estadoCalorias} (Meta: {datosUsuario.objetivoDeficit || 'moderado'})
                </span>
                <div className="deficitBarraGrandeFondo">
                    <div className="deficitBarraGrandeProgreso" style={{/* sentinel-disable inline-style-prohibido */ width: `${porcentajeCal}%`, backgroundColor: colorCalorias}} />
                </div>
            </div>

            {/* Grilla de Macros con colores locales del CSS */}
            <div className="deficitMacrosGrid">
                <MetaBarra label="Proteínas" actual={proteinas} meta={objetivos.proteinas} />
                <MetaBarra label="Carbohidratos" actual={carbohidratos} meta={objetivos.carbohidratos} />
                <MetaBarra label="Grasas" actual={grasas} meta={objetivos.grasas} />
                <MetaBarra label="Azúcar" actual={azucar} meta={objetivos.azucar} />
            </div>
        </div>
    );
}

/* Input de texto para registrar comidas */
function EntradaComida({onEnviarTexto, cargando, fechaActiva}: {onEnviarTexto: (texto: string, fecha: string) => void; cargando: boolean; fechaActiva: string}): JSX.Element {
    const [texto, setTexto] = useState('');

    const manejarEnviar = () => {
        const descripcion = texto.trim();
        if (!descripcion || cargando) return;
        onEnviarTexto(descripcion, fechaActiva);
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
                <Input tipo="text" claseAdicional="deficitEntradaInput" placeholder="Describe tu comida (ej: 2 huevos y pan)..." value={texto} onChange={e => setTexto((e.target as HTMLInputElement).value)} onKeyDown={manejarTecla} disabled={cargando} />
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
    const {
        modoEnfoque, setModoEnfoque,
        logInspeccion, setLogInspeccion,
        fechaActiva,
        caloriasDelDia, comidasTotales,
        tdee, cargandoIA, errorIA,
        registrarPorTexto, eliminarComida, datosUsuario,
        macros, sinApiKey,
        manejarCambiarDia
    } = usePanelDeficitCalorico();

    const contenidoPanel = (
        <div className="deficitContenido">
            {sinApiKey && (
                <div className="deficitAviso">
                    <AlertCircle size={14} />
                    <span>Configura Groq o DeepSeek en Configuración → Asistente IA</span>
                </div>
            )}

            <ResumenNutricional calorias={caloriasDelDia} tdee={tdee} proteinas={macros.proteinas} carbohidratos={macros.carbohidratos} grasas={macros.grasas} azucar={macros.azucar} datosUsuario={datosUsuario} fechaActiva={fechaActiva} onCambiarDia={manejarCambiarDia} />
            <EntradaComida onEnviarTexto={registrarPorTexto} cargando={cargandoIA} fechaActiva={fechaActiva} />

            {errorIA && (
                <div className="deficitError">
                    <AlertCircle size={12} />
                    <span>{errorIA}</span>
                </div>
            )}

            <HistorialCalorias comidas={comidasTotales} maxPorPagina={3} onEliminar={eliminarComida} onReintentar={prompt => registrarPorTexto(prompt, fechaActiva)} onInspeccionar={(log: string[]) => setLogInspeccion(log)} />
        </div>
    );

    return (
        <>
            <div id="panelDeficitCalorico" className="panelDeficitCalorico internaColumna">
                <SeccionEncabezado
                    icono={null}
                    titulo={renderHandleArrastre('Calorías')}
                    variante="panelHeader"
                    acciones={
                        <>
                            <Boton variante="badge" soloIcono onClick={onAbrirConfiguracion} title="Configuración" type="button" icono={<Settings size={12} />} />
                            <Boton variante="badge" soloIcono onClick={() => setModoEnfoque(true)} title="Modo enfoque" type="button" icono={<Maximize2 size={12} />} />
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

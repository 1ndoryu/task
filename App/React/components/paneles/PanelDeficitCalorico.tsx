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

import {useState, useRef} from 'react';
import {Camera, Loader2, Trash2, AlertCircle, Settings, Maximize2} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {useDeficitCalorico} from '../../hooks/useDeficitCalorico';
import {OverlayEnfoque} from '../shared';

interface PanelDeficitCaloricoProps {
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    onAbrirConfiguracion: () => void;
}

/* Indicador visual de déficit/superávit */
function ResumenDiario({calorias, tdee, deficit}: {calorias: number; tdee: number | null; deficit: number | null}): JSX.Element {
    const porcentaje = tdee ? Math.min((calorias / tdee) * 100, 150) : 0;
    const enDeficit = deficit !== null && deficit > 0;

    return (
        <div className="deficitResumen">
            <div className="deficitResumenNumeros">
                <div className="deficitResumenConsumo">
                    <span className="deficitResumenValor">{calorias}</span>
                    <span className="deficitResumenEtiqueta">consumidas</span>
                </div>
                {tdee && (
                    <>
                        <span className="deficitResumenSeparador">/</span>
                        <div className="deficitResumenTDEE">
                            <span className="deficitResumenValor">{tdee}</span>
                            <span className="deficitResumenEtiqueta">TDEE</span>
                        </div>
                    </>
                )}
            </div>

            {/* Barra de progreso */}
            {tdee && (
                <div className="deficitBarra">
                    <div
                        className={`deficitBarraProgreso ${enDeficit ? 'deficitBarraProgreso--deficit' : 'deficitBarraProgreso--superavit'}`}
                        style={{width: `${Math.min(porcentaje, 100)}%`}}
                    />
                </div>
            )}

            {deficit !== null && (
                <span className={`deficitResumenBalance ${enDeficit ? 'deficitResumenBalance--deficit' : 'deficitResumenBalance--superavit'}`}>
                    {enDeficit ? `Déficit: ${deficit} kcal` : `Superávit: ${Math.abs(deficit)} kcal`}
                </span>
            )}
        </div>
    );
}

/* Input de texto y foto para registrar comidas */
function EntradaComida({onEnviarTexto, onTomarFoto, cargando}: {onEnviarTexto: (texto: string) => void; onTomarFoto: (archivo: File) => void; cargando: boolean}): JSX.Element {
    const [texto, setTexto] = useState('');
    const inputFotoRef = useRef<HTMLInputElement>(null);

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

    const manejarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        if (archivo) {
            onTomarFoto(archivo);
            e.target.value = '';
        }
    };

    return (
        <div className="deficitEntrada">
            <div className="deficitEntradaInputContenedor">
                <input
                    type="text"
                    className="deficitEntradaInput"
                    placeholder="Describe tu comida..."
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    onKeyDown={manejarTecla}
                    disabled={cargando}
                />
                <button type="button" className="deficitEntradaBotonFoto" onClick={() => inputFotoRef.current?.click()} disabled={cargando} title="Tomar foto o seleccionar imagen">
                    <Camera size={16} />
                </button>
                <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="deficitEntradaInputOculto" onChange={manejarFoto} />
            </div>
            {cargando && (
                <div className="deficitEntradaCargando">
                    <Loader2 size={14} className="deficitSpinner" />
                    <span>Analizando con IA...</span>
                </div>
            )}
        </div>
    );
}

/* Lista de comidas registradas hoy */
function ListaComidas({comidas, onEliminar}: {comidas: Array<{id: string; descripcion: string; calorias: number; horaRegistro: number}>; onEliminar: (id: string) => void}): JSX.Element | null {
    if (comidas.length === 0) return null;

    return (
        <div className="deficitListaComidas">
            {comidas.map(comida => {
                const hora = new Date(comida.horaRegistro).toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'});
                return (
                    <div key={comida.id} className="deficitComidaItem">
                        <div className="deficitComidaInfo">
                            <span className="deficitComidaDesc">{comida.descripcion}</span>
                            <span className="deficitComidaHora">{hora}</span>
                        </div>
                        <div className="deficitComidaAcciones">
                            <span className="deficitComidaCalorias">{comida.calorias} kcal</span>
                            <button type="button" className="deficitComidaEliminar" onClick={() => onEliminar(comida.id)} title="Eliminar">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* Historial de los últimos 7 días */
function HistorialSemanal({historial}: {historial: Array<{fecha: string; totalCalorias: number; deficit: number}>}): JSX.Element | null {
    const ultimos7 = historial.slice(0, 7);
    if (ultimos7.length === 0) return null;

    return (
        <div className="deficitHistorial">
            <span className="deficitHistorialTitulo">Últimos días</span>
            <div className="deficitHistorialLista">
                {ultimos7.map(dia => {
                    const fecha = new Date(dia.fecha + 'T12:00:00');
                    const diaTexto = fecha.toLocaleDateString('es', {weekday: 'short', day: 'numeric'});
                    const enDeficit = dia.deficit > 0;

                    return (
                        <div key={dia.fecha} className="deficitHistorialItem">
                            <span className="deficitHistorialFecha">{diaTexto}</span>
                            <span className="deficitHistorialCalorias">{dia.totalCalorias} kcal</span>
                            <span className={`deficitHistorialBalance ${enDeficit ? 'deficitHistorialBalance--deficit' : 'deficitHistorialBalance--superavit'}`}>
                                {enDeficit ? `-${dia.deficit}` : `+${Math.abs(dia.deficit)}`}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function PanelDeficitCalorico({renderHandleArrastre, handleMinimizar, onAbrirConfiguracion}: PanelDeficitCaloricoProps): JSX.Element {
    const [modoEnfoque, setModoEnfoque] = useState(false);

    const {
        comidasHoy,
        caloriasHoy,
        tdee,
        deficit,
        apiKey,
        cargandoIA,
        errorIA,
        historial,
        registrarPorTexto,
        registrarPorFoto,
        eliminarComida
    } = useDeficitCalorico();

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

            <ResumenDiario calorias={caloriasHoy} tdee={tdee} deficit={deficit} />
            <EntradaComida onEnviarTexto={registrarPorTexto} onTomarFoto={registrarPorFoto} cargando={cargandoIA} />

            {errorIA && (
                <div className="deficitError">
                    <AlertCircle size={12} />
                    <span>{errorIA}</span>
                </div>
            )}

            <ListaComidas comidas={comidasHoy} onEliminar={eliminarComida} />
            <HistorialSemanal historial={historial} />
        </div>
    );

    return (
        <>
            <div id="panelDeficitCalorico" className="panelDeficitCalorico panelDashboard internaColumna">
                <SeccionEncabezado
                    icono={null}
                    titulo={renderHandleArrastre('Calorías') as any}
                    variante="panelHeader"
                    acciones={
                        <>
                            <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirConfiguracion} title="Configuración" type="button">
                                <span className="selectorBadgeIcono">
                                    <Settings size={12} />
                                </span>
                            </button>
                            <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setModoEnfoque(true)} title="Modo enfoque" type="button">
                                <span className="selectorBadgeIcono">
                                    <Maximize2 size={12} />
                                </span>
                            </button>
                            {handleMinimizar}
                        </>
                    }
                />

                {contenidoPanel}
            </div>

            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Calorías">
                <div className="panelDeficitCalorico panelDashboard internaColumna">{contenidoPanel}</div>
            </OverlayEnfoque>
        </>
    );
}

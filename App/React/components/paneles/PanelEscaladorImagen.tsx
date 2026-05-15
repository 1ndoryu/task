import {ImageUp, Loader2, RefreshCw, WandSparkles} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {Boton, Input, Select, Textarea} from '../ui';
import {ToggleSwitch} from '../shared/ToggleSwitch';
import {usePanelEscaladorImagen} from '../../hooks/paneles/usePanelEscaladorImagen';
import type {PanelBaseProps} from '../../types/paneles';

import '../../styles/dashboard/componentes/panelEscaladorImagen.css';

const OPCIONES_MODO = [
    {valor: 'creative', etiqueta: 'Creative'},
    {valor: 'precision', etiqueta: 'Precision'}
];

const OPCIONES_SCALE_CREATIVE = ['2x', '4x', '8x', '16x'].map(valor => ({valor, etiqueta: valor}));
const OPCIONES_SCALE_PRECISION = [2, 4, 8, 16].map(valor => ({valor, etiqueta: `${valor}x`}));
const OPCIONES_FLAVOR = [
    {valor: 'photo', etiqueta: 'Photo'},
    {valor: 'sublime', etiqueta: 'Sublime (ilustraciones)'},
    {valor: 'photo_denoiser', etiqueta: 'Photo Denoiser'}
];
const OPCIONES_PRESET = [
    {valor: 'standard', etiqueta: 'Standard'},
    {valor: 'soft_portraits', etiqueta: 'Soft portraits'},
    {valor: 'hard_portraits', etiqueta: 'Hard portraits'},
    {valor: 'art_n_illustration', etiqueta: 'Art & illustration'},
    {valor: 'videogame_assets', etiqueta: 'Videogame assets'},
    {valor: 'nature_n_landscapes', etiqueta: 'Nature & landscapes'},
    {valor: 'films_n_photography', etiqueta: 'Films & photography'},
    {valor: '3d_renders', etiqueta: '3D renders'},
    {valor: 'science_fiction_n_horror', etiqueta: 'Sci-fi & horror'}
];
const OPCIONES_ENGINE = ['automatic', 'magnific_illusio', 'magnific_sharpy', 'magnific_sparkle'].map(valor => ({valor, etiqueta: valor}));
const CAMPOS_CREATIVE = ['creativity', 'hdr', 'resemblance', 'fractality'] as const;
const CAMPOS_PRECISION = ['sharpen', 'smart_grain', 'ultra_detail'] as const;
type CampoNumericoMagnific = typeof CAMPOS_CREATIVE[number] | typeof CAMPOS_PRECISION[number];

export function PanelEscaladorImagen({renderHandleArrastre, handleMinimizar}: PanelBaseProps): JSX.Element {
    const {imagen, opciones, taskId, estado, resultadoUrl, error, cargando, puedeIniciar, costoEstimado, actualizarOpcion, cargarArchivo, iniciar, consultarEstado} = usePanelEscaladorImagen();

    const manejarNumero = (campo: CampoNumericoMagnific, valor: string) => {
        actualizarOpcion(campo, Number(valor));
    };

    return (
        <div className="internaColumna panelEscaladorImagen">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Escalar imagen')}
                subtitulo={taskId ? estado : undefined}
                variante="panelHeader"
                acciones={
                    <>
                        <Boton variante="badge" soloIcono onClick={() => consultarEstado()} disabled={!taskId || cargando} title="Consultar estado" icono={<RefreshCw size={12} />} />
                        {handleMinimizar}
                    </>
                }
            />

            <div className="escaladorImagenContenido">
                <Input tipo="file" accept="image/*" onChange={e => cargarArchivo((e.target as HTMLInputElement).files?.[0] ?? null)} />

                {imagen && (
                    <div className="escaladorImagenPreview">
                        <img src={imagen} alt="Imagen original" />
                    </div>
                )}

                <div className="escaladorImagenGrid">
                    <Select
                        value={opciones.mode}
                        opciones={OPCIONES_MODO}
                        onChange={e => {
                            const nuevoModo = e.target.value as 'creative' | 'precision';
                            actualizarOpcion('mode', nuevoModo);
                            actualizarOpcion('scale_factor', nuevoModo === 'creative' ? '2x' : 2);
                        }}
                    />
                    {opciones.mode === 'creative' ? (
                        <>
                            <Select value={String(opciones.scale_factor)} opciones={OPCIONES_SCALE_CREATIVE} onChange={e => actualizarOpcion('scale_factor', e.target.value)} />
                            <Select value={opciones.optimized_for} opciones={OPCIONES_PRESET} onChange={e => actualizarOpcion('optimized_for', e.target.value)} />
                            <Select value={opciones.engine} opciones={OPCIONES_ENGINE} onChange={e => actualizarOpcion('engine', e.target.value)} />
                        </>
                    ) : (
                        <>
                            <Select value={String(opciones.scale_factor)} opciones={OPCIONES_SCALE_PRECISION} onChange={e => actualizarOpcion('scale_factor', Number(e.target.value))} />
                            <Select value={opciones.flavor} opciones={OPCIONES_FLAVOR} onChange={e => actualizarOpcion('flavor', e.target.value)} />
                        </>
                    )}
                </div>

                {opciones.mode === 'creative' && <Textarea value={opciones.prompt} onChange={e => actualizarOpcion('prompt', e.target.value)} placeholder="Prompt opcional para guiar el escalado" filas={2} />}

                <div className="escaladorImagenAjustes">
                    {(opciones.mode === 'creative' ? CAMPOS_CREATIVE : CAMPOS_PRECISION).map(campo => (
                        <label key={campo} className="escaladorImagenAjuste">
                            <span>{campo}</span>
                            <Input tipo="number" min={opciones.mode === 'creative' ? -10 : 0} max={opciones.mode === 'creative' ? 10 : 100} value={opciones[campo]} onChange={e => manejarNumero(campo, (e.target as HTMLInputElement).value)} />
                        </label>
                    ))}
                </div>

                <label className="escaladorImagenToggle">
                    <span>Filtro NSFW</span>
                    <ToggleSwitch checked={opciones.filter_nsfw} onChange={valor => actualizarOpcion('filter_nsfw', valor)} />
                </label>

                {costoEstimado !== null && (
                    <div className="escaladorCosto">
                        <span>Costo estimado</span>
                        <span className="escaladorCostoValor">≈ €{costoEstimado.toFixed(2)}</span>
                    </div>
                )}

                {error && <div className="escaladorImagenError">{error}</div>}

                <Boton type="button" variante="primario" onClick={iniciar} disabled={!puedeIniciar} icono={cargando ? <Loader2 size={14} className="animacionGirar" /> : <WandSparkles size={14} />}>
                    Escalar
                </Boton>

                {resultadoUrl && (
                    <a className="escaladorImagenResultado" href={resultadoUrl} target="_blank" rel="noreferrer">
                        <ImageUp size={14} />
                        <span>Abrir resultado</span>
                    </a>
                )}
            </div>
        </div>
    );
}
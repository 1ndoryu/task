/*
 * Scratchpad
 * Componente para notas rápidas
 * Responsabilidad única: renderizar área de texto para notas
 * Lógica extraída a useScratchpad hook
 */

import type {TamanoFuente, AlturaScratchpad} from '../../hooks/useConfiguracionScratchpad';
import {useScratchpad} from '../../hooks/dashboard/useScratchpad';

interface ScratchpadProps {
    valorInicial?: string;
    placeholder?: string;
    onChange?: (valor: string) => void;
    delayGuardado?: number;
    tamanoFuente?: TamanoFuente;
    altura?: AlturaScratchpad;
    onCambiarAltura?: (altura: string) => void;
    modoVista?: 'editor' | 'preview';
    mostrarResaltadoMarkdown?: boolean;
    mostrarResizeHandle?: boolean;
}

export function Scratchpad({valorInicial = '', placeholder = '// Escribe tus notas rapidas aqui...', onChange, delayGuardado = 1500, tamanoFuente = 'normal', altura = '100%', onCambiarAltura, modoVista = 'editor', mostrarResaltadoMarkdown = true, mostrarResizeHandle = true}: ScratchpadProps): JSX.Element {
    const {
        textareaRef, resaltadoRef, editorRef,
        valor, estadoGuardado, isResizing, localHeight, limiteCaracteres,
        caracteresUsados, cercaDelLimite, enLimite,
        contenidoResaltado, contenidoPreview,
        manejarCambio, manejarScroll, manejarTecla, handleMouseDown
    } = useScratchpad({valorInicial, onChange, delayGuardado, altura, onCambiarAltura, mostrarResaltadoMarkdown});

    return (
        <div id="scratchpad" className="scratchpadContenedor">
            <div className={`dashboardPanel scratchpadPanel ${isResizing ? 'scratchpadResizing' : ''}`}>
                <div className="scratchpadBarra"></div>
                <div className="scratchpadBarra"></div>
                {modoVista === 'editor' ? (
                    <div 
                        ref={editorRef}
                        className="scratchpadEditor"
                        style={{
                            height: localHeight !== '100%' ? localHeight : undefined
                        }}
                    >
                        {mostrarResaltadoMarkdown && (
                            <div
                                ref={resaltadoRef}
                                className={`scratchpadResaltado scratchpadFuente-${tamanoFuente}`}
                                dangerouslySetInnerHTML={{__html: contenidoResaltado}}
                            />
                        )}
                        <textarea
                            ref={textareaRef}
                            className={`scratchpadTextarea scratchpadFuente-${tamanoFuente} ${mostrarResaltadoMarkdown ? 'scratchpadTextarea--resaltado' : ''}`}
                            placeholder={placeholder}
                            value={valor}
                            onChange={manejarCambio}
                            onScroll={manejarScroll}
                            onKeyDown={manejarTecla}
                            maxLength={limiteCaracteres}
                        />
                    </div>
                ) : (
                    <div
                        className={`scratchpadVistaPrevia scratchpadFuente-${tamanoFuente}`}
                        style={{
                            height: localHeight,
                            flex: localHeight === '100%' && !isResizing ? '1' : 'none'
                        }}
                        dangerouslySetInnerHTML={{__html: contenidoPreview}}
                    />
                )}

                {modoVista === 'editor' && (
                    <div className="scratchpadBarraEstado">
                        <div className={`scratchpadEstado ${estadoGuardado !== 'inactivo' ? 'scratchpadEstadoVisible' : ''}`}>
                            {estadoGuardado === 'guardando' && (
                                <span className="scratchpadGuardando">
                                    <span className="scratchpadSpinner"></span>
                                    Guardando...
                                </span>
                            )}
                            {estadoGuardado === 'guardado' && <span className="scratchpadGuardado">Guardado</span>}
                        </div>

                        <span className={`scratchpadContador ${cercaDelLimite ? 'scratchpadContadorAdvertencia' : ''} ${enLimite ? 'scratchpadContadorLimite' : ''}`}>
                            {caracteresUsados.toLocaleString()}/{limiteCaracteres.toLocaleString()}
                        </span>
                    </div>
                )}
            </div>
            {mostrarResizeHandle && (
                <div className="scratchpadResizeHandle" onMouseDown={handleMouseDown} title="Arrastrar para cambiar altura">
                    <div className="scratchpadResizeLine"></div>
                </div>
            )}
        </div>
    );
}

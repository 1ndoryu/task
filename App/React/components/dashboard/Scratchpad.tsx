/*
 * Scratchpad
 * Componente para notas rápidas
 * Responsabilidad única: área de texto para notas con guardado automático
 * Incluye límite de caracteres y contador visual
 */

import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {useDebounceCallback} from '../../hooks/useDebounce';
import type {TamanoFuente, AlturaScratchpad} from '../../hooks/useConfiguracionScratchpad';

/* Límite de caracteres para el scratchpad */
const LIMITE_CARACTERES = 20000;
const UMBRAL_ADVERTENCIA = 0.9; /* 90% del límite */

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

type EstadoGuardado = 'guardado' | 'guardando' | 'inactivo';

const escaparHtml = (texto: string): string => {
    return texto.replace(/[&<>"]/g, caracter => {
        switch (caracter) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            default:
                return caracter;
        }
    });
};

const formatearInlineMarkdown = (texto: string): string => {
    let resultado = texto;
    resultado = resultado.replace(/`([^`]+)`/g, '<span class="scratchpadTextoCodigo">`$1`</span>');
    resultado = resultado.replace(/\*\*([^*]+)\*\*/g, '<span class="scratchpadTextoNegrita">**$1**</span>');
    resultado = resultado.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<span class="scratchpadTextoCursiva">*$2*</span>');
    return resultado;
};

const resaltarMarkdownEnEditor = (texto: string): string => {
    const lineas = texto.split('\n');
    return lineas
        .map(linea => {
            const escapado = escaparHtml(linea);
            const esTitulo = /^#{1,6}\s/.test(escapado);
            if (esTitulo) {
                return `<span class="scratchpadTextoTitulo">${formatearInlineMarkdown(escapado)}</span>` || '&#8203;';
            }
            let resultado = escapado.replace(/^(-\s\[( |x|X)\]\s)/, '<span class="scratchpadTextoChecklist">$1</span>');
            resultado = resultado.replace(/^(-\s)/, '<span class="scratchpadTextoLista">$1</span>');
            resultado = formatearInlineMarkdown(resultado);
            return resultado || '&#8203;';
        })
        .join('<br />');
};

const renderizarMarkdownVistaPrevia = (texto: string): string => {
    const lineas = texto.split('\n');
    let html = '';
    let listaActiva = false;

    const cerrarLista = () => {
        if (listaActiva) {
            html += '</ul>';
            listaActiva = false;
        }
    };

    lineas.forEach(linea => {
        const headingMatch = /^(#{1,6})\s+(.*)/.exec(linea);
        if (headingMatch) {
            cerrarLista();
            const nivel = headingMatch[1].length;
            const contenido = formatearInlineMarkdown(escaparHtml(headingMatch[2] || ''));
            html += `<h${nivel} class="scratchpadVistaPreviaTitulo scratchpadVistaPreviaTitulo--h${nivel}">${contenido}</h${nivel}>`;
            return;
        }

        const checklistMatch = /^-\s\[( |x|X)\]\s+(.*)/.exec(linea);
        if (checklistMatch) {
            if (!listaActiva) {
                html += '<ul class="scratchpadVistaPreviaLista">';
                listaActiva = true;
            }
            const marcado = checklistMatch[1].toLowerCase() === 'x' ? '[x]' : '[ ]';
            const contenido = formatearInlineMarkdown(escaparHtml(checklistMatch[2] || ''));
            html += `<li><span class="scratchpadVistaPreviaChecklist">${marcado}</span> ${contenido}</li>`;
            return;
        }

        const listaMatch = /^-\s+(.*)/.exec(linea);
        if (listaMatch) {
            if (!listaActiva) {
                html += '<ul class="scratchpadVistaPreviaLista">';
                listaActiva = true;
            }
            const contenido = formatearInlineMarkdown(escaparHtml(listaMatch[1] || ''));
            html += `<li>${contenido}</li>`;
            return;
        }

        cerrarLista();

        if (!linea.trim()) {
            html += '<div class="scratchpadVistaPreviaEspacio"></div>';
            return;
        }

        html += `<p class="scratchpadVistaPreviaParrafo">${formatearInlineMarkdown(escaparHtml(linea))}</p>`;
    });

    cerrarLista();

    return html || '<p class="scratchpadVistaPreviaParrafo">&nbsp;</p>';
};

export function Scratchpad({valorInicial = '', placeholder = '// Escribe tus notas rapidas aqui...', onChange, delayGuardado = 1500, tamanoFuente = 'normal', altura = '100%', onCambiarAltura, modoVista = 'editor', mostrarResaltadoMarkdown = true, mostrarResizeHandle = true}: ScratchpadProps): JSX.Element {
    const [valor, setValor] = useState(valorInicial);
    const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>('inactivo');

    /* Estados para resizing */
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const resaltadoRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [localHeight, setLocalHeight] = useState<string>(altura);

    /* Sincronizar altura si no se está redimensionando */
    useEffect(() => {
        if (!isResizing) {
            setLocalHeight(altura);
        }
    }, [altura, isResizing]);

    /*
     * Sincronizar con valor externo cuando cambia el valorInicial.
     * Esto ocurre cuando el usuario selecciona otra nota desde el modal.
     */
    const prevValorInicialRef = useRef(valorInicial);

    useEffect(() => {
        if (valorInicial !== prevValorInicialRef.current) {
            prevValorInicialRef.current = valorInicial;
            setValor(valorInicial);
            setEstadoGuardado('inactivo');
        }
    }, [valorInicial]);

    /* Callback debounceado para guardar */
    const guardarNotas = useCallback(
        (nuevoValor: string) => {
            onChange?.(nuevoValor);
            setEstadoGuardado('guardado');

            /* Ocultar indicador después de 2 segundos */
            setTimeout(() => {
                setEstadoGuardado('inactivo');
            }, 2000);
        },
        [onChange]
    );

    const {ejecutar: guardarConDebounce} = useDebounceCallback(guardarNotas, delayGuardado);

    const actualizarValor = useCallback(
        (nuevoValor: string) => {
            setValor(nuevoValor);
            setEstadoGuardado('guardando');
            guardarConDebounce(nuevoValor);
        },
        [guardarConDebounce]
    );

    const manejarCambio = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        let nuevoValor = e.target.value;

        /* Truncar si excede el límite */
        if (nuevoValor.length > LIMITE_CARACTERES) {
            nuevoValor = nuevoValor.slice(0, LIMITE_CARACTERES);
        }

        actualizarValor(nuevoValor);
    };

    const manejarScroll = () => {
        if (resaltadoRef.current && textareaRef.current) {
            resaltadoRef.current.scrollTop = textareaRef.current.scrollTop;
            resaltadoRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    /*
     * Sincronizar el ancho del div de resaltado con el textarea
     * Esto es necesario cuando hay líneas largas que causan scroll horizontal
     */
    useEffect(() => {
        const textarea = textareaRef.current;
        const resaltado = resaltadoRef.current;
        if (!textarea || !resaltado || !mostrarResaltadoMarkdown) return;

        const sincronizarAncho = () => {
            if (textarea.scrollWidth > textarea.clientWidth) {
                resaltado.style.width = `${textarea.scrollWidth}px`;
            } else {
                resaltado.style.width = '100%';
            }
        };

        sincronizarAncho();
        
        const resizeObserver = new ResizeObserver(sincronizarAncho);
        resizeObserver.observe(textarea);

        return () => resizeObserver.disconnect();
    }, [valor, mostrarResaltadoMarkdown]);

    const aplicarFormato = useCallback(
        (marcador: string) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            const inicio = textarea.selectionStart;
            const fin = textarea.selectionEnd;
            const seleccion = valor.slice(inicio, fin);
            const nuevoValor = `${valor.slice(0, inicio)}${marcador}${seleccion}${marcador}${valor.slice(fin)}`;
            const nuevaPosicionInicio = inicio + marcador.length;
            const nuevaPosicionFin = fin + marcador.length;

            actualizarValor(nuevoValor);

            requestAnimationFrame(() => {
                const actual = textareaRef.current;
                if (!actual) return;
                actual.selectionStart = nuevaPosicionInicio;
                actual.selectionEnd = nuevaPosicionFin;
            });
        },
        [actualizarValor, valor]
    );

    const manejarTecla = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                aplicarFormato('**');
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                aplicarFormato('*');
                return;
            }

            if (e.key === 'Enter') {
                const textarea = textareaRef.current;
                if (!textarea) return;
                const inicio = textarea.selectionStart;
                const texto = valor;
                const inicioLinea = texto.lastIndexOf('\n', inicio - 1) + 1;
                const finLinea = texto.indexOf('\n', inicio);
                const limiteLinea = finLinea === -1 ? texto.length : finLinea;
                const lineaActual = texto.slice(inicioLinea, limiteLinea);
                const matchChecklist = /^-\s\[( |x|X)\]\s/.exec(lineaActual);
                const matchLista = /^-\s/.exec(lineaActual);

                if (matchChecklist || matchLista) {
                    e.preventDefault();
                    const prefijo = matchChecklist ? matchChecklist[0] : matchLista ? matchLista[0] : '';
                    const contenidoSinPrefijo = lineaActual.replace(prefijo, '').trim();
                    let nuevoValor = '';
                    let nuevaPosicion = inicio + 1;

                    if (!contenidoSinPrefijo) {
                        nuevoValor = `${texto.slice(0, inicioLinea)}\n${texto.slice(limiteLinea)}`;
                        nuevaPosicion = inicioLinea + 1;
                    } else {
                        nuevoValor = `${texto.slice(0, inicio)}\n${prefijo}${texto.slice(inicio)}`;
                        nuevaPosicion = inicio + 1 + prefijo.length;
                    }

                    actualizarValor(nuevoValor);

                    requestAnimationFrame(() => {
                        const actual = textareaRef.current;
                        if (!actual) return;
                        actual.selectionStart = nuevaPosicion;
                        actual.selectionEnd = nuevaPosicion;
                    });
                }
            }
        },
        [aplicarFormato, actualizarValor, valor]
    );

    // Manejo del Resizing
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startY = e.clientY;
        const startHeight = textareaRef.current?.getBoundingClientRect().height || 300;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.clientY - startY;
            // Limitar entre 100px y 600px según requerimiento
            const newHeight = Math.min(600, Math.max(100, startHeight + deltaY));
            setLocalHeight(`${newHeight}px`);
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            setIsResizing(false);

            // Calcular altura final con los mismos límites
            const deltaY = upEvent.clientY - startY;
            const finalHeight = Math.min(600, Math.max(100, startHeight + deltaY));

            if (onCambiarAltura) {
                onCambiarAltura(`${finalHeight}px`);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    /* Calcular estado del contador */
    const caracteresUsados = valor.length;
    const porcentajeUso = caracteresUsados / LIMITE_CARACTERES;
    const cercaDelLimite = porcentajeUso >= UMBRAL_ADVERTENCIA;
    const enLimite = caracteresUsados >= LIMITE_CARACTERES;

    const contenidoResaltado = useMemo(() => (mostrarResaltadoMarkdown ? resaltarMarkdownEnEditor(valor) : ''), [mostrarResaltadoMarkdown, valor]);
    const contenidoPreview = useMemo(() => renderizarMarkdownVistaPrevia(valor), [valor]);

    return (
        <div id="scratchpad" className="scratchpadContenedor">
            <div className={`dashboardPanel scratchpadPanel ${isResizing ? 'scratchpadResizing' : ''}`}>
                <div className="scratchpadBarra"></div>
                <div className="scratchpadBarra"></div>
                {modoVista === 'editor' ? (
                    <div className="scratchpadEditor">
                        {mostrarResaltadoMarkdown && (
                            <div
                                ref={resaltadoRef}
                                className={`scratchpadResaltado scratchpadFuente-${tamanoFuente}`}
                                style={{
                                    height: localHeight,
                                    flex: localHeight === '100%' && !isResizing ? '1' : 'none',
                                    transition: isResizing ? 'none' : undefined
                                }}
                                dangerouslySetInnerHTML={{__html: contenidoResaltado}}
                            />
                        )}
                        <textarea
                            ref={textareaRef}
                            className={`scratchpadTextarea scratchpadFuente-${tamanoFuente} ${mostrarResaltadoMarkdown ? 'scratchpadTextarea--resaltado' : ''}`}
                            style={{
                                height: localHeight,
                                flex: localHeight === '100%' && !isResizing ? '1' : 'none',
                                transition: isResizing ? 'none' : undefined
                            }}
                            placeholder={placeholder}
                            value={valor}
                            onChange={manejarCambio}
                            onScroll={manejarScroll}
                            onKeyDown={manejarTecla}
                            maxLength={LIMITE_CARACTERES}
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
                            {caracteresUsados.toLocaleString()}/{LIMITE_CARACTERES.toLocaleString()}
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

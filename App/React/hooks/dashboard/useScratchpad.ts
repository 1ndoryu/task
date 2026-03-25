/*
 * useScratchpad
 * Hook que encapsula toda la lógica del componente Scratchpad (notas rápidas)
 * Maneja: estado del texto, guardado automático con debounce, resizing,
 * formato markdown, límites de caracteres y atajos de teclado
 */

import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {useDebounceCallback} from '../useDebounce';
import type {AlturaScratchpad} from '../useConfiguracionScratchpad';
import {useSuscripcionStore} from '../../stores/suscripcionStore';

/* Límites de caracteres según plan */
const LIMITE_CARACTERES_FREE = 20000;
const LIMITE_CARACTERES_PREMIUM = 1000000;
const UMBRAL_ADVERTENCIA = 0.9;

type EstadoGuardado = 'guardado' | 'guardando' | 'inactivo';

/* Hook auxiliar para obtener límite según suscripción */
const useLimiteCaracteres = () => {
    const esPremium = useSuscripcionStore(s => s.esPremium());
    return esPremium ? LIMITE_CARACTERES_PREMIUM : LIMITE_CARACTERES_FREE;
};

/* Funciones puras de procesamiento de markdown */
const escaparHtml = (texto: string): string => {
    return texto.replace(/[&<>"]/g, caracter => {
        switch (caracter) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            default: return caracter;
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

export interface UseScratchpadParams {
    valorInicial?: string;
    onChange?: (valor: string) => void;
    delayGuardado?: number;
    altura?: AlturaScratchpad;
    onCambiarAltura?: (altura: string) => void;
    mostrarResaltadoMarkdown?: boolean;
}

export function useScratchpad({
    valorInicial = '',
    onChange,
    delayGuardado = 1500,
    altura = '100%',
    onCambiarAltura,
    mostrarResaltadoMarkdown = true
}: UseScratchpadParams) {
    const limiteCaracteres = useLimiteCaracteres();
    const [valor, setValor] = useState(valorInicial);
    const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>('inactivo');

    /* Refs del editor */
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const resaltadoRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    /* Estado para resizing */
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

    const manejarCambio = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            let nuevoValor = e.target.value;
            if (nuevoValor.length > limiteCaracteres) {
                nuevoValor = nuevoValor.slice(0, limiteCaracteres);
            }
            actualizarValor(nuevoValor);
        },
        [limiteCaracteres, actualizarValor]
    );

    const manejarScroll = useCallback(() => {
        if (resaltadoRef.current && textareaRef.current) {
            resaltadoRef.current.scrollTop = textareaRef.current.scrollTop;
            resaltadoRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, []);

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

    /* Manejo del Resizing */
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);

            const startY = e.clientY;
            const startHeight = editorRef.current?.getBoundingClientRect().height || 300;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaY = moveEvent.clientY - startY;
                const newHeight = Math.min(1000, Math.max(100, startHeight + deltaY));
                setLocalHeight(`${newHeight}px`);
            };

            const handleMouseUp = (upEvent: MouseEvent) => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                setIsResizing(false);

                const deltaY = upEvent.clientY - startY;
                const finalHeight = Math.min(1000, Math.max(100, startHeight + deltaY));

                if (onCambiarAltura) {
                    onCambiarAltura(`${finalHeight}px`);
                }
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [onCambiarAltura]
    );

    /* Valores calculados del contador */
    const caracteresUsados = valor.length;
    const porcentajeUso = caracteresUsados / limiteCaracteres;
    const cercaDelLimite = porcentajeUso >= UMBRAL_ADVERTENCIA;
    const enLimite = caracteresUsados >= limiteCaracteres;

    const contenidoResaltado = useMemo(() => (mostrarResaltadoMarkdown ? resaltarMarkdownEnEditor(valor) : ''), [mostrarResaltadoMarkdown, valor]);
    const contenidoPreview = useMemo(() => renderizarMarkdownVistaPrevia(valor), [valor]);

    return {
        /* Refs */
        textareaRef, resaltadoRef, editorRef,
        /* Estado */
        valor, estadoGuardado, isResizing, localHeight, limiteCaracteres,
        /* Computed */
        caracteresUsados, porcentajeUso, cercaDelLimite, enLimite,
        contenidoResaltado, contenidoPreview,
        /* Handlers */
        manejarCambio, manejarScroll, manejarTecla, handleMouseDown
    };
}

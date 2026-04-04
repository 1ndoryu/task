/*
 * ConfiguracionMCPCopiable
 * Bloque de código JSON con botón de copiar
 * Responsabilidad única: mostrar código y facilitar copiado
 */

import {useState, useCallback} from 'react';
import {Copy, Check} from 'lucide-react';
import {Boton} from '../ui';

interface ConfiguracionMCPCopiableProps {
    titulo: string;
    codigo: string;
}

export function ConfiguracionMCPCopiable({titulo, codigo}: ConfiguracionMCPCopiableProps): JSX.Element {
    const [copiado, setCopiado] = useState(false);

    const manejarCopiar = useCallback(async () => {
        try {
            /* Intentar con la API moderna del clipboard */
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(codigo);
            } else {
                /* Fallback para HTTP/localhost sin HTTPS */
                const textArea = document.createElement('textarea');
                textArea.value = codigo;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const exitoso = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (!exitoso) {
                    throw new Error('execCommand falló');
                }
            }

            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        // sentinel-disable-next-line fallo-sin-feedback — tiene alert() como feedback
        } catch (error) {
            console.error('Error al copiar:', error);
            /* Mostrar alerta como último recurso */
            alert('No se pudo copiar automáticamente. Por favor, selecciona el texto manualmente y usa Ctrl+C.');
        }
    }, [codigo]);

    return (
        <div className="mcpCodigo">
            <div className="mcpCodigo__encabezado">
                <span className="mcpCodigo__titulo">{titulo}</span>
                <Boton type="button" claseAdicional={`mcpCodigo__botonCopiar ${copiado ? 'mcpCodigo__botonCopiar--copiado' : ''}`} onClick={manejarCopiar}>
                    {copiado ? (
                        <>
                            <Check size={12} />
                            <span>Copiado</span>
                        </>
                    ) : (
                        <>
                            <Copy size={12} />
                            <span>Copiar</span>
                        </>
                    )}
                </Boton>
            </div>
            <div className="mcpCodigo__contenido">
                <pre className="mcpCodigo__pre">{codigo}</pre>
            </div>
        </div>
    );
}

/*
 * ConfiguracionMCPCopiable
 * Bloque de código JSON con botón de copiar
 * Responsabilidad única: mostrar código y facilitar copiado
 */

import {useState, useCallback} from 'react';
import {Copy, Check} from 'lucide-react';

interface ConfiguracionMCPCopiableProps {
    titulo: string;
    codigo: string;
}

export function ConfiguracionMCPCopiable({titulo, codigo}: ConfiguracionMCPCopiableProps): JSX.Element {
    const [copiado, setCopiado] = useState(false);

    const manejarCopiar = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(codigo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch (error) {
            console.error('Error al copiar:', error);
        }
    }, [codigo]);

    return (
        <div className="mcpCodigo">
            <div className="mcpCodigo__encabezado">
                <span className="mcpCodigo__titulo">{titulo}</span>
                <button type="button" className={`mcpCodigo__botonCopiar ${copiado ? 'mcpCodigo__botonCopiar--copiado' : ''}`} onClick={manejarCopiar}>
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
                </button>
            </div>
            <div className="mcpCodigo__contenido">
                <pre className="mcpCodigo__pre">{codigo}</pre>
            </div>
        </div>
    );
}

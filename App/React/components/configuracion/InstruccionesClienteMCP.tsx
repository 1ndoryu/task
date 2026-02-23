/*
 * InstruccionesClienteMCP
 * Instrucciones de configuración para cada cliente MCP
 * Responsabilidad única: mostrar pasos de configuración por cliente
 */

import {FileCode, Folder} from 'lucide-react';
import {ConfiguracionMCPCopiable} from './ConfiguracionMCPCopiable';

type TipoCliente = 'claude' | 'cursor';

interface InstruccionesClienteMCPProps {
    cliente: TipoCliente;
    jsonConfiguracion: string;
    token: string;
}

const INSTRUCCIONES: Record<
    TipoCliente,
    {
        titulo: string;
        pasos: string[];
        ruta: string;
        rutaLabel: string;
    }
> = {
    claude: {
        titulo: 'Claude Desktop',
        pasos: ['Abre el archivo de configuración de Claude Desktop', 'Añade la configuración del servidor MCP al objeto "mcpServers"', 'Guarda el archivo y reinicia Claude Desktop', 'Verifica que el servidor aparezca en la lista de herramientas'],
        ruta: '%APPDATA%\\Claude\\claude_desktop_config.json',
        rutaLabel: 'Archivo de configuración'
    },
    cursor: {
        titulo: 'Cursor IDE',
        pasos: ['En la raíz de tu proyecto, crea la carpeta .cursor si no existe', 'Crea o edita el archivo mcp.json dentro de .cursor', 'Añade la configuración del servidor MCP', 'Reinicia Cursor para que cargue la configuración'],
        ruta: '.cursor/mcp.json',
        rutaLabel: 'Archivo de configuración'
    }
};

export function InstruccionesClienteMCP({cliente, jsonConfiguracion, token}: InstruccionesClienteMCPProps): JSX.Element {
    const instrucciones = INSTRUCCIONES[cliente];

    /* Reemplazar placeholder del token en el JSON */
    const jsonConToken = jsonConfiguracion.replace('"TOKEN_PLACEHOLDER"', `"${token}"`);

    return (
        <div className="mcpInstrucciones">
            <h4 className="mcpInstrucciones__titulo">
                <FileCode size={14} />
                Configuración para {instrucciones.titulo}
            </h4>

            <ol className="mcpInstrucciones__lista">
                {instrucciones.pasos.map((paso) => (
                    <li key={paso}>{paso}</li>
                ))}
            </ol>

            <div className="mcpInstrucciones__ruta">
                <Folder size={12} />
                <span className="mcpInstrucciones__rutaEtiqueta">{instrucciones.rutaLabel}:</span>
                <span className="mcpInstrucciones__rutaValor">{instrucciones.ruta}</span>
            </div>

            <ConfiguracionMCPCopiable titulo={`${instrucciones.titulo} - mcp.json`} codigo={jsonConToken} />
        </div>
    );
}

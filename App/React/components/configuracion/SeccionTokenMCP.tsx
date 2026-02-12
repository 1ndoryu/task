/*
 * SeccionTokenMCP
 * Gestión del token de acceso MCP
 * Responsabilidad única: generar, mostrar y revocar token
 */

import {useState} from 'react';
import {Key, Eye, EyeOff, Copy, Check, Trash2, RefreshCw, AlertTriangle} from 'lucide-react';
import {Boton} from '../shared/Boton';
import {Input} from '../ui/Input';

interface SeccionTokenMCPProps {
    tokenExiste: boolean;
    tokenGenerado: string | null;
    fechaCreacion: string | null;
    cargando: boolean;
    onGenerarToken: () => Promise<void>;
    onRevocarToken: () => Promise<void>;
}

export function SeccionTokenMCP({tokenExiste, tokenGenerado, fechaCreacion, cargando, onGenerarToken, onRevocarToken}: SeccionTokenMCPProps): JSX.Element {
    const [mostrarToken, setMostrarToken] = useState(false);
    const [copiado, setCopiado] = useState(false);

    const manejarCopiarToken = async () => {
        if (!tokenGenerado) return;
        try {
            await navigator.clipboard.writeText(tokenGenerado);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch (error) {
            console.error('Error al copiar token:', error);
        }
    };

    const formatearFecha = (fecha: string | null) => {
        if (!fecha) return '';
        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="mcpSeccionToken">
            {/* Estado del token */}
            <div className={`mcpSeccionToken__estado ${tokenExiste ? 'mcpSeccionToken__estado--activo' : 'mcpSeccionToken__estado--inactivo'}`}>
                <Key size={14} />
                <span className="mcpSeccionToken__estadoTexto">{tokenExiste ? 'Token de acceso activo' : 'Sin token generado'}</span>
                {fechaCreacion && <span className="mcpSeccionToken__estadoFecha">Creado: {formatearFecha(fechaCreacion)}</span>}
            </div>

            {/* Campo de token (solo visible si se acaba de generar) */}
            {tokenGenerado && (
                <>
                    <div className="mcpAdvertencia">
                        <AlertTriangle size={16} className="mcpAdvertencia__icono" />
                        <p className="mcpAdvertencia__texto">
                            <strong>Guarda este token ahora.</strong> Por seguridad, no se mostrará de nuevo. Si lo pierdes, deberás generar uno nuevo.
                        </p>
                    </div>

                    <div className="mcpCampoToken">
                        <Input tipo={mostrarToken ? 'text' : 'password'} value={tokenGenerado} readOnly claseAdicional="mcpCampoToken__input" />
                        <Boton type="button" claseAdicional="mcpCampoToken__boton" onClick={() => setMostrarToken(!mostrarToken)} title={mostrarToken ? 'Ocultar token' : 'Mostrar token'}>
                            {mostrarToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Boton>
                        <Boton type="button" claseAdicional="mcpCampoToken__boton" onClick={manejarCopiarToken} title="Copiar token">
                            {copiado ? <Check size={14} /> : <Copy size={14} />}
                        </Boton>
                    </div>
                </>
            )}

            {/* Acciones */}
            <div className="mcpAccionesToken">
                {!tokenExiste ? (
                    <Boton type="button" claseAdicional="mcpBotonGenerar" onClick={onGenerarToken} disabled={cargando}>
                        {cargando ? (
                            <>
                                <RefreshCw size={14} className="iconoGirando" />
                                <span>Generando...</span>
                            </>
                        ) : (
                            <>
                                <Key size={14} />
                                <span>Generar Token de Acceso</span>
                            </>
                        )}
                    </Boton>
                ) : (
                    <Boton type="button" claseAdicional="mcpBotonRevocar" onClick={onRevocarToken} disabled={cargando}>
                        <Trash2 size={14} />
                        <span>Revocar Token</span>
                    </Boton>
                )}
            </div>
        </div>
    );
}

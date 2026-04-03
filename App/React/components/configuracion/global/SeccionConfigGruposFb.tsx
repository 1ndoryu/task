/* [263A-5] Sección de configuración para Grupos FB
 * Gestión de token de API para la extensión del navegador.
 * [034A-17] Añadido control de duración de "publicado recientemente". */

import {Key, Copy, RefreshCw, Check, Clock} from 'lucide-react';
import {Boton, Input} from '../../ui';
import {useSeccionConfigGruposFb} from '../../../hooks/configuracion/useSeccionConfigGruposFb';

export function SeccionConfigGruposFb(): JSX.Element {
    const {token, tieneToken, cargando, copiado, error, apiUrl, publicadoHoras, guardandoConfig, verificarToken, generarToken, copiarToken, guardarPublicadoHoras} = useSeccionConfigGruposFb();

    return (
        <div className="contenedorOpcionesConfig">
            {/* Explicación */}
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Token de API</span>
                    <span className="descripcionOpcionConfig">
                        La extensión FB Group Manager necesita un token para enviar grupos detectados a este dashboard.
                    </span>
                </div>
            </div>
            <div className="separadorOpcionesConfig" />

            {/* Estado del token */}
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig" style={{gap: '8px'}}>
                    {tieneToken === null && !cargando && (
                        <Boton variante="ghost" onClick={verificarToken} icono={<Key size={14} />}>
                            Verificar token existente
                        </Boton>
                    )}

                    {cargando && (
                        <span className="descripcionOpcionConfig">
                            <RefreshCw size={12} className="animacionGirar" /> Procesando...
                        </span>
                    )}

                    {tieneToken !== null && !cargando && (
                        <Boton variante="ghost" onClick={generarToken} icono={<RefreshCw size={14} />}>
                            {tieneToken ? 'Regenerar token' : 'Generar token'}
                        </Boton>
                    )}

                    {token && (
                        <div style={{display: 'flex', gap: '6px', alignItems: 'center', width: '100%'}}>
                            <Input
                                tipo="text"
                                value={token}
                                readOnly
                                claseAdicional="panelGruposFb__tokenInput"
                            />
                            <Boton variante="badge" soloIcono onClick={copiarToken} icono={copiado ? <Check size={12} /> : <Copy size={12} />} title="Copiar token" />
                        </div>
                    )}

                    {error && (
                        <span className="descripcionOpcionConfig" style={{color: 'var(--dashboard-estadoError, #ef4444)'}}>
                            {error}
                        </span>
                    )}
                </div>
            </div>
            <div className="separadorOpcionesConfig" />

            {/* URL de la API */}
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">URL base de la API</span>
                    <span className="descripcionOpcionConfig">
                        Copia esta URL en el campo &quot;API URL&quot; de la extensión. No añadas rutas adicionales.
                    </span>
                    <div style={{display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px'}}>
                        <Input
                            tipo="text"
                            value={apiUrl}
                            readOnly
                            claseAdicional="panelGruposFb__tokenInput"
                        />
                        <Boton variante="badge" soloIcono onClick={() => navigator.clipboard.writeText(apiUrl)} icono={<Copy size={12} />} title="Copiar URL" />
                    </div>
                </div>
            </div>
            <div className="separadorOpcionesConfig" />

            {/* [034A-17] Duración de "publicado recientemente" */}
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">
                        <Clock size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />
                        Duración de publicado
                    </span>
                    <span className="descripcionOpcionConfig">
                        Horas durante las cuales un grupo marcado como publicado se considera reciente. Por defecto 24h.
                    </span>
                    <div style={{display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', maxWidth: '160px'}}>
                        <Input
                            tipo="number"
                            value={publicadoHoras}
                            onChange={e => guardarPublicadoHoras(e.target.value)}
                            min={1}
                            max={720}
                            disabled={guardandoConfig}
                        />
                        <span className="descripcionOpcionConfig">horas</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

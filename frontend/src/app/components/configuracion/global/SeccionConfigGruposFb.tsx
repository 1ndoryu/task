/* [263A-5] Sección de configuración para Grupos FB
 * Gestión de token de API para la extensión del navegador.
 * [034A-17] Añadido control de duración de "publicado recientemente".
 * [318A-3] Migrado al sistema centralizado: FormCampo con accionesDetalles
 * (este panel mezcla botones/estado custom dentro de los detalles; el renderer
 * declarativo se usa en los formularios fila-única). Visual-neutral. */

import {Key, Copy, RefreshCw, Check, Clock} from 'lucide-react';
import {Boton, Input} from '../../ui';
import {FormCampo} from '../../shared';
import {useSeccionConfigGruposFb} from '../../../hooks/configuracion/useSeccionConfigGruposFb';

export function SeccionConfigGruposFb(): JSX.Element {
    const {token, tieneToken, cargando, copiado, error, apiUrl, publicadoHoras, guardandoConfig, verificarToken, generarToken, copiarToken, guardarPublicadoHoras} = useSeccionConfigGruposFb();

    return (
        <div className="contenedorOpcionesConfig">
            {/* Explicación */}
            <FormCampo
                titulo="Token de API"
                descripcion="La extensión FB Group Manager necesita un token para enviar grupos detectados a este dashboard."
            />
            <div className="separadorOpcionesConfig" />

            {/* Estado del token */}
            <FormCampo
                compacto
                accionesDetalles={
                    <>
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
                            <div className="filaConBotonCopiar">
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
                            <span className="descripcionOpcionConfig descripcionOpcionConfig--error">
                                {error}
                            </span>
                        )}
                    </>
                }
            />
            <div className="separadorOpcionesConfig" />

            {/* URL de la API */}
            <FormCampo
                titulo="URL base de la API"
                descripcion="Copia esta URL en el campo &quot;API URL&quot; de la extensión. No añadas rutas adicionales."
                accionesDetalles={
                    <div className="filaConBotonCopiar--conMargen">
                        <Input
                            tipo="text"
                            value={apiUrl}
                            readOnly
                            claseAdicional="panelGruposFb__tokenInput"
                        />
                        <Boton variante="badge" soloIcono onClick={() => navigator.clipboard.writeText(apiUrl)} icono={<Copy size={12} />} title="Copiar URL" />
                    </div>
                }
            />
            <div className="separadorOpcionesConfig" />

            {/* [034A-17] Duración de "publicado recientemente" */}
            <FormCampo
                titulo={
                    <>
                        <Clock size={14} className="iconoInline" />
                        Duración de publicado
                    </>
                }
                descripcion="Horas durante las cuales un grupo marcado como publicado se considera reciente. Por defecto 24h."
                accionesDetalles={
                    <div className="filaConBotonCopiar--compacto">
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
                }
            />
        </div>
    );
}
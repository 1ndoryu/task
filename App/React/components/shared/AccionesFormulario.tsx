/*
 * AccionesFormulario
 * Componente reutilizable para las acciones de formularios (Guardar, Cancelar, Eliminar)
 * Centraliza los estilos y la logica de confirmacion de eliminacion
 */

import {useState} from 'react';
import {Trash2} from 'lucide-react';
import {Boton} from '../ui';

interface AccionesFormularioProps {
    onCancelar: () => void;
    /* Funcion opcional para override del submit por defecto (type="button") */
    onGuardar?: () => void;
    textoGuardar?: string;
    guardando?: boolean;
    /* Si se proporciona, muestra la zona de peligro */
    onEliminar?: () => void;
    textoEliminar?: string;
    /* Elementos adicionales (botones extra) */
    children?: React.ReactNode;
}

export function AccionesFormulario({onCancelar, onGuardar, textoGuardar = 'Guardar', guardando = false, onEliminar, textoEliminar = 'Eliminar', children}: AccionesFormularioProps): JSX.Element {
    const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

    return (
        <>
            {/* Zona de peligro: eliminar (opcional) */}
            {onEliminar && (
                <div className="accionesFormularioZonaPeligro">
                    {!confirmandoEliminar ? (
                        <Boton variante="peligro" onClick={() => setConfirmandoEliminar(true)} disabled={guardando} icono={<Trash2 size={12} />} claseAdicional="accionesFormularioBotonEliminar">
                            {textoEliminar}
                        </Boton>
                    ) : (
                        <div className="accionesFormularioConfirmacion">
                            <span className="accionesFormularioConfirmacionTexto">Confirmar eliminacion?</span>
                            <div className="accionesFormularioConfirmacionBotones">
                                <Boton variante="peligro" onClick={onEliminar} disabled={guardando} claseAdicional="accionesFormularioBotonConfirmar">
                                    Si, eliminar
                                </Boton>
                                <Boton variante="secundario" onClick={() => setConfirmandoEliminar(false)} disabled={guardando} claseAdicional="accionesFormularioBotonCancelarEliminar">
                                    No
                                </Boton>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Botones de accion principales */}
            <div className="accionesFormularioContenedor">
                {/* Elementos adicionales a la izquierda */}
                {children && <div className="accionesFormularioExtra">{children}</div>}
                <Boton variante="secundario" onClick={onCancelar} disabled={guardando} claseAdicional="accionesFormularioBotonCancelar">
                    Cancelar
                </Boton>
                <Boton type={onGuardar ? 'button' : 'submit'} variante="primario" disabled={guardando} onClick={onGuardar} cargando={guardando} claseAdicional="accionesFormularioBotonGuardar">
                    {textoGuardar}
                </Boton>
            </div>
        </>
    );
}

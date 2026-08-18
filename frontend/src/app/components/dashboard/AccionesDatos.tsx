/*
 * AccionesDatos
 * Componente para exportar e importar datos del dashboard
 * Responsabilidad única: UI de acciones de datos
 */

import {useRef} from 'react';
import {Boton, Input} from '../ui';

interface AccionesDatosProps {
    onExportar: () => void;
    onImportar: (archivo: File) => void;
    importando: boolean;
    mensajeEstado: string | null;
    tipoMensaje: 'exito' | 'error' | null;
}

export function AccionesDatos({onExportar, onImportar, importando, mensajeEstado, tipoMensaje}: AccionesDatosProps) {
    const inputArchivoRef = useRef<HTMLInputElement>(null);

    const manejarClickImportar = () => {
        inputArchivoRef.current?.click();
    };

    const manejarCambioArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = evento.target.files?.[0];
        if (archivo) {
            onImportar(archivo);
            if (inputArchivoRef.current) {
                inputArchivoRef.current.value = '';
            }
        }
    };

    return (
        <div id="acciones-datos-contenedor" className="accionesDatosContenedor">
            <div className="accionesDatosBotones">
                <Boton variante="primario" onClick={onExportar} title="Descargar copia de seguridad">
                    <span className="botonAccionIcono">↓</span>
                    Exportar
                </Boton>

                <Boton variante="secundario" onClick={manejarClickImportar} disabled={importando} cargando={importando} title="Restaurar desde archivo">
                    <span className="botonAccionIcono">↑</span>
                    Importar
                </Boton>

                <Input ref={inputArchivoRef} tipo="file" accept=".json" onChange={manejarCambioArchivo} claseAdicional="inputArchivoOculto" />
            </div>

            {mensajeEstado && <div className={`mensajeEstadoDatos mensaje${tipoMensaje === 'exito' ? 'Exito' : 'Error'}`}>{mensajeEstado}</div>}
        </div>
    );
}

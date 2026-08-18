/*
 * components/configuracion/ConfigBarraInferior.tsx
 * [014A-12] Bottom sheet para configurar qué paneles aparecen en la barra inferior móvil.
 * Se accede desde el drawer → "Personalizar barra".
 * Muestra todos los paneles con toggle para añadir/quitar de la barra (máx 4).
 */

import {Pin, PinOff} from 'lucide-react';
import {Boton} from '../ui';
import {useNavegacionMovilStore, MAX_BOTONES_BARRA} from '../../stores/navegacionMovilStore';
import {obtenerTodosPanelesNavegables} from '../../config/registroPaneles';

interface ConfigBarraInferiorProps {
    onCerrar: () => void;
}

export function ConfigBarraInferior({onCerrar}: ConfigBarraInferiorProps): JSX.Element {
    const botonesActuales = useNavegacionMovilStore(s => s.botonesBarraInferior);
    const agregarBoton = useNavegacionMovilStore(s => s.agregarBoton);
    const quitarBoton = useNavegacionMovilStore(s => s.quitarBoton);
    const paneles = obtenerTodosPanelesNavegables();

    const manejarToggle = (idPagina: string) => {
        if (botonesActuales.includes(idPagina)) {
            quitarBoton(idPagina);
        } else {
            agregarBoton(idPagina);
        }
    };

    const estaLlena = botonesActuales.length >= MAX_BOTONES_BARRA;

    return (
        <div className="configBarraInferior">
            <h3 className="configBarraInferiorTitulo">Personalizar barra inferior</h3>
            <p className="configBarraInferiorDescripcion">
                Elige hasta {MAX_BOTONES_BARRA} paneles para la barra de navegación inferior.
            </p>

            <div className="configBarraInferiorLista">
                {paneles.map(panel => {
                    const fijado = botonesActuales.includes(panel.idPagina);
                    const deshabilitado = !fijado && estaLlena;

                    return (
                        <Boton
                            key={panel.idPagina}
                            type="button"
                            variante="ghost"
                            claseAdicional={`configBarraInferiorItem ${fijado ? 'configBarraInferiorItem--fijado' : ''} ${deshabilitado ? 'configBarraInferiorItem--deshabilitado' : ''}`}
                            onClick={() => !deshabilitado && manejarToggle(panel.idPagina)}
                            aria-pressed={fijado}
                        >
                            <span className="configBarraInferiorItemIcono">{panel.icono}</span>
                            <span className="configBarraInferiorItemTexto">{panel.titulo}</span>
                            <span className="configBarraInferiorItemPin">
                                {fijado ? <Pin size={16} /> : <PinOff size={16} />}
                            </span>
                        </Boton>
                    );
                })}
            </div>

            <Boton type="button" variante="primario" onClick={onCerrar} claseAdicional="configBarraInferiorCerrar">
                Listo
            </Boton>
        </div>
    );
}

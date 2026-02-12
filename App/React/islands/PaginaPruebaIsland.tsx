/*
 * PaginaPruebaIsland.tsx
 * Página de prueba para validar el sistema de auto-registro de islands
 *
 * Esta island se registra automáticamente en config/inicializarIslands.ts
 * sin necesidad de modificar appIslands.tsx (OCP)
 */

import {useState, useEffect} from 'react';
import {Boton} from '../components/ui';

interface PaginaPruebaIslandProps {
    titulo?: string;
    mensaje?: string;
}

export function PaginaPruebaIsland({titulo = 'Página de Prueba', mensaje = 'El sistema de auto-registro está funcionando correctamente'}: PaginaPruebaIslandProps): JSX.Element {
    const [contador, setContador] = useState(0);
    const [horaActual, setHoraActual] = useState('');

    useEffect(() => {
        /* Actualizar hora cada segundo para demostrar interactividad */
        const actualizarHora = () => {
            setHoraActual(new Date().toLocaleTimeString('es-ES'));
        };
        actualizarHora();
        const intervalo = setInterval(actualizarHora, 1000);
        return () => clearInterval(intervalo);
    }, []);

    return (
        <div className="contenedorPrueba">
            <div className="tarjetaPrueba">
                <header className="cabeceraPrueba">
                    <h1 className="tituloPrueba">{titulo}</h1>
                    <span className="horaPrueba">{horaActual}</span>
                </header>

                <div className="contenidoPrueba">
                    <p className="mensajePrueba">{mensaje}</p>

                    <div className="seccionContador">
                        <span className="etiquetaContador">Contador interactivo:</span>
                        <div className="controlesContador">
                            <Boton variante="secundario" onClick={() => setContador(c => c - 1)} aria-label="Decrementar" claseAdicional="botonDecrementar">
                                −
                            </Boton>
                            <span className="valorContador">{contador}</span>
                            <Boton variante="primario" onClick={() => setContador(c => c + 1)} aria-label="Incrementar" claseAdicional="botonIncrementar">
                                +
                            </Boton>
                        </div>
                    </div>

                    <div className="infoSistema">
                        <h2 className="subtituloInfo">Sistema OCP Validado</h2>
                        <ul className="listaValidacion">
                            <li className="itemValidacion validado">✓ Island creada sin modificar appIslands.tsx</li>
                            <li className="itemValidacion validado">✓ Registrada en inicializarIslands.ts</li>
                            <li className="itemValidacion validado">✓ Ruta definida en pages.php</li>
                            <li className="itemValidacion validado">✓ Componente renderizado correctamente</li>
                        </ul>
                    </div>
                </div>

                <footer className="piePrueba">
                    <p className="notaPie">Esta página demuestra el cumplimiento del principio Open/Closed. Los archivos existentes no fueron modificados para agregar esta island.</p>
                </footer>
            </div>
        </div>
    );
}

export default PaginaPruebaIsland;

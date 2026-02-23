/*
 * ModalExperimentos
 *
 * Modal con acciones de prueba para administradores.
 * Permite ejecutar funciones de testing sin usar consola.
 */

import {FlaskConical, X, CheckCircle, AlertCircle} from 'lucide-react';
import {useState} from 'react';
import {Boton} from '../ui/Boton';

interface AccionExperimento {
    id: string;
    nombre: string;
    descripcion: string;
    icono: JSX.Element;
    ejecutar: () => Promise<boolean>;
}

interface ModalExperimentosProps {
    abierto: boolean;
    onCerrar: () => void;
    acciones: AccionExperimento[];
}

export function ModalExperimentos({abierto, onCerrar, acciones}: ModalExperimentosProps): JSX.Element | null {
    const [ejecutando, setEjecutando] = useState<string | null>(null);
    const [resultados, setResultados] = useState<Record<string, 'exito' | 'error'>>({});

    if (!abierto) return null;

    const ejecutarAccion = async (accion: AccionExperimento) => {
        setEjecutando(accion.id);
        try {
            const exito = await accion.ejecutar();
            setResultados(prev => ({...prev, [accion.id]: exito ? 'exito' : 'error'}));
        } catch {
            setResultados(prev => ({...prev, [accion.id]: 'error'}));
        } finally {
            setEjecutando(null);
        }
    };

    return (
        <div className="modalExperimentos__overlay" onClick={onCerrar}>
            <div className="modalExperimentos" onClick={e => e.stopPropagation()}>
                <header className="modalExperimentos__encabezado">
                    <div className="modalExperimentos__titulo">
                        <FlaskConical size={18} />
                        <span>Laboratorio de Pruebas</span>
                    </div>
                    <Boton type="button" variante="icono" onClick={onCerrar}>
                        <X size={16} />
                    </Boton>
                </header>

                <div className="modalExperimentos__contenido">
                    <p className="modalExperimentos__descripcion">Acciones de prueba para desarrollo. Solo visible para administradores.</p>

                    <div className="modalExperimentos__acciones">
                        {acciones.map(accion => (
                            <Boton key={accion.id} type="button" claseAdicional={`modalExperimentos__accion ${resultados[accion.id] ? `modalExperimentos__accion--${resultados[accion.id]}` : ''}`} onClick={() => ejecutarAccion(accion)} disabled={ejecutando !== null}>
                                <div className="modalExperimentos__accionIcono">{resultados[accion.id] === 'exito' ? <CheckCircle size={20} /> : resultados[accion.id] === 'error' ? <AlertCircle size={20} /> : accion.icono}</div>
                                <div className="modalExperimentos__accionInfo">
                                    <span className="modalExperimentos__accionNombre">{accion.nombre}</span>
                                    <span className="modalExperimentos__accionDescripcion">{accion.descripcion}</span>
                                </div>
                                {ejecutando === accion.id && <div className="modalExperimentos__spinner" />}
                            </Boton>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* Tipo exportado para usar en otros componentes */
export type {AccionExperimento};

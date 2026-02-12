/*
 * ModalTemas
 * Modal minimalista para seleccionar el tema visual del dashboard
 * Responsabilidad única: mostrar y gestionar la selección de temas
 */

import {Check} from 'lucide-react';
import {Modal} from './Modal';
import {Boton} from '../ui/Boton';
import {TEMAS_DISPONIBLES, type TipoTema} from '../../hooks/useTema';

interface ModalTemasProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    temaActual: TipoTema;
    onCambiarTema: (tema: TipoTema) => void;
}

/* 
 * Modal principal de selección de temas 
 */
export function ModalTemas({estaAbierto, onCerrar, temaActual, onCambiarTema}: ModalTemasProps): JSX.Element | null {
    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Tema" claseExtra="modalContenedor--temas">
            <div id="selector-temas" className="selectorTemas">
                {TEMAS_DISPONIBLES.map(tema => (
                    <Boton
                        key={tema.id}
                        type="button"
                        claseAdicional={`selectorTemas__opcion ${temaActual === tema.id ? 'selectorTemas__opcion--activa' : ''}`}
                        onClick={() => onCambiarTema(tema.id)}
                    >
                        <span className="selectorTemas__nombre">{tema.nombre}</span>
                        {temaActual === tema.id && (
                            <Check size={14} className="selectorTemas__check" />
                        )}
                    </Boton>
                ))}
            </div>
        </Modal>
    );
}

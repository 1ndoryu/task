/**
 * ModalLimiteAlcanzado
 *
 * Modal que se muestra cuando el usuario FREE alcanza un límite.
 * Muestra información del límite y CTA para actualizar a Premium.
 *
 * @package App/React/components/shared
 */

import {Modal} from './Modal';
import {Boton} from '../ui';
import {AlertTriangle} from 'lucide-react';
import type {TipoEntidadLimite} from '../../stores/suscripcionStore';

interface ModalLimiteAlcanzadoProps {
    visible: boolean;
    onCerrar: () => void;
    onActualizarPlan: () => void;
    tipoEntidad: TipoEntidadLimite;
    limite: number;
    actual: number;
}

/*
 * Configuración por tipo de entidad
 */
/* [044A-14] Campo icono eliminado: antes usaba emojis como iconos pero nunca se renderizaba.
 * El modal usa AlertTriangle para todos los tipos, suficiente para su proposito de advertencia. */
const CONFIGURACION_ENTIDAD: Record<TipoEntidadLimite, {titulo: string; descripcion: string}> = {
    habitos: {
        titulo: 'Límite de hábitos alcanzado',
        descripcion: 'Has alcanzado el máximo de hábitos permitidos en el plan gratuito.'
    },
    tareasActivas: {
        titulo: 'Límite de tareas alcanzado',
        descripcion: 'Has alcanzado el máximo de tareas activas permitidas en el plan gratuito.'
    },
    proyectos: {
        titulo: 'Límite de proyectos alcanzado',
        descripcion: 'Has alcanzado el máximo de proyectos permitidos en el plan gratuito.'
    },
    adjuntos: {
        titulo: 'Adjuntos no disponibles',
        descripcion: 'La función de adjuntos está disponible exclusivamente para usuarios Premium.'
    }
};

export function ModalLimiteAlcanzado({visible, onCerrar, onActualizarPlan, tipoEntidad, limite, actual}: ModalLimiteAlcanzadoProps): JSX.Element | null {
    const config = CONFIGURACION_ENTIDAD[tipoEntidad];

    const manejarActualizar = () => {
        onCerrar();
        onActualizarPlan();
    };

    return (
        <Modal estaAbierto={visible} onCerrar={onCerrar} titulo="">
            <div id="modal-limite-alcanzado" className="modalLimiteAlcanzado">
                <div className="modalLimiteAlcanzadoIcono">
                    <AlertTriangle size={32} />
                </div>

                <h2 className="modalLimiteAlcanzadoTitulo">{config.titulo}</h2>

                <p className="modalLimiteAlcanzadoDescripcion">{config.descripcion}</p>

                {limite > 0 && (
                    <div className="modalLimiteAlcanzadoContador">
                        <span className="modalLimiteAlcanzadoActual">{actual}</span>
                        <span className="modalLimiteAlcanzadoSeparador">/</span>
                        <span className="modalLimiteAlcanzadoMaximo">{limite}</span>
                    </div>
                )}

                <div className="modalLimiteAlcanzadoBeneficios">
                    <p className="modalLimiteAlcanzadoBeneficiosTitulo">Con Premium obtienes:</p>
                    <ul className="modalLimiteAlcanzadoLista">
                        <li>Hábitos, tareas y proyectos ilimitados</li>
                        <li>Adjuntos en tareas (hasta 10 por tarea)</li>
                        <li>Panel de actividad con mapa de calor</li>
                        <li>Copias de seguridad automáticas</li>
                        <li>Conexión con asistentes de IA</li>
                        <li>Sincronización entre dispositivos</li>
                    </ul>
                </div>

                <div className="modalLimiteAlcanzadoAcciones">
                    <Boton variante="primario" onClick={manejarActualizar}>
                        Actualizar a Premium
                    </Boton>
                    <Boton variante="secundario" onClick={onCerrar}>
                        Quizás después
                    </Boton>
                </div>
            </div>
        </Modal>
    );
}

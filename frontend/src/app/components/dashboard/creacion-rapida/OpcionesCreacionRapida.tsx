/*
 * OpcionesCreacionRapida
 * Sub-componente que renderiza los botones de opciones según el tipo de entidad.
 * Separado para mantener ModalCreacionRapida dentro del límite de líneas.
 */

import {Calendar, Flag, Layers, Clock, Repeat, Paperclip, Loader2} from 'lucide-react';
import {Boton} from '../../ui';
import type {Proyecto} from '../../../types/dashboard';
import type {EstadoMenu, EstadoOpciones} from '../../../hooks/dashboard/useModalCreacionRapida';
import {obtenerTextoPrioridad, obtenerTextoUrgencia} from '../../../utils/constantes';

interface OpcionesCreacionRapidaProps {
    tipo: 'tarea' | 'habito' | 'proyecto';
    opciones: EstadoOpciones;
    proyectos: Proyecto[];
    adjuntosCount: number;
    subiendo: boolean;
    obtenerEtiquetaFecha: (val?: string) => string;
    abrirMenu: (setter: React.Dispatch<React.SetStateAction<EstadoMenu>>, e: React.MouseEvent) => void;
    abrirSelectorArchivo: (e: React.MouseEvent) => void;
    setMenuProyecto: React.Dispatch<React.SetStateAction<EstadoMenu>>;
    setMenuFecha: React.Dispatch<React.SetStateAction<EstadoMenu>>;
    setMenuPrioridad: React.Dispatch<React.SetStateAction<EstadoMenu>>;
    setMenuUrgencia: React.Dispatch<React.SetStateAction<EstadoMenu>>;
    setMenuFrecuencia: React.Dispatch<React.SetStateAction<EstadoMenu>>;
    setMenuImportancia: React.Dispatch<React.SetStateAction<EstadoMenu>>;
}

export function OpcionesCreacionRapida({
    tipo, opciones, proyectos, adjuntosCount, subiendo,
    obtenerEtiquetaFecha, abrirMenu, abrirSelectorArchivo,
    setMenuProyecto, setMenuFecha, setMenuPrioridad, setMenuUrgencia, setMenuFrecuencia, setMenuImportancia
}: OpcionesCreacionRapidaProps): JSX.Element | null {
    if (tipo === 'tarea') {
        const proyectoSeleccionado = proyectos.find(p => p.id === opciones.proyectoId);

        return (
            <div className="creacionRapidaOpciones">
                <Boton type="button" variante="opcion" soloIcono activo={!!proyectoSeleccionado} onClick={e => abrirMenu(setMenuProyecto, e)} icono={<Layers size={14} />} title={proyectoSeleccionado?.nombre || 'Sin Proyecto'} />
                <Boton type="button" variante="opcion" soloIcono activo={!!opciones.fecha} onClick={e => abrirMenu(setMenuFecha, e)} icono={<Calendar size={14} />} title={obtenerEtiquetaFecha(opciones.fecha)} />
                <Boton type="button" variante="opcion" soloIcono activo={!!opciones.prioridad} onClick={e => abrirMenu(setMenuPrioridad, e)} icono={<Flag size={14} />} title={opciones.prioridad ? `Prioridad ${obtenerTextoPrioridad(opciones.prioridad) || opciones.prioridad}` : 'Prioridad'} />
                <Boton type="button" variante="opcion" soloIcono activo={!!opciones.urgencia} onClick={e => abrirMenu(setMenuUrgencia, e)} icono={<Clock size={14} />} title={opciones.urgencia ? obtenerTextoUrgencia(opciones.urgencia) || opciones.urgencia : 'Urgencia'} />
                <Boton type="button" variante="opcion" soloIcono activo={adjuntosCount > 0} onClick={abrirSelectorArchivo} disabled={subiendo} icono={subiendo ? <Loader2 size={14} className="iconoGirando" /> : <Paperclip size={14} />} title={adjuntosCount > 0 ? `${adjuntosCount} Adjunto${adjuntosCount !== 1 ? 's' : ''}` : 'Adjuntar'} />
            </div>
        );
    }

    if (tipo === 'habito') {
        return (
            <div className="creacionRapidaOpciones">
                <Boton type="button" variante="opcion" soloIcono activo={!!opciones.frecuencia} onClick={e => abrirMenu(setMenuFrecuencia, e)} icono={<Repeat size={14} />} title={opciones.frecuencia ? opciones.frecuencia.charAt(0).toUpperCase() + opciones.frecuencia.slice(1) : 'Diario'} />
                <Boton type="button" variante="opcion" soloIcono activo={!!opciones.importancia} onClick={e => abrirMenu(setMenuImportancia, e)} icono={<Flag size={14} />} title={opciones.importancia ? `Importancia ${opciones.importancia}` : 'Importancia Media'} />
            </div>
        );
    }

    if (tipo === 'proyecto') {
        return (
            <div className="creacionRapidaOpciones">
                <Boton type="button" variante="opcion" soloIcono activo={!!opciones.prioridad} onClick={e => abrirMenu(setMenuPrioridad, e)} icono={<Flag size={14} />} title={opciones.prioridad ? `Prioridad ${obtenerTextoPrioridad(opciones.prioridad) || opciones.prioridad}` : 'Prioridad'} />
                <Boton type="button" variante="opcion" soloIcono activo={!!opciones.urgencia} onClick={e => abrirMenu(setMenuUrgencia, e)} icono={<Clock size={14} />} title={opciones.urgencia ? obtenerTextoUrgencia(opciones.urgencia) || opciones.urgencia : 'Urgencia'} />
                <Boton type="button" variante="opcion" soloIcono activo={!!opciones.fecha} onClick={e => abrirMenu(setMenuFecha, e)} icono={<Calendar size={14} />} title={obtenerEtiquetaFecha(opciones.fecha) || 'Fecha Limite'} />
            </div>
        );
    }

    return null;
}

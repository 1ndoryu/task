import React from 'react';
import {Check, X, Flag, Trash2, Settings, Calendar, Paperclip, FileText, Repeat, Folder, Share2, Users, Zap, Repeat2, MessageCircle, Sparkles} from 'lucide-react';
import type {Tarea, NivelPrioridad, NivelUrgencia, TareaHabito} from '../../../types/dashboard';
import {esTareaHabito} from '../../../types/dashboard';
import {BadgeInfo, type VarianteBadge} from '../../shared/BadgeInfo';
import {obtenerTextoFechaLimite as obtenerTextoFechaLim, obtenerVarianteFechaLimite as obtenerVarianteFecha, formatearFechaCorta as formatearFecha} from '../../../utils/fecha';

interface TareaBadgesProps {
    tarea: Tarea;
    nombreProyecto?: string;
    soloIconoProyecto?: boolean;
    estaCompartida?: boolean;
    mensajesNoLeidos?: number;
    onConfigurar?: () => void;
}

export const TareaBadges: React.FC<TareaBadgesProps> = ({tarea, nombreProyecto, soloIconoProyecto, estaCompartida, mensajesNoLeidos = 0, onConfigurar}) => {
    /* Helper para convertir tarea a tarea habito si es necesario */
    const esHabito = esTareaHabito(tarea);

    /* Renderizado del indicador de prioridad */
    const renderIndicadorPrioridad = () => {
        if (esHabito) {
            const importaciaHabito = (tarea as TareaHabito).habitoImportancia;
            if (importaciaHabito === 'Muy Alta') {
                return <BadgeInfo tipo="prioridad" texto="MUY ALTA" variante="prioridadMuyAlta" />;
            }
        }

        if (!tarea.prioridad) return null;

        const obtenerVariantePrioridad = (prioridad: NivelPrioridad): VarianteBadge => {
            switch (prioridad) {
                case 'muy_alta':
                    return 'prioridadMuyAlta';
                case 'alta':
                    return 'prioridadAlta';
                case 'media':
                    return 'prioridadMedia';
                case 'baja':
                    return 'prioridadBaja';
            }
        };

        return <BadgeInfo tipo="prioridad" texto={tarea.prioridad.toUpperCase().replace('_', ' ')} variante={obtenerVariantePrioridad(tarea.prioridad)} />;
    };

    /* Renderizado del indicador de urgencia */
    const renderIndicadorUrgencia = () => {
        if (!tarea.urgencia || tarea.urgencia === 'normal') return null;

        const obtenerVarianteUrgencia = (urgencia: NivelUrgencia): VarianteBadge => {
            switch (urgencia) {
                case 'bloqueante':
                    return 'urgenciaBloqueante';
                case 'urgente':
                    return 'urgenciaUrgente';
                case 'chill':
                    return 'urgenciaChill';
                default:
                    return 'normal';
            }
        };

        return <BadgeInfo tipo="personalizado" icono={<Zap size={10} />} texto={tarea.urgencia.toUpperCase()} variante={obtenerVarianteUrgencia(tarea.urgencia)} titulo={`Urgencia: ${tarea.urgencia}`} />;
    };

    /* Renderizado del indicador de fecha limite */
    const renderIndicadorFecha = () => {
        const fechaMaxima = tarea.configuracion?.fechaMaxima;
        if (!fechaMaxima) return null;

        const textoFecha = obtenerTextoFechaLim(fechaMaxima);
        const variante = obtenerVarianteFecha(fechaMaxima);

        return <BadgeInfo tipo="fecha" icono={<Calendar size={10} />} texto={textoFecha} titulo={`Fecha limite: ${formatearFecha(fechaMaxima)}`} variante={variante} onClick={onConfigurar} />;
    };

    /* Renderizado del badge de adjuntos */
    const renderBadgeAdjuntos = () => {
        const adjuntos = tarea.configuracion?.adjuntos;
        if (!adjuntos || adjuntos.length === 0) return null;

        return <BadgeInfo tipo="adjunto" icono={<Paperclip size={10} />} texto={adjuntos.length.toString()} titulo={`${adjuntos.length} archivo${adjuntos.length > 1 ? 's' : ''} adjunto${adjuntos.length > 1 ? 's' : ''}`} onClick={onConfigurar} />;
    };

    /* Renderizado del badge de descripcion */
    const renderBadgeDescripcion = () => {
        const descripcion = tarea.configuracion?.descripcion;
        if (!descripcion || descripcion.trim().length === 0) return null;

        return <BadgeInfo tipo="descripcion" icono={<FileText size={10} />} titulo="Tiene descripcion" onClick={onConfigurar} />;
    };

    /* Renderizado del badge de repeticion */
    const renderBadgeRepeticion = () => {
        const repeticion = tarea.configuracion?.repeticion;
        if (!repeticion) return null;

        const textoIntervalo = repeticion.intervalo === 1 ? 'diaria' : `cada ${repeticion.intervalo} dias`;

        return <BadgeInfo tipo="repeticion" icono={<Repeat size={10} />} titulo={`Repeticion ${textoIntervalo}`} onClick={onConfigurar} />;
    };

    /* Renderizado del badge de asignacion */
    const renderBadgeAsignado = () => {
        if (!tarea.asignadoA || !tarea.asignadoANombre) return null;

        return (
            <span className="badgeAsignado" title={`Asignado a: ${tarea.asignadoANombre}`}>
                {tarea.asignadoAAvatar && <img src={tarea.asignadoAAvatar} alt={tarea.asignadoANombre} />}
                <span className="badgeAsignadoNombre">{tarea.asignadoANombre}</span>
            </span>
        );
    };

    /* Renderizado del badge de propietario */
    const renderBadgePropietario = () => {
        if (!tarea.esCompartido || !tarea.propietarioNombre) return null;

        return (
            <span className="badgePropietario" title={`De: ${tarea.propietarioNombre}`}>
                {tarea.propietarioAvatar && <img src={tarea.propietarioAvatar} alt={tarea.propietarioNombre} className="badgePropietarioAvatar" />}
                <span className="badgePropietarioNombre">{tarea.propietarioNombre}</span>
            </span>
        );
    };

    /* Renderizado del badge de hábito */
    const renderBadgeHabito = () => {
        if (!esHabito) return null;

        /* Cast seguro porque esHabito es true */
        const tareaH = tarea as TareaHabito;
        const textoRacha = tareaH.habitoRacha > 0 ? `${tareaH.habitoRacha}` : undefined;

        /* Nota: Se incluye la ventana de oportunidad aquí también si se desea, 
           aunque en el original estaba separado en renderBadgeHabito vs renderBadgeHabito (duplicado nombre en original, pero funcion distinta)
           El original tenia renderBadgeHabito en linea 96 y linea 497. 
           La de linea 96 incluia ventana de oportunidad. La de 497 no.
           
           En el render final (linea 546) se usa renderBadgeHabito de la 497.
           Pero espera... en el render final (linea 546) ¿Cual usa?
           Javascript permite redeclarar funciones con var/funtion hoisting pero const/let no.
           En TareaItem.tsx lineas 96 y 497 son funciones const diferentes pero con MISMO nombre?
           Ah, TypeScript/React daría error de "Duplicate identifier".
           
           Revisando el TareaItem.tsx original:
           Line 96: const renderBadgeHabito = ...
           Line 497: const renderBadgeHabito = ...
           Esto debería ser un error en el archivo original si están en el mismo scope.
           Están ambas en el body de TareaItem.
           ERROR DETECTADO EN CODIGO ORIGINAL: Duplicidad de identificador `renderBadgeHabito`.
           Probablemente el usuario no lo notó o el transpilador es permisivo o una sombrea a la otra.
           
           La segunda (linea 497) está mas cerca del return, así que esa es la que se usa en linea 546.
           La primera (linea 96) parece no usarse?
           No, espera. Linea 96 se declara. Linea 497 se declara.
           Esto crashearía en runtime o build time con "Identifier 'renderBadgeHabito' has already been declared".
           
           Asumiré que debo usar la lógica combinada.
        */

        return (
            <>
                <BadgeInfo tipo="personalizado" icono={<Repeat2 size={10} />} texto={textoRacha} titulo={`Hábito: ${tareaH.habitoNombre}${tareaH.habitoRacha > 0 ? ` (racha: ${tareaH.habitoRacha})` : ''}`} variante="habito" />
                {tarea.enVentanaOportunidad && <BadgeInfo tipo="destacado" icono={<Sparkles size={10} />} texto="Ahora" titulo="Ventana de oportunidad activa" variante="destacado" />}
            </>
        );
    };

    /* Renderizado del badge de mensajes no leídos */
    const renderBadgeMensajesNoLeidos = () => {
        if (mensajesNoLeidos <= 0) return null;

        const texto = mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos.toString();
        const titulo = mensajesNoLeidos === 1 ? '1 mensaje sin leer' : `${mensajesNoLeidos} mensajes sin leer`;

        return <BadgeInfo tipo="personalizado" icono={<MessageCircle size={10} />} texto={texto} titulo={titulo} variante="mensajeNoLeido" onClick={onConfigurar} />;
    };

    return (
        <>
            {renderBadgePropietario()}
            {renderIndicadorFecha()}
            {renderBadgeAdjuntos()}
            {renderBadgeDescripcion()}
            {renderBadgeRepeticion()}
            {renderBadgeAsignado()}
            {estaCompartida && !tarea.esCompartido && <BadgeInfo tipo="personalizado" icono={<Users size={10} />} titulo="Tarea compartida" variante="normal" />}
            {nombreProyecto && <BadgeInfo tipo="personalizado" icono={<Folder size={10} />} texto={soloIconoProyecto ? undefined : nombreProyecto} titulo={`Proyecto: ${nombreProyecto}`} variante="normal" />}
            {renderIndicadorPrioridad()}
            {renderIndicadorUrgencia()}
            {renderBadgeHabito()}
            {renderBadgeMensajesNoLeidos()}
        </>
    );
};

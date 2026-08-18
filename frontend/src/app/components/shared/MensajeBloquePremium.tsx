/*
 * MensajeBloquePremium
 * Componente reutilizable para mostrar mensaje de bloqueo en secciones Premium
 * Usado en: Panel de Actividad, Backups, Seguridad, Conexión IA
 *
 * Centraliza el estilo visual de mensajes de bloqueo para usuarios FREE
 * Fase 15.9 - Componente extraído para reutilización
 */

import {Lock} from 'lucide-react';
import {Boton} from '../ui/Boton';

interface MensajeBloquePremiumProps {
    titulo: string;
    descripcion: string;
    onAbrirUpgrade?: () => void;
    textoBoton?: string;
}

export function MensajeBloquePremium({
    titulo,
    descripcion,
    onAbrirUpgrade,
    textoBoton = 'Ver planes Premium'
}: MensajeBloquePremiumProps): JSX.Element {
    return (
        <div className="mensajeBloquePremium">
            <Lock size={24} />
            <p className="mensajeBloquePremiumTitulo">{titulo}</p>
            <p className="mensajeBloquePremiumTexto">{descripcion}</p>
            {onAbrirUpgrade && (
                <Boton variante="primario" onClick={onAbrirUpgrade}>
                    {textoBoton}
                </Boton>
            )}
        </div>
    );
}

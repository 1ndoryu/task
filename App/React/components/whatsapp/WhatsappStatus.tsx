/*
 * components/whatsapp/WhatsappStatus.tsx
 * [125B-1] Muestra el estado de autenticación WhatsApp.
 *
 * Incluye: teléfono vinculado, estado enabled/health, fecha de última sincronización,
 * botón para desvincular. Se muestra cuando el usuario ya está autenticado.
 */

import {Smartphone, CheckCircle, XCircle, Unlink} from 'lucide-react';
import {Boton} from '../ui';

interface Props {
    phonePrimary: string | null;
    authenticated: boolean;
    enabled: boolean;
    healthStatus: string;
    dailyMsgCount: number;
    onUnlink: () => void;
    loading: boolean;
}

function healthDotClass(status: string): string {
    switch (status) {
        case 'healthy':
            return 'whatsappStatusHealthDot--healthy';
        case 'degraded':
            return 'whatsappStatusHealthDot--degraded';
        case 'dead':
            return 'whatsappStatusHealthDot--dead';
        default:
            return 'whatsappStatusHealthDot--unknown';
    }
}

function healthLabel(status: string): string {
    switch (status) {
        case 'healthy':
            return 'Saludable';
        case 'degraded':
            return 'Degradado';
        case 'dead':
            return 'Caído';
        default:
            return 'Desconocido';
    }
}

export function WhatsappStatus({
    phonePrimary,
    authenticated,
    enabled,
    healthStatus,
    onUnlink,
    loading,
}: Props): JSX.Element {
    return (
        <div className="whatsappStatus">
            <div className="whatsappStatusHeader">
                <Smartphone size={20} />
                <span>WhatsApp conectado</span>
            </div>

            <div className="whatsappStatusMeta">
                <span className="whatsappStatusLabel">Teléfono:</span>
                <span className="whatsappStatusValue">
                    {phonePrimary ?? '—'}
                </span>

                <span className="whatsappStatusLabel">Estado:</span>
                <span className="whatsappStatusValue">
                    {authenticated ? (
                        <span className="whatsappStatusValue--ok">
                            <CheckCircle size={14} className="whatsappStatusIconInline" />
                            Verificado
                        </span>
                    ) : (
                        <span className="whatsappStatusValue--error">
                            <XCircle size={14} className="whatsappStatusIconInline" />
                            No verificado
                        </span>
                    )}
                </span>

                <span className="whatsappStatusLabel">Activo:</span>
                <span className="whatsappStatusValue">
                    {enabled ? 'Sí' : 'No'}
                </span>

                <span className="whatsappStatusLabel">Salud:</span>
                <span className="whatsappStatusValue">
                    <span className="whatsappStatusHealth">
                        <span className={`whatsappStatusHealthDot ${healthDotClass(healthStatus)}`} />
                        {healthLabel(healthStatus)}
                    </span>
                </span>
            </div>

            <Boton
                onClick={onUnlink}
                disabled={loading}
                variante="peligro"
                tamano="pequeño"
                icono={<Unlink size={14} />}
            >
                {loading ? 'Desvinculando...' : 'Desvincular WhatsApp'}
            </Boton>
        </div>
    );
}

/*
 * components/whatsapp/WhatsappSettings.tsx
 * [125B-1] Muestra el uso diario de mensajes WhatsApp.
 *
 * Se renderiza debajo del status cuando el usuario está autenticado.
 * Muestra una barra de uso diario (soft limit 20 mensajes/día).
 */

import {MessageSquare, BarChart3} from 'lucide-react';
import {useWhatsAppStore} from '../../stores/whatsappStore';
import {useEffect, useState} from 'react';
import {obtenerDailyUsage} from '../../services/whatsappService';

export function WhatsappSettings(): JSX.Element {
    const dailyMsgCount = useWhatsAppStore((s) => s.dailyMsgCount);
    const [used, setUsed] = useState(dailyMsgCount);
    const [limit, setLimit] = useState(50);
    const [remaining, setRemaining] = useState(50 - dailyMsgCount);

    /* Refrescar uso diario al montar */
    useEffect(() => {
        let cancel = false;

        async function cargarUso() {
            try {
                const data = await obtenerDailyUsage();
                if (!cancel) {
                    setUsed(data.used);
                    setLimit(data.limit);
                    setRemaining(data.remaining);
                }
            } catch {
                /* usa el valor del store como fallback */
            }
        }

        cargarUso();
        return () => { cancel = true; };
    }, [dailyMsgCount]);

    const porcentaje = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const barClass = porcentaje >= 90
        ? 'whatsappUsageBarFill--danger'
        : porcentaje >= 70
            ? 'whatsappUsageBarFill--warn'
            : 'whatsappUsageBarFill--safe';

    return (
        <div className="whatsappSettings">
            <div className="whatsappSettingsTitle">
                <BarChart3 size={14} className="whatsappSettingsTitleIcon" />
                Uso diario
            </div>

            <div className="whatsappUsage">
                <div className="whatsappUsageHeader">
                    <span>{used} de {limit} mensajes usados</span>
                    <span>{remaining} restantes</span>
                </div>

                <progress
                    className={`whatsappUsageProgress ${barClass}`}
                    value={used}
                    max={limit}
                    aria-label="Uso diario de mensajes WhatsApp"
                />

                <div className="whatsappUsageLabel">
                    <MessageSquare size={12} className="whatsappStatusIconInline" />
                    Se restablece cada día
                </div>
            </div>
        </div>
    );
}

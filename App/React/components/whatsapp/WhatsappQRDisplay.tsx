/*
 * components/whatsapp/WhatsappQRDisplay.tsx
 * [125B-1] Muestra el código QR para escanear con WhatsApp.
 *
 * Incluye: imagen QR, nombre de cuenta, botón renovar, estado de polling.
 */

import {RefreshCw, Loader2} from 'lucide-react';
import {Boton} from '../ui';

interface Props {
    qrCode: string;
    accountName: string | null;
    onRenewQr: () => void;
    loading: boolean;
    qrRateLimited: boolean;
}

export function WhatsappQRDisplay({
    qrCode,
    accountName,
    onRenewQr,
    loading,
    qrRateLimited,
}: Props): JSX.Element {
    return (
        <div className="whatsappQRContenedor">
            <img
                className="whatsappQRImg"
                src={qrCode}
                alt="Código QR de WhatsApp"
            />

            <div className="whatsappQRInfo">
                <p>Escanea este código QR con WhatsApp en tu teléfono.</p>
                {accountName && (
                    <p>
                        Cuenta: <strong>{accountName}</strong>
                    </p>
                )}
                <p>Abre WhatsApp → Menú (3 puntos) → Dispositivos vinculados → Vincular un dispositivo.</p>
            </div>

            <div className="whatsappQRAcciones">
                <Boton
                    onClick={onRenewQr}
                    disabled={loading || qrRateLimited}
                    variante="secundario"
                    tamano="pequeño"
                    icono={loading ? <Loader2 className="whatsappSpinner" size={14} /> : <RefreshCw size={14} />}
                >
                    {qrRateLimited ? 'Espera 30s...' : 'Regenerar QR'}
                </Boton>
            </div>

            {qrRateLimited && (
                <span className="whatsappQRRefreshHint">
                    Puedes regenerar el QR una vez cada 30 segundos
                </span>
            )}

            <div className="whatsappConnectEstado">
                <Loader2 size={20} className="whatsappSpinner" />
                <p>Esperando autenticación... Abre WhatsApp y escanea el código.</p>
            </div>
        </div>
    );
}

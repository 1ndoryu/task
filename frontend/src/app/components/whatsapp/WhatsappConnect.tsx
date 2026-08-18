/*
 * components/whatsapp/WhatsappConnect.tsx
 * [125B-1] Componente principal de conexión WhatsApp.
 *
 * Orquesta el flujo completo: registro → QR → espera autenticación → conectado.
 * Se monta en la configuración del dashboard del usuario.
 */

import {Smartphone, QrCode, AlertTriangle, Loader2} from 'lucide-react';
import {Boton} from '../ui';
import {WhatsappQRDisplay} from './WhatsappQRDisplay';
import {WhatsappStatus} from './WhatsappStatus';
import {WhatsappSettings} from './WhatsappSettings';
import {useWhatsappConnect} from './useWhatsappConnect';

export function WhatsappConnect(): JSX.Element {
    const {
        step, qrCode, accountName,
        phonePrimary, authenticated, enabled, healthStatus,
        dailyMsgCount,
        loading, error, qrRateLimited,
        phoneInput, setPhoneInput,
        manejarRegistro, manejarRenewQr, manejarUnlink, manejarReintentar,
    } = useWhatsappConnect();

    /* ─── Render por paso ─── */

    /* Paso: autenticado — mostrar status y settings */
    if (step === 'authenticated' && authenticated) {
        return (
            <div className="whatsappConnect">
                <WhatsappStatus
                    phonePrimary={phonePrimary}
                    authenticated={authenticated}
                    enabled={enabled}
                    healthStatus={healthStatus}
                    dailyMsgCount={dailyMsgCount}
                    onUnlink={manejarUnlink}
                    loading={loading}
                />
                <WhatsappSettings />
            </div>
        );
    }

    /* Paso: QR — mostrar QR y polling */
    if (step === 'qr' && qrCode) {
        return (
            <div className="whatsappConnect">
                <WhatsappQRDisplay
                    qrCode={qrCode}
                    accountName={accountName}
                    onRenewQr={manejarRenewQr}
                    loading={loading}
                    qrRateLimited={qrRateLimited}
                />
                {error && (
                    <div className="whatsappError">
                        <AlertTriangle size={14} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        );
    }

    /* Paso: registrando — spinner */
    if (step === 'registering') {
        return (
            <div className="whatsappConnect">
                <div className="whatsappConnectEstado">
                    <Loader2 size={24} className="whatsappSpinner" />
                    <p>Creando tu cuenta WhatsApp...</p>
                </div>
            </div>
        );
    }

    /* Paso: idle — formulario de registro */
    return (
        <div className="whatsappConnect">
            <div className="whatsappConnectHeader">
                <Smartphone size={20} />
                <h3>Conectar WhatsApp</h3>
            </div>

            <p className="whatsappConnectDescripcion">
                Vincula tu número de WhatsApp para que el asistente IA pueda
                responder mensajes automáticamente. Solo se admite un número por cuenta.
            </p>

            <div className="whatsappConnectFormulario">
                <label className="whatsappConnectLabel" htmlFor="whatsapp-phone">
                    Tu número de WhatsApp (formato internacional)
                </label>
                <input
                    id="whatsapp-phone"
                    className="whatsappConnectInput"
                    type="tel"
                    placeholder="+584141234567"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    disabled={loading}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') manejarRegistro();
                    }}
                />

                <Boton
                    onClick={manejarRegistro}
                    disabled={loading || phoneInput.length < 10}
                    variante="primario"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="whatsappSpinner" />
                            Conectando...
                        </>
                    ) : (
                        <>
                            <QrCode size={16} />
                            Generar QR
                        </>
                    )}
                </Boton>
            </div>

            {error && (
                <div className="whatsappError">
                    <AlertTriangle size={14} />
                    <span>{error}</span>
                </div>
            )}

            {step === 'error' && (
                <Boton onClick={manejarReintentar} variante="secundario">
                    Reintentar
                </Boton>
            )}
        </div>
    );
}

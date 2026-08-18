import {useCallback, useEffect, useState} from 'react';
import {useWhatsAppStore} from '../../stores/whatsappStore';
import {
    obtenerAuthStatus,
    registrarWhatsApp,
    renewQr,
    unlinkWhatsApp,
} from '../../services/whatsappService';

export function useWhatsappConnect() {
    const step = useWhatsAppStore((state) => state.step);
    const qrCode = useWhatsAppStore((state) => state.qrCode);
    const accountName = useWhatsAppStore((state) => state.accountName);
    const phonePrimary = useWhatsAppStore((state) => state.phonePrimary);
    const authenticated = useWhatsAppStore((state) => state.authenticated);
    const enabled = useWhatsAppStore((state) => state.enabled);
    const healthStatus = useWhatsAppStore((state) => state.healthStatus);
    const dailyMsgCount = useWhatsAppStore((state) => state.dailyMsgCount);
    const loading = useWhatsAppStore((state) => state.loading);
    const error = useWhatsAppStore((state) => state.error);
    const qrRateLimited = useWhatsAppStore((state) => state.qrRateLimited);
    const setStep = useWhatsAppStore((state) => state.setStep);
    const setQrCode = useWhatsAppStore((state) => state.setQrCode);
    const setAccountName = useWhatsAppStore((state) => state.setAccountName);
    const setLoading = useWhatsAppStore((state) => state.setLoading);
    const setError = useWhatsAppStore((state) => state.setError);
    const setQrRateLimited = useWhatsAppStore((state) => state.setQrRateLimited);
    const syncFromAuthStatus = useWhatsAppStore((state) => state.syncFromAuthStatus);
    const resetState = useWhatsAppStore((state) => state.resetState);
    const [phoneInput, setPhoneInput] = useState('');
    const [polling, setPolling] = useState(false);

    const cargarEstado = useCallback(async () => {
        try {
            syncFromAuthStatus(await obtenerAuthStatus());
        } catch {
            /* La ausencia de cuenta deja el flujo en idle. */
        }
    }, [syncFromAuthStatus]);

    useEffect(() => { void cargarEstado(); }, [cargarEstado]);
    useEffect(() => {
        if (!polling || step !== 'qr') return;
        const intervalo = window.setInterval(async () => {
            try {
                const status = await obtenerAuthStatus();
                if (status.authenticated) {
                    syncFromAuthStatus(status);
                    setPolling(false);
                }
            } catch { /* polling tolerante */ }
        }, 3000);
        return () => window.clearInterval(intervalo);
    }, [polling, step, syncFromAuthStatus]);

    const manejarRegistro = async () => {
        if (!phoneInput || phoneInput.length < 10) {
            setError('Ingresa un número válido (ej: +584141234567)');
            return;
        }
        setLoading(true); setError(null); setStep('registering');
        try {
            const result = await registrarWhatsApp(phoneInput);
            setQrCode(result.qr ?? null); setAccountName(result.accountName ?? null);
            setStep('qr'); setPolling(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar'); setStep('error');
        } finally { setLoading(false); }
    };

    const manejarRenewQr = async () => {
        setLoading(true); setError(null);
        try {
            const result = await renewQr();
            setQrCode(result.qr ?? null); setPolling(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al regenerar QR';
            if (msg.includes('esperar') || msg.includes('rate')) {
                setQrRateLimited(true); window.setTimeout(() => setQrRateLimited(false), 30000);
            }
            setError(msg);
        } finally { setLoading(false); }
    };

    const manejarUnlink = async () => {
        if (!window.confirm('¿Estás seguro? Se eliminará la vinculación de WhatsApp.')) return;
        setLoading(true); setError(null);
        try { await unlinkWhatsApp(); resetState(); setPhoneInput(''); }
        catch (err) { setError(err instanceof Error ? err.message : 'Error al desvincular'); }
        finally { setLoading(false); }
    };

    const manejarReintentar = () => { setStep('idle'); setError(null); setQrCode(null); };

    return {
        step, qrCode, accountName, phonePrimary, authenticated, enabled, healthStatus,
        dailyMsgCount, loading, error, qrRateLimited, phoneInput, setPhoneInput,
        manejarRegistro, manejarRenewQr, manejarUnlink, manejarReintentar,
    };
}
/*
 * stores/whatsappStore.ts
 * [125B-1] Store Zustand para gestión de cuentas WhatsApp.
 *
 * Estado global para el flujo de conexión WhatsApp del usuario:
 * registro, QR, autenticación, uso diario.
 */

import {create} from 'zustand';
import type {AuthStatusResponse} from '../services/whatsappService';

/* ─── Tipos ──────────────────────────────────────────────────── */

export type WhatsAppStep = 'idle' | 'registering' | 'qr' | 'authenticated' | 'error';

export interface WhatsAppState {
    /* Estado del flujo */
    step: WhatsAppStep;
    qrCode: string | null;
    accountName: string | null;

    /* Estado persistido */
    phonePrimary: string | null;
    authenticated: boolean;
    linkedJid: string | null;
    enabled: boolean;
    healthStatus: string;

    /* Uso diario */
    dailyMsgCount: number;
    dailyMsgDate: string | null;

    /* UX */
    loading: boolean;
    error: string | null;
    qrRateLimited: boolean;
}

export interface WhatsAppActions {
    /* Acciones del flujo */
    setStep: (step: WhatsAppStep) => void;
    setQrCode: (qr: string | null) => void;
    setAccountName: (name: string | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setQrRateLimited: (limited: boolean) => void;

    /* Sincronizar con backend */
    syncFromAuthStatus: (status: AuthStatusResponse) => void;
    resetState: () => void;
}

type WhatsAppStore = WhatsAppState & WhatsAppActions;

/* ─── Store ──────────────────────────────────────────────────── */

const initialState: WhatsAppState = {
    step: 'idle',
    qrCode: null,
    accountName: null,
    phonePrimary: null,
    authenticated: false,
    linkedJid: null,
    enabled: false,
    healthStatus: 'unknown',
    dailyMsgCount: 0,
    dailyMsgDate: null,
    loading: false,
    error: null,
    qrRateLimited: false,
};

export const useWhatsAppStore = create<WhatsAppStore>()((set) => ({
    ...initialState,

    setStep: (step) => set({step}),
    setQrCode: (qrCode) => set({qrCode}),
    setAccountName: (accountName) => set({accountName}),
    setLoading: (loading) => set({loading}),
    setError: (error) => set({error}),
    setQrRateLimited: (qrRateLimited) => set({qrRateLimited}),

    syncFromAuthStatus: (status) => set({
        phonePrimary: status.phonePrimary,
        authenticated: status.authenticated,
        linkedJid: status.linkedJid,
        enabled: status.enabled,
        healthStatus: status.healthStatus,
        dailyMsgCount: status.dailyMsgCount,
        dailyMsgDate: status.dailyMsgDate,
        step: status.authenticated ? 'authenticated' : (status.phonePrimary ? 'idle' : 'idle'),
        error: null,
    }),

    resetState: () => set({...initialState}),
}));

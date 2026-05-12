/*
 * services/whatsappService.ts
 * [125B-1] Servicio REST para endpoints de WhatsApp multi-usuario.
 *
 * Proporciona funciones tipadas para comunicación con el backend
 * de gestión de cuentas WhatsApp.
 */

import {obtenerApiUrlWP, obtenerNonceWP} from '../utils/dashboardRuntime';

/* ─── Interfaces ─────────────────────────────────────────────── */

export interface AuthStatusResponse {
    ok: boolean;
    authenticated: boolean;
    linkedJid: string | null;
    phonePrimary: string | null;
    enabled: boolean;
    blocked: boolean;
    dailyMsgCount: number;
    dailyMsgDate: string | null;
    healthStatus: string;
    lastSync: string | null;
}

export interface RegisterResponse {
    ok: boolean;
    qr?: string;
    accountName?: string;
    message?: string;
}

export interface DailyUsageResponse {
    ok: boolean;
    used: number;
    limit: number;
    remaining: number;
    date: string;
    resetAt: string;
}

export interface RecipientsResponse {
    ok: boolean;
    recipients: Array<{
        jid: string;
        masked: string;
        type: string;
    }>;
    total: number;
}

/* ─── Helper ─────────────────────────────────────────────────── */

function headers(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'X-WP-Nonce': obtenerNonceWP(),
    };
}

function api(path: string): string {
    return `${obtenerApiUrlWP()}/whatsapp${path}`;
}

async function handleResponse<T>(resp: Response): Promise<T> {
    const data = await resp.json().catch(() => null) as Record<string, unknown> | null;

    if (!resp.ok || !data?.ok) {
        const msg = (data?.message as string) || `Error del servidor (${resp.status})`;
        throw new Error(msg);
    }

    return data as unknown as T;
}

/* ─── Endpoints ──────────────────────────────────────────────── */

/**
 * Registra una nueva cuenta WhatsApp y retorna el QR para escanear.
 */
export async function registrarWhatsApp(phonePrimary: string): Promise<RegisterResponse> {
    const resp = await fetch(api('/register'), {
        method: 'POST',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify({primary: phonePrimary}),
    });
    return handleResponse<RegisterResponse>(resp);
}

/**
 * Regenera el código QR (rate limited: 1/30s por usuario).
 */
export async function renewQr(): Promise<RegisterResponse> {
    const resp = await fetch(api('/renew-qr'), {
        method: 'POST',
        credentials: 'include',
        headers: headers(),
    });
    return handleResponse<RegisterResponse>(resp);
}

/**
 * Obtiene el estado de autenticación del usuario actual.
 */
export async function obtenerAuthStatus(): Promise<AuthStatusResponse> {
    const resp = await fetch(api('/auth-status'), {
        method: 'GET',
        credentials: 'include',
        headers: headers(),
    });
    return handleResponse<AuthStatusResponse>(resp);
}

/**
 * Desvincula el WhatsApp del usuario actual.
 */
export async function unlinkWhatsApp(): Promise<{ok: boolean; message: string}> {
    const resp = await fetch(api('/unlink'), {
        method: 'POST',
        credentials: 'include',
        headers: headers(),
    });
    const data = await resp.json() as Record<string, unknown>;
    return {
        ok: Boolean(data.ok),
        message: (data.message as string) || '',
    };
}

/**
 * Obtiene la lista de contactos (enmascarados).
 */
export async function obtenerRecipients(): Promise<RecipientsResponse> {
    const resp = await fetch(api('/recipients'), {
        method: 'GET',
        credentials: 'include',
        headers: headers(),
    });
    return handleResponse<RecipientsResponse>(resp);
}

/**
 * Obtiene el consumo diario de mensajes.
 */
export async function obtenerDailyUsage(): Promise<DailyUsageResponse> {
    const resp = await fetch(api('/daily-usage'), {
        method: 'GET',
        credentials: 'include',
        headers: headers(),
    });
    return handleResponse<DailyUsageResponse>(resp);
}

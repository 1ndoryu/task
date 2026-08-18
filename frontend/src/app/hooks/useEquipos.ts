/* [18-08-2026] useEquipos contra /api/teams (backend Rust).
 * Sesion por cookie HttpOnly + X-CSRF-Token. El backend identifica usuarios
 * y conexiones con UUID; se conservan los tipos del front (ids numericos)
 * pasando los UUID como string en runtime. Estados: pending -> pendiente,
 * accepted -> aceptada, rejected -> rechazada, pending_registration -> pendiente_registro. */

import {useState, useCallback, useEffect, useRef} from 'react';
import {apiFetch} from '../utils/apiClient';
import type {EquipoCompleto, SolicitudEquipo, CompaneroEquipo, ContadoresEquipo, UsuarioEquipo, EstadoSolicitud} from '../types/dashboard';

interface EstadoEquipos {
    equipo: EquipoCompleto | null;
    pendientes: number;
    cargando: boolean;
    enviando: boolean;
    error: string | null;
}

interface AccionResultado {
    exito: boolean;
    mensaje: string;
}

const estadoInicial: EstadoEquipos = {
    equipo: null,
    pendientes: 0,
    cargando: false,
    enviando: false,
    error: null
};

/* Contratos Rust (JSON plano, camelCase) */
interface UsuarioRust {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
}

interface ConexionRust {
    id: string;
    status: string;
    requestedAt: string;
    respondedAt: string | null;
    email: string;
    user: UsuarioRust | null;
    isMine: boolean;
}

interface MiembroRust {
    id: string;
    connectionId: string;
    user: UsuarioRust;
    connectedAt: string | null;
}

interface EquipoRust {
    received: ConexionRust[];
    sent: ConexionRust[];
    members: MiembroRust[];
    counts: {received: number; sent: number; members: number};
}

const ESTADOS: Record<string, EstadoSolicitud> = {
    pending: 'pendiente',
    accepted: 'aceptada',
    rejected: 'rechazada',
    pending_registration: 'pendiente_registro'
};

function mapearUsuario(u: UsuarioRust): UsuarioEquipo {
    return {
        id: u.id as unknown as number,
        nombre: u.displayName,
        email: u.email,
        avatar: u.avatarUrl || ''
    };
}

function mapearSolicitud(c: ConexionRust): SolicitudEquipo {
    return {
        id: c.id as unknown as number,
        estado: ESTADOS[c.status] || 'pendiente',
        fechaSolicitud: c.requestedAt,
        fechaRespuesta: c.respondedAt,
        email: c.email,
        usuario: c.user ? mapearUsuario(c.user) : null,
        esMia: c.isMine
    };
}

function mapearCompanero(m: MiembroRust): CompaneroEquipo {
    return {
        id: m.id as unknown as number,
        companeroId: m.user.id as unknown as number,
        nombre: m.user.displayName,
        email: m.user.email,
        avatar: m.user.avatarUrl || '',
        fechaConexion: m.connectedAt || ''
    };
}

function mapearEquipo(datos: EquipoRust): EquipoCompleto {
    return {
        recibidas: (datos.received || []).map(mapearSolicitud),
        enviadas: (datos.sent || []).map(mapearSolicitud),
        companeros: (datos.members || []).map(mapearCompanero),
        contadores: {
            recibidas: datos.counts?.received ?? 0,
            enviadas: datos.counts?.sent ?? 0,
            companeros: datos.counts?.members ?? 0
        }
    };
}

const haySesion = (): boolean => {
    return Boolean((window as unknown as {gloryDashboard?: {isLoggedIn?: boolean}}).gloryDashboard?.isLoggedIn);
};

export function useEquipos() {
    const [estado, setEstado] = useState<EstadoEquipos>(estadoInicial);

    const setError = useCallback((mensaje: string | null) => {
        setEstado(prev => ({...prev, error: mensaje}));
    }, []);

    const setCargando = useCallback((cargando: boolean) => {
        setEstado(prev => ({...prev, cargando}));
    }, []);

    const setEnviando = useCallback((enviando: boolean) => {
        setEstado(prev => ({...prev, enviando}));
    }, []);

    /* Obtiene el equipo completo del usuario */
    const cargarEquipo = useCallback(async (): Promise<void> => {
        if (!haySesion()) {
            setEstado(prev => ({...prev, cargando: false}));
            return;
        }

        setCargando(true);
        setError(null);

        try {
            const datos = await apiFetch<EquipoRust>('/teams?page=1&perPage=50');

            setEstado(prev => ({
                ...prev,
                equipo: mapearEquipo(datos),
                pendientes: datos.counts?.received ?? 0,
                cargando: false,
                error: null
            }));
        } catch (error) {
            const status = (error as {status?: number})?.status;
            if (status === 401) {
                setEstado(prev => ({...prev, cargando: false}));
                return;
            }
            const mensaje = error instanceof Error ? error.message : 'Error desconocido';
            setEstado(prev => ({
                ...prev,
                cargando: false,
                error: mensaje
            }));
        }
    }, [setCargando, setError]);

    /* Cuenta solicitudes pendientes (para el badge del header) */
    const contarPendientes = useCallback(async (): Promise<number> => {
        if (!haySesion()) {
            return 0;
        }

        try {
            const datos = await apiFetch<{pending: number}>('/teams/pending-count');
            const pendientes = datos?.pending ?? 0;
            setEstado(prev => ({...prev, pendientes}));
            return pendientes;
        } catch {
            return 0;
        }
    }, []);

    /* Envía una solicitud de conexión por email */
    const enviarSolicitud = useCallback(
        async (email: string): Promise<AccionResultado> => {
            setEnviando(true);
            setError(null);

            try {
                await apiFetch('/teams/requests', {
                    method: 'POST',
                    body: JSON.stringify({email})
                });

                await cargarEquipo();
                return {exito: true, mensaje: 'Solicitud enviada correctamente'};
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error al enviar solicitud';
                setError(mensaje);
                return {exito: false, mensaje};
            } finally {
                setEnviando(false);
            }
        },
        [setEnviando, setError, cargarEquipo]
    );

    /* Acepta una solicitud recibida */
    const aceptarSolicitud = useCallback(
        async (solicitudId: number): Promise<AccionResultado> => {
            setEnviando(true);
            setError(null);

            try {
                await apiFetch(`/teams/requests/${solicitudId}`, {
                    method: 'PUT',
                    body: JSON.stringify({action: 'accept'})
                });

                await cargarEquipo();
                return {exito: true, mensaje: 'Solicitud aceptada'};
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error al aceptar solicitud';
                setError(mensaje);
                return {exito: false, mensaje};
            } finally {
                setEnviando(false);
            }
        },
        [setEnviando, setError, cargarEquipo]
    );

    /* Rechaza una solicitud recibida */
    const rechazarSolicitud = useCallback(
        async (solicitudId: number): Promise<AccionResultado> => {
            setEnviando(true);
            setError(null);

            try {
                await apiFetch(`/teams/requests/${solicitudId}`, {
                    method: 'PUT',
                    body: JSON.stringify({action: 'reject'})
                });

                await cargarEquipo();
                return {exito: true, mensaje: 'Solicitud rechazada'};
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error al rechazar solicitud';
                setError(mensaje);
                return {exito: false, mensaje};
            } finally {
                setEnviando(false);
            }
        },
        [setEnviando, setError, cargarEquipo]
    );

    /* Cancela una solicitud enviada o elimina una conexión */
    const eliminarConexion = useCallback(
        async (id: number): Promise<AccionResultado> => {
            setEnviando(true);
            setError(null);

            try {
                await apiFetch(`/teams/${id}`, {method: 'DELETE'});

                await cargarEquipo();
                return {exito: true, mensaje: 'Conexión eliminada'};
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error al eliminar conexión';
                setError(mensaje);
                return {exito: false, mensaje};
            } finally {
                setEnviando(false);
            }
        },
        [setEnviando, setError, cargarEquipo]
    );

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const INTERVALO_POLLING = 30000;

    /* Carga inicial y polling para actualizar el badge en tiempo real */
    useEffect(() => {
        if (!haySesion()) {
            return;
        }

        contarPendientes();
        intervalRef.current = setInterval(() => {
            contarPendientes();
        }, INTERVALO_POLLING);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [contarPendientes]);

    return {
        /* Estado */
        equipo: estado.equipo,
        recibidas: estado.equipo?.recibidas || [],
        enviadas: estado.equipo?.enviadas || [],
        companeros: estado.equipo?.companeros || [],
        contadores: estado.equipo?.contadores || {recibidas: 0, enviadas: 0, companeros: 0},
        pendientes: estado.pendientes,
        cargando: estado.cargando,
        enviando: estado.enviando,
        error: estado.error,

        /* Acciones */
        cargarEquipo,
        contarPendientes,
        enviarSolicitud,
        aceptarSolicitud,
        rechazarSolicitud,
        eliminarConexion,
        limpiarError: () => setError(null)
    };
}

export type UseEquiposReturn = ReturnType<typeof useEquipos>;

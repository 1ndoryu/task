/*
 * useModalEquipos
 * Hook que encapsula la lógica del modal de equipos.
 * Gestiona pestañas, solicitudes, compañeros y acciones CRUD.
 */

import {useEffect, useState, useCallback} from 'react';
import {useEquipos} from '../useEquipos';
import {useAlertas} from '../useAlertas';

type PestanaEquipos = 'recibidas' | 'enviadas' | 'companeros';

export interface UseModalEquiposProps {
    estaAbierto: boolean;
}

export interface UseModalEquiposReturn {
    /* Estado de equipos (delegado al hook existente) */
    equipos: ReturnType<typeof useEquipos>;
    pestanaActiva: PestanaEquipos;
    setPestanaActiva: (v: PestanaEquipos) => void;

    /* Acciones */
    manejarEnviarSolicitud: (email: string) => Promise<void>;
    manejarAceptar: (id: number) => Promise<void>;
    manejarRechazar: (id: number) => Promise<void>;
    manejarEliminar: (id: number) => Promise<void>;
}

export function useModalEquipos({estaAbierto}: UseModalEquiposProps): UseModalEquiposReturn {
    const equipos = useEquipos();
    const {mostrarExito, mostrarError} = useAlertas();
    const [pestanaActiva, setPestanaActiva] = useState<PestanaEquipos>('companeros');

    /* Cargar datos al abrir el modal */
    useEffect(() => {
        if (estaAbierto) {
            equipos.cargarEquipo();
        }
    }, [estaAbierto]);

    /* Si hay solicitudes pendientes, mostrar esa pestaña */
    useEffect(() => {
        if (estaAbierto && equipos.contadores.recibidas > 0) {
            setPestanaActiva('recibidas');
        }
    }, [estaAbierto, equipos.contadores.recibidas]);

    const manejarEnviarSolicitud = useCallback(async (email: string) => {
        const resultado = await equipos.enviarSolicitud(email);
        if (resultado.exito) {
            mostrarExito(resultado.mensaje);
            setPestanaActiva('enviadas');
        } else {
            mostrarError(resultado.mensaje);
        }
    }, [equipos, mostrarExito, mostrarError]);

    const manejarAceptar = useCallback(async (id: number) => {
        const resultado = await equipos.aceptarSolicitud(id);
        if (resultado.exito) {
            mostrarExito(resultado.mensaje);
        } else {
            mostrarError(resultado.mensaje);
        }
    }, [equipos, mostrarExito, mostrarError]);

    const manejarRechazar = useCallback(async (id: number) => {
        const resultado = await equipos.rechazarSolicitud(id);
        if (resultado.exito) {
            mostrarExito(resultado.mensaje);
        } else {
            mostrarError(resultado.mensaje);
        }
    }, [equipos, mostrarExito, mostrarError]);

    const manejarEliminar = useCallback(async (id: number) => {
        const resultado = await equipos.eliminarConexion(id);
        if (resultado.exito) {
            mostrarExito(resultado.mensaje);
        } else {
            mostrarError(resultado.mensaje);
        }
    }, [equipos, mostrarExito, mostrarError]);

    return {
        equipos,
        pestanaActiva,
        setPestanaActiva,
        manejarEnviarSolicitud,
        manejarAceptar,
        manejarRechazar,
        manejarEliminar
    };
}

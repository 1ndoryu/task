/*
 * usePanelAdministracion
 * Hook que encapsula toda la lógica del componente PanelAdministracion.
 * Maneja estado de usuarios, acciones administrativas y detalle de usuario.
 */

import {useEffect, useState} from 'react';
import {useAdministracion} from '../useAdministracion';
import type {UsuarioAdmin} from '../../types/dashboard';

type TabAdmin = 'usuarios' | 'feedback';

export interface UsePanelAdministracionParams {
    estaAbierto: boolean;
}

export interface UsePanelAdministracionReturn {
    admin: ReturnType<typeof useAdministracion>;
    usuarioDetalle: UsuarioAdmin | null;
    cargandoAccion: number | null;
    tabActiva: TabAdmin;
    setTabActiva: React.Dispatch<React.SetStateAction<TabAdmin>>;
    manejarActivarPremium: (userId: number, duracion?: number) => Promise<void>;
    manejarCancelarPremium: (userId: number) => Promise<void>;
    manejarExtenderTrial: (userId: number, dias: number) => Promise<void>;
    manejarVerDetalle: (usuario: UsuarioAdmin) => Promise<void>;
    cerrarDetalle: () => void;
}

export function usePanelAdministracion({estaAbierto}: UsePanelAdministracionParams): UsePanelAdministracionReturn {
    const admin = useAdministracion();
    const [usuarioDetalle, setUsuarioDetalle] = useState<UsuarioAdmin | null>(null);
    const [cargandoAccion, setCargandoAccion] = useState<number | null>(null);
    const [tabActiva, setTabActiva] = useState<TabAdmin>('usuarios');

    /* Cargar datos al abrir el panel */
    useEffect(() => {
        if (estaAbierto) {
            admin.cargarUsuarios();
            admin.cargarResumen();
        }
    }, [estaAbierto]);

    /* Manejar activar premium */
    const manejarActivarPremium = async (userId: number, duracion?: number) => {
        setCargandoAccion(userId);
        const resultado = await admin.activarPremium(userId, duracion);
        setCargandoAccion(null);

        if (resultado.exito && usuarioDetalle?.id === userId) {
            const actualizado = await admin.obtenerDetalleUsuario(userId);
            if (actualizado) {
                setUsuarioDetalle(actualizado);
            }
        }
    };

    /* Manejar cancelar premium */
    const manejarCancelarPremium = async (userId: number) => {
        setCargandoAccion(userId);
        const resultado = await admin.cancelarPremium(userId);
        setCargandoAccion(null);

        if (resultado.exito && usuarioDetalle?.id === userId) {
            const actualizado = await admin.obtenerDetalleUsuario(userId);
            if (actualizado) {
                setUsuarioDetalle(actualizado);
            }
        }
    };

    /* Manejar extender trial */
    const manejarExtenderTrial = async (userId: number, dias: number) => {
        setCargandoAccion(userId);
        const resultado = await admin.extenderTrial(userId, dias);
        setCargandoAccion(null);

        if (resultado.exito && usuarioDetalle?.id === userId) {
            const actualizado = await admin.obtenerDetalleUsuario(userId);
            if (actualizado) {
                setUsuarioDetalle(actualizado);
            }
        }
    };

    /* Manejar ver detalle */
    const manejarVerDetalle = async (usuario: UsuarioAdmin) => {
        const detalle = await admin.obtenerDetalleUsuario(usuario.id);
        if (detalle) {
            setUsuarioDetalle(detalle);
        }
    };

    /* Cerrar detalle */
    const cerrarDetalle = () => {
        setUsuarioDetalle(null);
    };

    return {
        admin,
        usuarioDetalle,
        cargandoAccion,
        tabActiva,
        setTabActiva,
        manejarActivarPremium,
        manejarCancelarPremium,
        manejarExtenderTrial,
        manejarVerDetalle,
        cerrarDetalle
    };
}

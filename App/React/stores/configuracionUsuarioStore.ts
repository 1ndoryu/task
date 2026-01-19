/**
 * Store de Configuración de Usuario (Zustand)
 *
 * Persiste las preferencias globales del usuario.
 * - Hora de fin del día (para noctámbulos)
 * - Tema (si decidimos moverlo aquí)
 * - Otras preferencias globales
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {configurarHoraFinDia} from '../utils/fecha';

interface ConfiguracionUsuarioState {
    horaFinDia: number; // 0 - 23 (hora de corte)
}

interface ConfiguracionUsuarioActions {
    setHoraFinDia: (hora: number) => void;
}

export type ConfiguracionUsuarioStore = ConfiguracionUsuarioState & ConfiguracionUsuarioActions;

export const useConfiguracionUsuarioStore = create<ConfiguracionUsuarioStore>()(
    persist(
        (set, get) => ({
            horaFinDia: 0, // Por defecto: medianoche

            setHoraFinDia: hora => {
                set({horaFinDia: hora});
                configurarHoraFinDia(hora); // Sincronizar con utilidad de fecha
            }
        }),
        {
            name: 'glory-config-usuario',
            onRehydrateStorage: () => state => {
                if (state) {
                    configurarHoraFinDia(state.horaFinDia);
                }
            }
        }
    )
);

export const useConfiguracionUsuario = () => {
    const horaFinDia = useConfiguracionUsuarioStore(state => state.horaFinDia);
    const setHoraFinDia = useConfiguracionUsuarioStore(state => state.setHoraFinDia);
    return {
        horaFinDia,
        setHoraFinDia
    };
};

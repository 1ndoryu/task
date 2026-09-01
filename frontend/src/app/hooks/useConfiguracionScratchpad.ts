import {useLocalStorage} from './useLocalStorage';

export type TamanoFuente = 'pequeno' | 'normal' | 'grande';
export type AlturaScratchpad = string;

export interface ConfiguracionScratchpad {
    tamanoFuente: TamanoFuente;
    altura: AlturaScratchpad;
    autoGuardadoIntervalo: number; // milisegundos
    /* [318A-14] Tabs de notas en el panel (cada nota es una tab). */
    usarTabsNotas: boolean;
}

export const CONFIG_SCRATCHPAD_DEFECTO: ConfiguracionScratchpad = {
    tamanoFuente: 'normal',
    altura: '100%',
    autoGuardadoIntervalo: 1500,
    usarTabsNotas: true
};

export function useConfiguracionScratchpad() {
    const {valor, setValor} = useLocalStorage<ConfiguracionScratchpad>('glory_config_scratchpad', {
        valorPorDefecto: CONFIG_SCRATCHPAD_DEFECTO
    });

    const cambiarTamanoFuente = (tamano: TamanoFuente) => {
        setValor(prev => ({...prev, tamanoFuente: tamano}));
    };

    const cambiarAltura = (altura: AlturaScratchpad) => {
        setValor(prev => ({...prev, altura: altura}));
    };

    const cambiarAutoGuardado = (intervalo: number) => {
        setValor(prev => ({...prev, autoGuardadoIntervalo: intervalo}));
    };

    /* [318A-14] Toggle de tabs de notas en el panel. */
    const toggleUsarTabsNotas = () => {
        setValor(prev => ({...prev, usarTabsNotas: !prev.usarTabsNotas}));
    };

    return {
        /* [318A-14] Merge con defaults: la config guardada puede ser anterior a
         * un campo nuevo (ej: usarTabsNotas), así que siempre se completa con
         * CONFIG_SCRATCHPAD_DEFECTO para que el campo nunca quede undefined. */
        configuracion: {...CONFIG_SCRATCHPAD_DEFECTO, ...valor},
        actualizarConfiguracion: setValor,
        cambiarTamanoFuente,
        cambiarAltura,
        cambiarAutoGuardado,
        toggleUsarTabsNotas
    };
}

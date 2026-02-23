/*
 * useConfigDeficitCalorico
 * Hook que gestiona el estado del formulario de configuración
 * del plugin de déficit calórico (datos TMB + API keys).
 */

import {useState} from 'react';
import {useDeficitCaloricoStore} from '../../stores/deficitCaloricoStore';
import {useShallow} from 'zustand/react/shallow';
import {calcularTDEE, obtenerMetodoCalculo} from '../../utils/calculoTMB';
import type {DatosUsuarioTMB} from '../../types/deficitCalorico';

interface UseConfigDeficitCaloricoParams {
    onCerrar: () => void;
}

export function useConfigDeficitCalorico({onCerrar}: UseConfigDeficitCaloricoParams) {
    const {datosUsuario, apiKeyGemini, apiKeyCalorieNinjas, guardarDatosUsuario, guardarApiKey} = useDeficitCaloricoStore(
        useShallow(s => ({
            datosUsuario: s.datosUsuario,
            apiKeyGemini: s.apiKeyGemini,
            apiKeyCalorieNinjas: s.apiKeyCalorieNinjas,
            guardarDatosUsuario: s.guardarDatosUsuario,
            guardarApiKey: s.guardarApiKey
        }))
    );

    const [datos, setDatos] = useState<DatosUsuarioTMB>({...datosUsuario});
    const [keyGroq, setKeyGroq] = useState(apiKeyGemini);
    const [keyNinjas, setKeyNinjas] = useState(apiKeyCalorieNinjas || '');
    const [mostrarKeyGroq, setMostrarKeyGroq] = useState(false);
    const [mostrarKeyNinjas, setMostrarKeyNinjas] = useState(false);

    const tdeePreview = calcularTDEE(datos);
    const metodo = obtenerMetodoCalculo(datos);

    const manejarGuardar = () => {
        guardarDatosUsuario(datos);
        guardarApiKey(keyGroq, keyNinjas);
        onCerrar();
    };

    const actualizarCampo = (campo: keyof DatosUsuarioTMB, valor: string) => {
        if (campo === 'sexo') {
            setDatos(prev => ({...prev, sexo: valor as 'masculino' | 'femenino'}));
            return;
        }
        if (campo === 'objetivoDeficit') {
            setDatos(prev => ({...prev, objetivoDeficit: valor as DatosUsuarioTMB['objetivoDeficit']}));
            return;
        }
        const numerico = valor === '' ? undefined : Number(valor);
        setDatos(prev => ({...prev, [campo]: numerico}));
    };

    return {
        datos,
        keyGroq, setKeyGroq,
        keyNinjas, setKeyNinjas,
        mostrarKeyGroq, setMostrarKeyGroq,
        mostrarKeyNinjas, setMostrarKeyNinjas,
        tdeePreview,
        metodo,
        manejarGuardar,
        actualizarCampo
    };
}

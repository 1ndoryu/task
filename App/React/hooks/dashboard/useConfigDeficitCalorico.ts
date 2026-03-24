/*
 * useConfigDeficitCalorico
 * Hook que gestiona el estado del formulario de configuración
 * del plugin de déficit calórico (datos TMB + API keys).
 */

import {useState, useCallback} from 'react';
import {useDeficitCaloricoStore} from '../../stores/deficitCaloricoStore';
import {useShallow} from 'zustand/react/shallow';
import {calcularTDEE, obtenerMetodoCalculo} from '../../utils/calculoTMB';
import type {DatosUsuarioTMB} from '../../types/deficitCalorico';
import type {OpcionSelect} from '../../components/ui/Select';

/* Opciones para el selector de sexo */
export const opcionesSexo: OpcionSelect[] = [
    {valor: 'masculino', etiqueta: 'Masculino'},
    {valor: 'femenino', etiqueta: 'Femenino'},
];

/* Opciones para el selector de objetivo de déficit */
export const opcionesObjetivoDeficit: OpcionSelect[] = [
    {valor: 'bajo', etiqueta: 'Bajo (-250 kcal/día)'},
    {valor: 'moderado', etiqueta: 'Moderado (-500 kcal/día)'},
    {valor: 'alto', etiqueta: 'Alto (-750 kcal/día)'},
    {valor: 'peligroso', etiqueta: 'Peligroso / Extremo (-1000 kcal/día)'},
];

interface UseConfigDeficitCaloricoParams {
    onCerrar: () => void;
}

export function useConfigDeficitCalorico({onCerrar}: UseConfigDeficitCaloricoParams) {
    const {datosUsuario, apiKeyGemini, guardarDatosUsuario, guardarApiKey} = useDeficitCaloricoStore(
        useShallow(s => ({
            datosUsuario: s.datosUsuario,
            apiKeyGemini: s.apiKeyGemini,
            guardarDatosUsuario: s.guardarDatosUsuario,
            guardarApiKey: s.guardarApiKey,
        }))
    );

    const [datos, setDatos] = useState<DatosUsuarioTMB>({...datosUsuario});
    const [keyGroq, setKeyGroq] = useState(apiKeyGemini);
    const [mostrarKeyGroq, setMostrarKeyGroq] = useState(false);

    const tdeePreview = calcularTDEE(datos);
    const metodo = obtenerMetodoCalculo(datos);

    const manejarGuardar = useCallback(() => {
        guardarDatosUsuario(datos);
        guardarApiKey(keyGroq);
        onCerrar();
    }, [datos, keyGroq, guardarDatosUsuario, guardarApiKey, onCerrar]);

    const actualizarCampo = useCallback((campo: keyof DatosUsuarioTMB, valor: string) => {
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
    }, []);

    const alternarKeyGroq = useCallback(() => {
        setMostrarKeyGroq(prev => !prev);
    }, []);

    return {
        datos,
        keyGroq, setKeyGroq,
        mostrarKeyGroq,
        tdeePreview,
        metodo,
        manejarGuardar,
        actualizarCampo,
        alternarKeyGroq,
    };
}

/*
 * useConfigDeficitCalorico
 * Hook que gestiona el estado del formulario de configuración
 * del plugin de déficit calórico (datos TMB + API keys).
 */

import {useState, useCallback} from 'react';
import {useDeficitCaloricoStore} from '../../stores/deficitCaloricoStore';
import {useIAStore} from '../../stores/iaStore';
import {proveedorTieneCredenciales} from '../../services/iaService';
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
    const {datosUsuario, guardarDatosUsuario} = useDeficitCaloricoStore(
        useShallow(s => ({
            datosUsuario: s.datosUsuario,
            guardarDatosUsuario: s.guardarDatosUsuario,
        }))
    );

    /* [105A-1] API key centralizada: lee de Asistente IA o legacy.
     * Admin no necesita key local: backend usa env rotado. */
    const proveedorIA = useIAStore(s => s.proveedor);
    const apiKeyIA = useIAStore(s => s.apiKey);
    const apiKeyDeepseek = useIAStore(s => s.apiKeyDeepseek);
    const apiKeyLegacy = useDeficitCaloricoStore(s => s.apiKeyGemini);
    const tieneApiKey = proveedorTieneCredenciales(proveedorIA, apiKeyIA || apiKeyLegacy, apiKeyDeepseek);

    const [datos, setDatos] = useState<DatosUsuarioTMB>({...datosUsuario});

    const tdeePreview = calcularTDEE(datos);
    const metodo = obtenerMetodoCalculo(datos);

    const manejarGuardar = useCallback(() => {
        guardarDatosUsuario(datos);
        onCerrar();
    }, [datos, guardarDatosUsuario, onCerrar]);

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

    return {
        datos,
        tieneApiKey,
        tdeePreview,
        metodo,
        manejarGuardar,
        actualizarCampo,
    };
}

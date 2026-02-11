/*
 * hooks/useDeficitCalorico.ts
 * Hook para el plugin de déficit calórico
 * Orquesta la estimación por IA, cálculo de TMB y gestión de comidas
 */

import {useCallback, useMemo, useRef} from 'react';
import {useDeficitCaloricoStore} from '../stores/deficitCaloricoStore';
import {usePluginsStore} from '../stores/pluginsStore';
import {calcularTDEE, obtenerMetodoCalculo} from '../utils/calculoTMB';
import {estimarCaloriasTexto, estimarCaloriasFoto} from '../services/geminiCaloriasService';
import type {ComidaRegistrada} from '../types/deficitCalorico';

function generarIdComida(): string {
    return `comida_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function obtenerFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
}

export function useDeficitCalorico() {
    const store = useDeficitCaloricoStore();
    /* Seleccionar directamente del state para referencia estable (evita loop infinito por objeto nuevo en cada snapshot) */
    const config = usePluginsStore(s => s.configuracionPlugins['deficit-calorico']) as unknown as {apiKey?: string} | undefined;
    const inputFotoRef = useRef<HTMLInputElement | null>(null);

    const apiKey = store.apiKeyGemini || config?.apiKey || '';

    /* TMB calculada */
    const tdee = useMemo(() => calcularTDEE(store.datosUsuario), [store.datosUsuario]);
    const metodoCalculo = useMemo(() => obtenerMetodoCalculo(store.datosUsuario), [store.datosUsuario]);

    /* Comidas de hoy */
    const comidasHoy = useMemo(() => {
        const hoy = obtenerFechaHoy();
        return store.comidas.filter(c => c.fecha === hoy);
    }, [store.comidas]);

    const caloriasHoy = useMemo(() => comidasHoy.reduce((sum, c) => sum + c.calorias, 0), [comidasHoy]);

    const deficit = tdee !== null ? tdee - caloriasHoy : null;

    /* Registrar comida por texto usando IA */
    const registrarPorTexto = useCallback(
        async (descripcion: string) => {
            if (!apiKey) {
                store.setErrorIA('Configura tu API Key de Gemini primero');
                return;
            }

            store.setCargandoIA(true);
            store.setErrorIA(null);

            try {
                const resultado = await estimarCaloriasTexto(descripcion, apiKey);
                const comida: ComidaRegistrada = {
                    id: generarIdComida(),
                    descripcion: resultado.descripcion || descripcion,
                    calorias: resultado.calorias,
                    proteinas: resultado.proteinas,
                    carbohidratos: resultado.carbohidratos,
                    grasas: resultado.grasas,
                    horaRegistro: Date.now(),
                    fecha: obtenerFechaHoy(),
                    fuenteEstimacion: 'ia'
                };
                store.agregarComida(comida);
            } catch (error) {
                store.setErrorIA(error instanceof Error ? error.message : 'Error al analizar');
            } finally {
                store.setCargandoIA(false);
            }
        },
        [apiKey, store]
    );

    /* Registrar comida por foto usando IA */
    const registrarPorFoto = useCallback(
        async (archivo: File) => {
            if (!apiKey) {
                store.setErrorIA('Configura tu API Key de Gemini primero');
                return;
            }

            store.setCargandoIA(true);
            store.setErrorIA(null);

            try {
                const resultado = await estimarCaloriasFoto(archivo, apiKey);
                const comida: ComidaRegistrada = {
                    id: generarIdComida(),
                    descripcion: resultado.descripcion,
                    calorias: resultado.calorias,
                    proteinas: resultado.proteinas,
                    carbohidratos: resultado.carbohidratos,
                    grasas: resultado.grasas,
                    horaRegistro: Date.now(),
                    fecha: obtenerFechaHoy(),
                    fuenteEstimacion: 'ia'
                };
                store.agregarComida(comida);
            } catch (error) {
                store.setErrorIA(error instanceof Error ? error.message : 'Error al analizar imagen');
            } finally {
                store.setCargandoIA(false);
            }
        },
        [apiKey, store]
    );

    return {
        comidasHoy,
        caloriasHoy,
        tdee,
        deficit,
        metodoCalculo,
        apiKey,
        datosUsuario: store.datosUsuario,
        cargandoIA: store.cargandoIA,
        errorIA: store.errorIA,
        historial: store.historial,
        inputFotoRef,
        registrarPorTexto,
        registrarPorFoto,
        eliminarComida: store.eliminarComida,
        guardarDatosUsuario: store.guardarDatosUsuario,
        guardarApiKey: store.guardarApiKey
    };
}

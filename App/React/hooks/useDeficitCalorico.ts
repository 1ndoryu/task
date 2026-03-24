/*
 * hooks/useDeficitCalorico.ts
 * Hook para el plugin de déficit calórico
 * Orquesta la estimación por IA, cálculo de TMB y gestión de comidas
 */

import {useCallback, useMemo} from 'react';
import {useDeficitCaloricoStore} from '../stores/deficitCaloricoStore';
import {usePluginsStore} from '../stores/pluginsStore';
import {calcularTDEE, obtenerMetodoCalculo} from '../utils/calculoTMB';
import {estimarCaloriasTexto} from '../services/geminiCaloriasService';
import type {ComidaRegistrada} from '../types/deficitCalorico';

function generarIdComida(): string {
    return `comida_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function obtenerFechaHoy(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function normalizarFecha(fecha: string | undefined): string {
    if (!fecha) return obtenerFechaHoy();
    return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : obtenerFechaHoy();
}

function construirMarcaTiempoParaFecha(fecha: string): number {
    const ahora = new Date();
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const marca = new Date(anio, (mes ?? 1) - 1, dia ?? 1, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds(), ahora.getMilliseconds());
    return Number.isNaN(marca.getTime()) ? ahora.getTime() : marca.getTime();
}

function deduplicarComidas(comidas: ComidaRegistrada[]): ComidaRegistrada[] {
    const mapa = new Map<string, ComidaRegistrada>();
    for (const comida of comidas) {
        mapa.set(comida.id, comida);
    }
    return Array.from(mapa.values());
}

export function useDeficitCalorico(fechaActiva?: string) {
    const store = useDeficitCaloricoStore();
    /* Seleccionar directamente del state para referencia estable (evita loop infinito por objeto nuevo en cada snapshot) */
    const config = usePluginsStore(s => s.configuracionPlugins['deficit-calorico']) as unknown as {apiKey?: string} | undefined;

    const apiKey = store.apiKeyGemini || config?.apiKey || '';
    const apiKeyNinjas = store.apiKeyCalorieNinjas || '';

    /* TMB calculada */
    const tdee = useMemo(() => calcularTDEE(store.datosUsuario), [store.datosUsuario]);
    const metodoCalculo = useMemo(() => obtenerMetodoCalculo(store.datosUsuario), [store.datosUsuario]);

    const fechaSeleccionada = useMemo(() => normalizarFecha(fechaActiva), [fechaActiva]);

    const comidasTotales = useMemo(() => {
        const historialComidas = store.historial.flatMap(registro => registro.comidas);
        return deduplicarComidas([...store.comidas, ...historialComidas]);
    }, [store.comidas, store.historial]);

    const comidasDelDia = useMemo(() => comidasTotales.filter(c => c.fecha === fechaSeleccionada), [comidasTotales, fechaSeleccionada]);

    const caloriasDelDia = useMemo(() => comidasDelDia.reduce((sum, c) => sum + c.calorias, 0), [comidasDelDia]);

    const deficit = tdee !== null ? tdee - caloriasDelDia : null;

    /* Registrar comida por texto usando IA */
    const registrarPorTexto = useCallback(
        async (descripcion: string, fechaObjetivo?: string) => {
            if (!apiKey) {
                store.setErrorIA('Configura tu API Key de Groq (IA) primero');
                return;
            }
            if (!apiKeyNinjas) {
                store.setErrorIA('Configura tu API Key de API Ninjas primero');
                return;
            }

            store.setCargandoIA(true);
            store.setErrorIA(null);

            try {
                const fechaRegistro = normalizarFecha(fechaObjetivo ?? fechaSeleccionada);
                const resultado = await estimarCaloriasTexto(descripcion, apiKey, apiKeyNinjas);
                const comida: ComidaRegistrada = {
                    id: generarIdComida(),
                    descripcion: resultado.descripcion || descripcion,
                    calorias: resultado.calorias,
                    proteinas: resultado.proteinas,
                    carbohidratos: resultado.carbohidratos,
                    grasas: resultado.grasas,
                    azucar: resultado.azucar,
                    horaRegistro: construirMarcaTiempoParaFecha(fechaRegistro),
                    fecha: fechaRegistro,
                    fuenteEstimacion: 'ia',
                    promptOriginal: descripcion /* Guardar input original para reintentar */,
                    logProceso: resultado.logProceso /* Guardar log de debugging */
                };
                store.agregarComida(comida);
            } catch (error) {
                store.setErrorIA(error instanceof Error ? error.message : 'Error al analizar');
            } finally {
                store.setCargandoIA(false);
            }
        },
        [apiKey, apiKeyNinjas, store, fechaSeleccionada]
    );

    return {
        fechaSeleccionada,
        comidasDelDia,
        caloriasDelDia,
        comidasTotales,
        /* Compatibilidad retro con consumers existentes */
        comidasHoy: comidasDelDia,
        caloriasHoy: caloriasDelDia,
        tdee,
        deficit,
        metodoCalculo,
        apiKey,
        datosUsuario: store.datosUsuario,
        cargandoIA: store.cargandoIA,
        errorIA: store.errorIA,
        historial: store.historial,
        registrarPorTexto,
        eliminarComida: store.eliminarComida,
        guardarDatosUsuario: store.guardarDatosUsuario,
        guardarApiKey: store.guardarApiKey
    };
}

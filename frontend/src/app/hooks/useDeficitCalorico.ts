/*
 * hooks/useDeficitCalorico.ts
 * Hook para el plugin de déficit calórico
 * Orquesta la estimación por IA, cálculo de TMB y gestión de comidas
 */

import {useCallback, useMemo} from 'react';
import {useDeficitCaloricoStore} from '../stores/deficitCaloricoStore';
import {useIAStore} from '../stores/iaStore';
import {usePluginsStore} from '../stores/pluginsStore';
import {calcularTDEE, obtenerMetodoCalculo} from '../utils/calculoTMB';
import {estimarCaloriasTexto} from '../services/geminiCaloriasService';
import {obtenerApiKeyParaProveedor, proveedorTieneCredenciales} from '../services/iaService';
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
    /* [H-F12-04] Selectores atómicos: el store completo re-renderiza el hook
     * con cualquier cambio; cada campo se selecciona por separado. */
    const datosUsuario = useDeficitCaloricoStore(s => s.datosUsuario);
    const comidas = useDeficitCaloricoStore(s => s.comidas);
    const historial = useDeficitCaloricoStore(s => s.historial);
    const apiKeyGemini = useDeficitCaloricoStore(s => s.apiKeyGemini);
    const errorIA = useDeficitCaloricoStore(s => s.errorIA);
    const cargandoIA = useDeficitCaloricoStore(s => s.cargandoIA);
    const setErrorIA = useDeficitCaloricoStore(s => s.setErrorIA);
    const setCargandoIA = useDeficitCaloricoStore(s => s.setCargandoIA);
    const agregarComida = useDeficitCaloricoStore(s => s.agregarComida);
    const eliminarComida = useDeficitCaloricoStore(s => s.eliminarComida);
    const guardarDatosUsuario = useDeficitCaloricoStore(s => s.guardarDatosUsuario);
    const guardarApiKey = useDeficitCaloricoStore(s => s.guardarApiKey);
    /* Seleccionar directamente del state para referencia estable (evita loop infinito por objeto nuevo en cada snapshot) */
    const config = usePluginsStore(s => s.configuracionPlugins['deficit-calorico']) as unknown as {apiKey?: string} | undefined;

    /* [105A-1] Centralización IA: Déficit Calórico ya no pide una key propia.
     * Usuarios normales usan Configuración → Asistente IA; admin usa env rotado por backend. */
    const apiKeyIA = useIAStore(s => s.apiKey);
    const apiKeyDeepseek = useIAStore(s => s.apiKeyDeepseek);
    const proveedorIA = useIAStore(s => s.proveedor);
    const modeloIA = useIAStore(s => s.modelo);
    const apiKeyActual = apiKeyGemini || obtenerApiKeyParaProveedor(proveedorIA, apiKeyIA || config?.apiKey || '', apiKeyDeepseek, '');
    const iaConfigurada = proveedorTieneCredenciales(proveedorIA, apiKeyIA || apiKeyGemini || config?.apiKey || '', apiKeyDeepseek, '');

    /* TMB calculada */
    const tdee = useMemo(() => calcularTDEE(datosUsuario), [datosUsuario]);
    const metodoCalculo = useMemo(() => obtenerMetodoCalculo(datosUsuario), [datosUsuario]);

    const fechaSeleccionada = useMemo(() => normalizarFecha(fechaActiva), [fechaActiva]);

    const comidasTotales = useMemo(() => {
        const historialComidas = historial.flatMap(registro => registro.comidas);
        return deduplicarComidas([...comidas, ...historialComidas]);
    }, [comidas, historial]);

    const comidasDelDia = useMemo(() => comidasTotales.filter(c => c.fecha === fechaSeleccionada), [comidasTotales, fechaSeleccionada]);

    const caloriasDelDia = useMemo(() => comidasDelDia.reduce((sum, c) => sum + c.calorias, 0), [comidasDelDia]);

    const deficit = tdee !== null ? tdee - caloriasDelDia : null;

    /* Registrar comida por texto usando IA */
    const registrarPorTexto = useCallback(
        async (descripcion: string, fechaObjetivo?: string) => {
            if (!iaConfigurada) {
                setErrorIA('Configura tu proveedor de IA en Configuración → Asistente IA');
                return;
            }

            setCargandoIA(true);
            setErrorIA(null);

            try {
                const fechaRegistro = normalizarFecha(fechaObjetivo ?? fechaSeleccionada);
                const resultado = await estimarCaloriasTexto(descripcion, {
                    proveedor: proveedorIA,
                    apiKey: apiKeyActual,
                    modelo: modeloIA
                });
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
                agregarComida(comida);
            } catch (error) {
                setErrorIA(error instanceof Error ? error.message : 'Error al analizar');
            } finally {
                setCargandoIA(false);
            }
        },
        [iaConfigurada, proveedorIA, apiKeyActual, modeloIA, setErrorIA, setCargandoIA, agregarComida, fechaSeleccionada]
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
        apiKey: iaConfigurada ? 'configurada' : '',
        datosUsuario,
        cargandoIA,
        errorIA,
        historial,
        registrarPorTexto,
        eliminarComida,
        guardarDatosUsuario,
        guardarApiKey
    };
}

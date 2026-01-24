/*
 * Utilidades para la calculadora de arbitraje
 * Funciones helper de formateo y cálculos auxiliares
 */

import type {RangoValor, TasasConversion} from '../types/arbitraje.types';

/* Formatear valor como moneda USD */
export function formatearMoneda(valor: number, decimales = 2): string {
    const signo = valor >= 0 ? '' : '-';
    return `${signo}$${Math.abs(valor).toFixed(decimales)}`;
}

/* Formatear número con separadores locales */
export function formatearNumero(valor: number, decimales = 2): string {
    return valor.toLocaleString('es-ES', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

/* Actualizar campo de un rango */
export function crearActualizadorRango(setter: React.Dispatch<React.SetStateAction<RangoValor>>): (campo: 'min' | 'max', valor: string) => void {
    return (campo, valor) => {
        const numerico = parseFloat(valor) || 0;
        setter(prev => ({...prev, [campo]: numerico}));
    };
}

/* Actualizar campo de tasas */
export function crearActualizadorTasa(setter: React.Dispatch<React.SetStateAction<TasasConversion>>): (campo: keyof TasasConversion, valor: string) => void {
    return (campo, valor) => {
        const numerico = parseFloat(valor) || 0;
        setter(prev => ({...prev, [campo]: numerico}));
    };
}

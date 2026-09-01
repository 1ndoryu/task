/*
 * CampoEspecificacion — especificación declarativa de un campo de configuración.
 * [318A-3] Cada campo se describe UNA vez (título, descripción, tipo de control,
 * opciones, rango, condicionales) y FormularioConfiguracion lo renderiza igual
 * en todos los modales/paneles.
 */

import type {ReactNode} from 'react';
import type {OpcionSelect} from '../ui/Select';

export type TipoCampo =
    | 'texto'
    | 'password'
    | 'numero'
    | 'select'
    | 'checkbox'
    | 'range'
    | 'textarea'
    | 'toggle'
    | 'info'; /* info = fila solo texto (sin control) */

export interface CampoEspecificacion<T> {
    /* Clave del campo; también es la React key estable (regla key-index). */
    clave: keyof T & string;
    titulo: string;
    descripcion?: ReactNode;
    tipo: TipoCampo;
    /* select: opciones del dropdown (valor string|number). */
    opciones?: OpcionSelect[];
    /* range/numero: límites y paso. */
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    maxLength?: number;
    /* textarea. */
    filas?: number;
    /* Formato de display, ej: temperatura.toFixed(1). */
    valorMostrar?: (valor: unknown) => string;
    /* Condicional (solo admin, solo modo X). */
    cuando?: (valores: T) => boolean;
    deshabilitado?: boolean;
    /* Lógica cruzada al cambiar (ej: al cambiar proveedor se ajusta modelo). */
    alCambiar?: (valor: unknown, valores: T) => void;
}
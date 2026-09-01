/*
 * FormularioConfiguracion — renderer declarativo de formularios de configuración.
 * [318A-3] Itera una lista de CampoEspecificacion, decide visibilidad con
 * `cuando`, renderiza el control correcto por `tipo` dentro de FormCampo y
 * aplica `valorMostrar`. Un solo layout, un solo comportamiento en todos los
 * modales/paneles de configuración.
 */

import {Fragment, type ReactNode} from 'react';
import {Checkbox, Input, Select, Textarea} from '../ui';
import {Range} from './Range';
import {ToggleSwitch} from './ToggleSwitch';
import {FormCampo} from './FormCampo';
import type {CampoEspecificacion} from './CampoEspecificacion';

export interface PropsFormularioConfiguracion<T> {
    campos: CampoEspecificacion<T>[];
    valores: T;
    alCambiar: (clave: keyof T & string, valor: unknown) => void;
    /* Separa cada campo con .separadorOpcionesConfig (default true). */
    conSeparadores?: boolean;
}

function esNumero(valor: unknown): valor is number {
    return typeof valor === 'number' && Number.isFinite(valor);
}

function controlDeCampo<T>(
    campo: CampoEspecificacion<T>,
    valores: T,
    alCambiar: (clave: keyof T & string, valor: unknown) => void,
): ReactNode {
    const valor = valores[campo.clave];
    const aplicar = (nuevoValor: unknown): void => {
        alCambiar(campo.clave, nuevoValor);
        campo.alCambiar?.(nuevoValor, valores);
    };

    switch (campo.tipo) {
        case 'texto':
        case 'password':
            return (
                <Input
                    tipo={campo.tipo === 'password' ? 'password' : 'text'}
                    value={String(valor ?? '')}
                    disabled={campo.deshabilitado}
                    placeholder={campo.placeholder}
                    maxLength={campo.maxLength}
                    onChange={e => aplicar(e.target.value)}
                />
            );
        case 'numero':
            return (
                <Input
                    tipo="number"
                    value={typeof valor === 'number' ? String(valor) : ''}
                    disabled={campo.deshabilitado}
                    min={campo.min}
                    max={campo.max}
                    step={campo.step}
                    placeholder={campo.placeholder}
                    onChange={e => aplicar(e.target.value === '' ? '' : Number(e.target.value))}
                />
            );
        case 'select': {
            const seleccion = campo.opciones ?? [];
            return (
                <Select
                    claseAdicional="selectOpcionConfig"
                    opciones={seleccion}
                    value={typeof valor === 'string' || typeof valor === 'number' ? valor : ''}
                    disabled={campo.deshabilitado}
                    placeholder={campo.placeholder}
                    onChange={e => {
                        const texto = e.target.value;
                        const opcion = seleccion.find(o => String(o.valor) === texto);
                        aplicar(opcion && typeof opcion.valor === 'number' ? Number(texto) : texto);
                    }}
                />
            );
        }
        case 'checkbox':
            return (
                <Checkbox
                    checked={Boolean(valor)}
                    disabled={campo.deshabilitado}
                    onChange={e => aplicar(e.target.checked)}
                />
            );
        case 'toggle':
            return (
                <ToggleSwitch
                    checked={Boolean(valor)}
                    disabled={campo.deshabilitado}
                    aria-label={campo.titulo}
                    onChange={aplicar}
                />
            );
        case 'range':
            return (
                <Range
                    min={campo.min ?? 0}
                    max={campo.max ?? 100}
                    step={campo.step ?? 1}
                    value={esNumero(valor) ? valor : campo.min ?? 0}
                    disabled={campo.deshabilitado}
                    aria-label={campo.titulo}
                    onChange={aplicar}
                />
            );
        case 'textarea':
            return (
                <Textarea
                    value={String(valor ?? '')}
                    disabled={campo.deshabilitado}
                    placeholder={campo.placeholder}
                    maxLength={campo.maxLength}
                    filas={campo.filas}
                    onChange={e => aplicar(e.target.value)}
                />
            );
        case 'info':
        default:
            return null;
    }
}

export function FormularioConfiguracion<T>({
    campos,
    valores,
    alCambiar,
    conSeparadores = true,
}: PropsFormularioConfiguracion<T>): JSX.Element {
    const visibles = campos.filter(campo => (campo.cuando ? campo.cuando(valores) : true));
    return (
        <div className="contenedorOpcionesConfig">
            {visibles.map((campo, indice) => (
                <Fragment key={campo.clave}>
                    <FormCampo
                        titulo={campo.titulo}
                        descripcion={campo.descripcion}
                        control={
                            campo.tipo === 'info'
                                ? undefined
                                : controlDeCampo(campo, valores, alCambiar)
                        }
                    />
                    {conSeparadores && indice < visibles.length - 1 && (
                        <div className="separadorOpcionesConfig" />
                    )}
                </Fragment>
            ))}
        </div>
    );
}
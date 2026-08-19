/*
 * config/validadoresIA.ts
 * [H-F15-01] Validadores de enums para acciones IA (extraídos de accionesIA.ts).
 */

export function validarPrioridad(val: unknown): 'muy_alta' | 'alta' | 'media' | 'baja' | 'muy_baja' | undefined {
    if (val === 'muy_alta' || val === 'alta' || val === 'media' || val === 'baja' || val === 'muy_baja') return val;
    return undefined;
}

export function validarUrgencia(val: unknown): 'bloqueante' | 'urgente' | 'normal' | 'chill' | undefined {
    if (val === 'bloqueante' || val === 'urgente' || val === 'normal' || val === 'chill') return val;
    return undefined;
}

export function validarImportancia(val: unknown): 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja' {
    if (val === 'Muy Alta' || val === 'Alta' || val === 'Media' || val === 'Baja' || val === 'Muy Baja') return val;
    return 'Media';
}

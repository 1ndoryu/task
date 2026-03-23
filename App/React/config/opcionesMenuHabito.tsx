/*
 * opcionesMenuHabito
 * Configuración centralizada de opciones del menú contextual para hábitos
 * Responsabilidad única: definir las opciones de menú reutilizables para hábitos
 *
 * Este archivo garantiza que las opciones del menú contextual de hábitos
 * sean idénticas en todos los paneles (Panel de Hábitos y Panel de Ejecución).
 *
 * Principios SOLID aplicados:
 * - SRP: Solo define opciones de menú
 * - OCP: Se puede extender agregando nuevas opciones sin modificar componentes
 * - DIP: Los componentes dependen de esta abstracción, no de definiciones propias
 */

import {Check, Calendar, Pause, Play, AlertTriangle, Star, Settings, Undo2} from 'lucide-react';
import type {OpcionMenu} from '../components/shared/MenuContextual';
import {opcionesMenuImportancia} from '../utils/nivelesConfig';

/*
 * Tipo para el estado actual del hábito que determina texto/iconos dinámicos
 */
interface EstadoHabitoMenu {
    completadoHoy: boolean;
    estaPausado: boolean;
    tieneActualizar: boolean;
    pospuestoHoy?: boolean;
}

/*
 * Genera las opciones de menú contextual para un hábito
 * @param estado - Estado actual del hábito (completado, pausado, etc.)
 * @returns Array de opciones de menú
 */
export function generarOpcionesMenuHabito(estado: EstadoHabitoMenu): OpcionMenu[] {
    const opciones: OpcionMenu[] = [
        {
            id: 'configurar',
            etiqueta: 'Configurar hábito',
            icono: <Settings size={12} />,
            separadorDespues: false
        },
        {
            id: 'toggle',
            etiqueta: estado.completadoHoy ? 'Desmarcar' : 'Marcar completado',
            icono: <Check size={12} />
        },
        {
            id: 'posponer',
            etiqueta: estado.pospuestoHoy ? 'Deshacer posposición' : 'Posponer hoy',
            icono: estado.pospuestoHoy ? <Undo2 size={12} /> : <Calendar size={12} />
        },
        {
            id: 'pausar',
            etiqueta: estado.estaPausado ? 'Reanudar hábito' : 'Pausar hábito',
            icono: estado.estaPausado ? <Play size={12} /> : <Pause size={12} />,
            separadorDespues: true
        }
    ];

    /* Submenú de importancia (solo si hay callback de actualizar) */
    if (estado.tieneActualizar) {
        opciones.push({
            id: 'importancia',
            etiqueta: 'Importancia',
            icono: <Star size={12} />,
            subOpciones: opcionesMenuImportancia(12).map(op => ({...op, id: `importancia-${op.id}`})),
            separadorDespues: true
        });
    }

    /* Eliminar siempre al final */
    opciones.push({
        id: 'eliminar',
        etiqueta: 'Eliminar',
        icono: <AlertTriangle size={12} />,
        peligroso: true
    });

    return opciones;
}

/*
 * IDs de opciones de menú conocidos para hábitos
 * Usar estos IDs evita typos y facilita el mantenimiento
 */
export const MENU_HABITO_IDS = {
    CONFIGURAR: 'configurar',
    TOGGLE: 'toggle',
    POSPONER: 'posponer',
    PAUSAR: 'pausar',
    EDITAR: 'editar',
    ELIMINAR: 'eliminar',
    IMPORTANCIA_PREFIX: 'importancia-'
} as const;

/*
 * Extrae el nivel de importancia de un ID de opción de importancia
 * @param opcionId - ID de la opción (ej: 'importancia-Alta')
 * @returns Nivel de importancia o null si no es una opción de importancia
 */
export function extraerImportanciaDeOpcion(opcionId: string): string | null {
    if (opcionId.startsWith(MENU_HABITO_IDS.IMPORTANCIA_PREFIX)) {
        return opcionId.replace(MENU_HABITO_IDS.IMPORTANCIA_PREFIX, '');
    }
    return null;
}

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

import {Check, Calendar, Pause, Play, AlertTriangle, Star, Settings, Undo2, Clock, Timer} from 'lucide-react';
import type {OpcionMenu} from '../components/shared/MenuContextual';
import {opcionesMenuImportancia} from '../utils/nivelesConfig';

/* [2303A-41] Opciones de tiempo para posponer con duración.
 * Compartidas entre menú de tareas y hábitos. */
/* sentinel-disable-next-line objeto-mutable-exportado — ya es 'as const' */
export const POSPONER_IDS = {
    HOY: 'posponer',
    UNA_HORA: 'posponer-1h',
    CUATRO_HORAS: 'posponer-4h',
    OCHO_HORAS: 'posponer-8h',
    MANANA: 'posponer-manana',
    DOS_DIAS: 'posponer-2d',
    UNA_SEMANA: 'posponer-1sem',
    QUITAR: 'posponer-quitar'
} as const;

/* Calcula la fecha ISO hasta la que se pospone según la opción seleccionada */
export function calcularFechaPosponer(opcionId: string): string | null {
    const ahora = new Date();
    switch (opcionId) {
        case POSPONER_IDS.UNA_HORA:
            return new Date(ahora.getTime() + 60 * 60 * 1000).toISOString();
        case POSPONER_IDS.CUATRO_HORAS:
            return new Date(ahora.getTime() + 4 * 60 * 60 * 1000).toISOString();
        case POSPONER_IDS.OCHO_HORAS:
            return new Date(ahora.getTime() + 8 * 60 * 60 * 1000).toISOString();
        case POSPONER_IDS.MANANA: {
            const manana = new Date(ahora);
            manana.setDate(manana.getDate() + 1);
            manana.setHours(8, 0, 0, 0);
            return manana.toISOString();
        }
        case POSPONER_IDS.DOS_DIAS:
            return new Date(ahora.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
        case POSPONER_IDS.UNA_SEMANA:
            return new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        case POSPONER_IDS.QUITAR:
            return null;
        default:
            return null;
    }
}

/* Genera las subOpciones de tiempo para el menú de posponer */
export function opcionesMenuPosponerTiempo(tienePospuesto: boolean): OpcionMenu[] {
    const opciones: OpcionMenu[] = [
        {id: POSPONER_IDS.UNA_HORA, etiqueta: '1 hora', icono: <Timer size={12} />},
        {id: POSPONER_IDS.CUATRO_HORAS, etiqueta: '4 horas', icono: <Timer size={12} />},
        {id: POSPONER_IDS.OCHO_HORAS, etiqueta: '8 horas', icono: <Timer size={12} />},
        {id: POSPONER_IDS.MANANA, etiqueta: '1 día', icono: <Calendar size={12} />},
        {id: POSPONER_IDS.DOS_DIAS, etiqueta: '2 días', icono: <Calendar size={12} />},
        {id: POSPONER_IDS.UNA_SEMANA, etiqueta: '1 semana', icono: <Calendar size={12} />}
    ];
    if (tienePospuesto) {
        opciones.push({id: POSPONER_IDS.QUITAR, etiqueta: 'Quitar posposición', icono: <Undo2 size={12} />, separadorDespues: false});
    }
    return opciones;
}

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
            etiqueta: 'Posponer',
            icono: <Clock size={12} />,
            subOpciones: [
                {
                    id: POSPONER_IDS.HOY,
                    etiqueta: estado.pospuestoHoy ? 'Deshacer omisión' : 'Omitir hoy',
                    icono: estado.pospuestoHoy ? <Undo2 size={12} /> : <Calendar size={12} />,
                    separadorDespues: true
                },
                ...opcionesMenuPosponerTiempo(false)
            ]
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
/* sentinel-disable-next-line objeto-mutable-exportado — ya es 'as const' */
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

/*
 * opcionesMenuUsuario.tsx
 * Configuración centralizada de opciones del menú de usuario
 * Garantiza consistencia entre escritorio y móvil
 *
 * Arquitectura SOLID:
 * - SRP: Solo define las opciones del menú de usuario
 * - OCP: Extensible via parámetros sin modificar base
 * - DRY: Una única fuente de verdad para ambas plataformas
 */

import type {ReactNode} from 'react';
import {Settings, Crown, ClipboardList, Download, Upload, LogOut, MessageSquarePlus, BarChart3} from 'lucide-react';

export interface OpcionMenuUsuario {
    id: string;
    etiqueta: string;
    icono: ReactNode;
    separadorDespues?: boolean;
    peligroso?: boolean;
    soloEscritorio?: boolean;
    soloMovil?: boolean;
    soloPremium?: boolean;
}

interface ConfiguracionMenuUsuario {
    esMovil: boolean;
    esPremium: boolean;
    version: string;
    tamanoIcono?: number;
}

/* [233A-43] Opciones reducidas: perfil, seguridad, backups, temas, mcp, plugins
 * ahora viven en el modal de configuración global */
export function obtenerOpcionesMenuUsuario(config: ConfiguracionMenuUsuario): OpcionMenuUsuario[] {
    const {esMovil, esPremium, version, tamanoIcono = esMovil ? 18 : 12} = config;

    const opcionesBase: OpcionMenuUsuario[] = [
        {
            id: 'configuracion',
            etiqueta: 'Configuración',
            icono: <Settings size={tamanoIcono} />,
            separadorDespues: true
        },
        {
            id: 'actividad',
            etiqueta: 'Actividad',
            icono: <BarChart3 size={tamanoIcono} />,
            soloMovil: true,
            separadorDespues: true
        }
    ];

    /* Opciones premium */
    if (esPremium) {
        opcionesBase.push(
            {
                id: 'plan',
                etiqueta: 'Plan Premium',
                icono: <Crown size={tamanoIcono} />,
                separadorDespues: true
            },
            {
                id: 'feedback',
                etiqueta: 'Enviar Comentarios',
                icono: <MessageSquarePlus size={tamanoIcono} />,
                soloPremium: true
            }
        );
    }

    /* Opciones de información y datos */
    opcionesBase.push(
        {
            id: 'version',
            etiqueta: `Versión ${version}`,
            icono: <ClipboardList size={tamanoIcono} />,
            separadorDespues: true
        },
        {
            id: 'exportar',
            etiqueta: 'Exportar datos',
            icono: <Download size={tamanoIcono} />,
            soloEscritorio: true
        },
        {
            id: 'importar',
            etiqueta: 'Importar datos',
            icono: <Upload size={tamanoIcono} />,
            separadorDespues: true,
            soloEscritorio: true
        }
    );

    /* Filtrar según plataforma */
    let opcionesFiltradas = opcionesBase;

    if (esMovil) {
        opcionesFiltradas = opcionesBase.filter(opcion => !opcion.soloEscritorio);
    } else {
        opcionesFiltradas = opcionesBase.filter(opcion => !opcion.soloMovil);
    }

    return opcionesFiltradas;
}

/*
 * Genera la opción de cerrar sesión (separada para control de posición)
 * Siempre va al final del menú
 */
export function obtenerOpcionCerrarSesion(tamanoIcono: number = 18): OpcionMenuUsuario {
    return {
        id: 'logout',
        etiqueta: 'Cerrar Sesión',
        icono: <LogOut size={tamanoIcono} />,
        peligroso: true
    };
}

/*
 * Opciones secundarias para móvil (admin, laboratorio)
 * Estas van en la sección secundaria del drawer
 */
export function obtenerOpcionesSecundariasMenúMovil(config: {esAdmin: boolean; mostrarExperimentos: boolean; tamanoIcono?: number}): OpcionMenuUsuario[] {
    const {esAdmin: _esAdmin, mostrarExperimentos: _mostrarExperimentos, tamanoIcono = 18} = config;
    const opciones: OpcionMenuUsuario[] = [];

    /*
     * Nota: Estas opciones están comentadas porque no van en móvil según ROADMAP
     * Se mantienen aquí para futuras referencias pero no se incluyen
     *
     * if (esAdmin) {
     *     opciones.push({
     *         id: 'admin',
     *         etiqueta: 'Administración',
     *         icono: <Settings size={tamanoIcono} />
     *     });
     * }
     *
     * if (mostrarExperimentos) {
     *     opciones.push({
     *         id: 'experimentos',
     *         etiqueta: 'Laboratorio',
     *         icono: <FlaskConical size={tamanoIcono} />
     *     });
     * }
     */

    /* Solo retornar la opción de cerrar sesión */
    opciones.push(obtenerOpcionCerrarSesion(tamanoIcono));

    return opciones;
}

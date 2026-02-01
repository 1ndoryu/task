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
import {User, Settings, Shield, Database, Palette, Plug, Crown, ClipboardList, Download, Upload, LogOut, MessageSquarePlus} from 'lucide-react';

export interface OpcionMenuUsuario {
    id: string;
    etiqueta: string;
    icono: ReactNode;
    separadorDespues?: boolean;
    peligroso?: boolean;
    soloEscritorio?: boolean;
    soloPremium?: boolean;
}

interface ConfiguracionMenuUsuario {
    esMovil: boolean;
    esPremium: boolean;
    version: string;
    tamanoIcono?: number;
}

/*
 * Genera las opciones del menú de usuario según la configuración
 * Filtra automáticamente opciones que no aplican en móvil
 */
export function obtenerOpcionesMenuUsuario(config: ConfiguracionMenuUsuario): OpcionMenuUsuario[] {
    const {esMovil, esPremium, version, tamanoIcono = esMovil ? 18 : 12} = config;

    const opcionesBase: OpcionMenuUsuario[] = [
        {
            id: 'perfil',
            etiqueta: 'Mi Perfil',
            icono: <User size={tamanoIcono} />
        },
        {
            id: 'configuracion',
            etiqueta: 'Configuración',
            icono: <Settings size={tamanoIcono} />
        },
        {
            id: 'seguridad',
            etiqueta: 'Seguridad',
            icono: <Shield size={tamanoIcono} />
        },
        {
            id: 'backups',
            etiqueta: 'Copias de Seguridad',
            icono: <Database size={tamanoIcono} />
        },
        {
            id: 'temas',
            etiqueta: 'Temas',
            icono: <Palette size={tamanoIcono} />
        },
        {
            id: 'mcp',
            etiqueta: 'Conectar con IA',
            icono: <Plug size={tamanoIcono} />,
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
    const {esAdmin, mostrarExperimentos, tamanoIcono = 18} = config;
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

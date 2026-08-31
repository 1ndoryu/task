/*
 * useTema
 * Hook para gestionar el tema visual del dashboard
 * Responsabilidad única: controlar el tema activo y persistirlo en localStorage
 */

import {useCallback, useEffect} from 'react';
import {useLocalStorage} from './useLocalStorage';

/*
 * Tipos de tema disponibles
 */
export type TipoTema = 'original' | 'claro';

interface UseTemaReturn {
    tema: TipoTema;
    cambiarTema: (nuevoTema: TipoTema) => void;
    cargando: boolean;
}

/*
 * Información descriptiva de cada tema
 */
export interface InfoTema {
    id: TipoTema;
    nombre: string;
    descripcion: string;
    colores: {
        fondo: string;
        texto: string;
        acento: string;
    };
}

/*
 * Catálogo de temas disponibles
 */
export const TEMAS_DISPONIBLES: InfoTema[] = [
    {
        id: 'original',
        nombre: 'Terminal',
        descripcion: 'Tema oscuro monocromo',
        colores: {
            fondo: '#000000',
            texto: '#ffffff',
            acento: '#ffffff'
        }
    },
    {
        id: 'claro',
        nombre: 'Claro',
        descripcion: 'Tema claro monocromo',
        colores: {
            fondo: '#ffffff',
            texto: '#000000',
            acento: '#000000'
        }
    }
];

const CLAVE_TEMA = 'dashboard_tema';
const TEMA_POR_DEFECTO: TipoTema = 'original';

/*
 * Valida que el valor sea un tema válido
 */
function validarTema(valor: unknown): boolean {
    return typeof valor === 'string' && ['original', 'claro'].includes(valor);
}

/*
 * Aplica el tema al documento cambiando el atributo data-theme
 */
function aplicarTemaAlDocumento(tema: TipoTema): void {
    document.documentElement.setAttribute('data-theme', tema);
}

/*
 * Hook principal para gestionar el tema
 */
export function useTema(): UseTemaReturn {
    const {
        valor: tema,
        setValor: setTema,
        cargando
    } = useLocalStorage<TipoTema>(CLAVE_TEMA, {
        valorPorDefecto: TEMA_POR_DEFECTO,
        validarValor: validarTema
    });

    /*
     * Aplica el tema al documento cuando cambia
     */
    useEffect(() => {
        if (!cargando) {
            aplicarTemaAlDocumento(tema);
        }
    }, [tema, cargando]);

    /*
     * Aplica el tema por defecto antes de que se cargue el localStorage
     * para evitar flash de contenido sin tema
     */
    useEffect(() => {
        const temaGuardado = localStorage.getItem(CLAVE_TEMA);
        if (temaGuardado) {
            try {
                const temaParsed = JSON.parse(temaGuardado);
                if (validarTema(temaParsed)) {
                    aplicarTemaAlDocumento(temaParsed as TipoTema);
                }
            } catch {
                aplicarTemaAlDocumento(TEMA_POR_DEFECTO);
            }
        } else {
            aplicarTemaAlDocumento(TEMA_POR_DEFECTO);
        }
    }, []);

    const cambiarTema = useCallback(
        (nuevoTema: TipoTema) => {
            setTema(nuevoTema);
            aplicarTemaAlDocumento(nuevoTema);
        },
        [setTema]
    );

    return {tema, cambiarTema, cargando};
}

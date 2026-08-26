/*
 * plugins/exp/store.ts
 * Store Zustand persist del plugin EXP (`glory-exp`).
 * Guarda vida, EXP, nivel, dificultades por entidad y registros; persiste en
 * localStorage y se sincroniza a las preferencias del servidor (coherencia
 * multinavegador). La dificultad de cada entidad también vive en su payload
 * (el upsert lo preserva); este store la cachea localmente para el cálculo.
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {ConfigExp, Dificultad, EstadoExp, RegistroExp, TipoEntidadExp} from './types';
import {CONFIG_EXP_POR_DEFECTO} from './types';
import {calcularExp, calcularNivel, type ParametrosExp} from './logica';
import {obtenerFechaHoy} from '../../utils/fecha';

interface ExpStore extends EstadoExp {
    config: ConfigExp;
    /* Acciones */
    registrarExp: (entidadId: number, entidadTipo: TipoEntidadExp, nombre: string, dificultad: Dificultad, importancia: 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja', multTipo: number) => number;
    asignarDificultad: (entidadId: number | string, dificultad: Dificultad) => void;
    asignarDificultades: (mapa: Record<string, Dificultad>) => void;
    actualizarVida: (nuevaVida: number, fechaCalculo: string) => void;
    actualizarConfig: (parcial: Partial<ConfigExp>) => void;
    restaurarDesdeServidor: (estado: Partial<EstadoExp> | null, config?: Partial<ConfigExp>) => void;
}

function crearIdRegistro(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useExpStore = create<ExpStore>()(
    persist(
        (set, get) => ({
            vida: 100,
            exp: 0,
            expEnNivel: 0,
            expParaSiguienteNivel: 100,
            nivel: 1,
            dificultades: {},
            registros: [],
            ultimaSync: 0,
            ultimoCalculoVida: '',
            config: {...CONFIG_EXP_POR_DEFECTO},

            registrarExp: (entidadId, entidadTipo, nombre, dificultad, importancia, multTipo) => {
                const params: ParametrosExp = {dificultad, importancia, multTipo};
                const exp = calcularExp(params);
                if (exp <= 0) return 0;

                const registro: RegistroExp = {
                    id: crearIdRegistro(),
                    fecha: obtenerFechaHoy(),
                    entidadId,
                    entidadTipo,
                    nombre,
                    dificultad,
                    exp
                };

                const nuevaExp = get().exp + exp;
                const nivelInfo = calcularNivel(nuevaExp, get().config.expBaseNivel);
                set({
                    exp: nuevaExp,
                    nivel: nivelInfo.nivel,
                    expEnNivel: nivelInfo.expEnNivel,
                    expParaSiguienteNivel: nivelInfo.expParaSiguienteNivel,
                    /* [26-08-2026] Límite de 5000 registros en el log local para
                     * no crecer sin control; los más antiguos se descartan. */
                    registros: [...get().registros.slice(-4999), registro]
                });
                return exp;
            },

            asignarDificultad: (entidadId, dificultad) => {
                set(state => ({
                    dificultades: {...state.dificultades, [String(entidadId)]: dificultad}
                }));
            },

            asignarDificultades: (mapa) => {
                set(state => ({dificultades: {...state.dificultades, ...mapa}}));
            },

            actualizarVida: (nuevaVida, fechaCalculo) => {
                set({vida: nuevaVida, ultimoCalculoVida: fechaCalculo});
            },

            actualizarConfig: (parcial) => {
                set(state => ({config: {...state.config, ...parcial}}));
            },

            restaurarDesdeServidor: (estado, config) => {
                if (!estado) return;
                set(s => ({
                    ...(typeof estado.vida === 'number' ? {vida: estado.vida} : {}),
                    ...(typeof estado.exp === 'number' ? {exp: estado.exp} : {}),
                    ...(typeof estado.nivel === 'number' ? {nivel: estado.nivel} : {}),
                    ...(typeof estado.expEnNivel === 'number' ? {expEnNivel: estado.expEnNivel} : {}),
                    ...(typeof estado.expParaSiguienteNivel === 'number' ? {expParaSiguienteNivel: estado.expParaSiguienteNivel} : {}),
                    ...(estado.dificultades && typeof estado.dificultades === 'object' ? {dificultades: {...s.dificultades, ...estado.dificultades}} : {}),
                    ...(Array.isArray(estado.registros) ? {registros: estado.registros} : {}),
                    ...(config ? {config: {...s.config, ...config}} : {})
                }));
            }
        }),
        {
            name: 'glory-exp'
        }
    )
);

/* Selector de conveniencia */
export const useExpActivo = () => useExpStore(s => s.vida);

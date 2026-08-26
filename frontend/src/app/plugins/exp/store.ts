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
import {migrarCopaLegacy} from './ArbolVida';

interface ExpStore extends EstadoExp {
    config: ConfigExp;
    /* Acciones */
    registrarExp: (entidadId: number, entidadTipo: TipoEntidadExp, nombre: string, dificultad: Dificultad, importancia: 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja', multTipo: number) => number;
    /* [27-08-2026] Revierte el último registro de EXP de una entidad (al
     * deshacer un completado): resta su exp, quita el registro y recalcula el
     * nivel. Devuelve la exp revertida (0 si no hay registro). */
    deshacerExp: (entidadId: number, entidadTipo: TipoEntidadExp) => number;
    /* [27-08-2026] Limpia registros huérfanos: un registro cuya entidad ya NO
     * está completada en esa fecha es fantasma (p. ej. se deshizo un completado
     * antes de existir la reversión). Solo elimina entidades presentes en los
     * mapas (las desconocidas se conservan para no perder datos en carga). */
    purgarRegistrosFantasma: (completadosHabitos: Map<number, string[]>, completadosTareas: Map<number, boolean>) => void;
    asignarDificultad: (entidadId: number | string, dificultad: Dificultad) => void;
    asignarDificultades: (mapa: Record<string, Dificultad>) => void;
    actualizarVida: (nuevaVida: number, fechaCalculo: string) => void;
    actualizarConfig: (parcial: Partial<ConfigExp>) => void;
    alternarMinimizado: () => void;
    /* [28-08-2026] Guarda la imagen editada por el usuario para un estado del
     * árbol (0/25/50/75/100). Recibe un Set de celdas con la imagen COMPLETA
     * (tronco incluido si el usuario lo conservó); se persiste como array y
     * reemplaza por completo a la por defecto en el render. */
    asignarCopaArbol: (estado: number, copa: Set<string>) => void;
    /* Elimina la edición del usuario para un estado (vuelve al árbol por defecto). */
    restablecerCopaArbol: (estado: number) => void;
    restaurarDesdeServidor: (estado: Partial<EstadoExp> | null, config?: Partial<ConfigExp>) => void;
}

/* Migración única de copasArbol legacy (v1: solo copa, sin tronco). Se ejecuta
 * al rehidratar el store (persist) y al restaurar desde el servidor; con el
 * flag copasArbolMigrado se garantiza que ocurre UNA sola vez, para que una
 * imagen editada a propósito SIN tronco no se confunda con datos legacy. */
function migrarCopasSiNecesario(state: EstadoExp): EstadoExp {
    if (state.copasArbolMigrado) return state;
    const copas: Record<string, string[]> = {};
    for (const [estado, celdas] of Object.entries(state.copasArbol || {})) {
        copas[estado] = Array.isArray(celdas) ? migrarCopaLegacy(celdas) : celdas;
    }
    return {...state, copasArbol: copas, copasArbolMigrado: true};
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
            minimizado: false,
            copasArbol: {},
            copasArbolMigrado: false,
            config: {...CONFIG_EXP_POR_DEFECTO},

            deshacerExp: (entidadId, entidadTipo) => {
                const {registros, exp} = get();
                /* El registro más reciente de esa entidad corresponde al
                 * completado que se está deshaciendo (el diff del hook solo
                 * revierte transiciones detectadas, y cada alta crea un
                 * registro que se quita al revertir). */
                for (let i = registros.length - 1; i >= 0; i--) {
                    const r = registros[i];
                    if (r.entidadId !== entidadId || r.entidadTipo !== entidadTipo) continue;
                    const nuevaExp = Math.max(0, exp - r.exp);
                    const nivelInfo = calcularNivel(nuevaExp, get().config.expBaseNivel);
                    set({
                        exp: nuevaExp,
                        nivel: nivelInfo.nivel,
                        expEnNivel: nivelInfo.expEnNivel,
                        expParaSiguienteNivel: nivelInfo.expParaSiguienteNivel,
                        registros: [...registros.slice(0, i), ...registros.slice(i + 1)]
                    });
                    return r.exp;
                }
                /* Sin registro (p. ej. la entidad ya estaba completada antes de
                 * activar el plugin): no hay exp que revertir. */
                return 0;
            },

            purgarRegistrosFantasma: (completadosHabitos, completadosTareas) => {
                const {registros} = get();
                if (registros.length === 0) return;
                const validos = registros.filter(r => {
                    if (r.entidadTipo === 'habito') {
                        const hist = completadosHabitos.get(r.entidadId);
                        if (hist === undefined) return true; /* no verificable aún */
                        return hist.includes(r.fecha);
                    }
                    if (r.entidadTipo === 'tarea') {
                        const completada = completadosTareas.get(r.entidadId);
                        if (completada === undefined) return true; /* no verificable aún */
                        return completada;
                    }
                    return true; /* subhabito/proyecto: conservar */
                });
                if (validos.length === registros.length) return;
                const nuevaExp = validos.reduce((acc, r) => acc + r.exp, 0);
                const nivelInfo = calcularNivel(nuevaExp, get().config.expBaseNivel);
                set({
                    registros: validos,
                    exp: nuevaExp,
                    nivel: nivelInfo.nivel,
                    expEnNivel: nivelInfo.expEnNivel,
                    expParaSiguienteNivel: nivelInfo.expParaSiguienteNivel
                });
            },

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

            alternarMinimizado: () => {
                set(state => ({minimizado: !state.minimizado}));
            },

            asignarCopaArbol: (estado, copa) => {
                set(state => ({
                    copasArbol: {...state.copasArbol, [String(estado)]: [...copa]}
                }));
            },

            restablecerCopaArbol: (estado) => {
                set(state => {
                    const {[String(estado)]: omitido, ...resto} = state.copasArbol;
                    return {copasArbol: resto};
                });
            },

            restaurarDesdeServidor: (estado, config) => {
                if (!estado) return;
                set(s => {
                    /* [28-08-2026] El blob del servidor puede ser legacy (v1:
                     * copa sin tronco, sin flag). Si el blob entrante NO lleva
                     * copasArbolMigrado, sus copas son legacy y hay que migrarlas
                     * ANTES de fusionarlas (si no, pisarían la migración local y
                     * el flag ya puesto evitaría re-migrar). Si el blob entrante
                     * SÍ está migrado, se respeta tal cual (el usuario pudo
                     * borrar el tronco a propósito). */
                    const entranteMigrado = estado.copasArbolMigrado === true;
                    const copasEntrantes: Record<string, string[]> = {};
                    if (estado.copasArbol && typeof estado.copasArbol === 'object') {
                        for (const [k, celdas] of Object.entries(estado.copasArbol)) {
                            if (!Array.isArray(celdas)) continue;
                            copasEntrantes[k] = entranteMigrado ? celdas : migrarCopaLegacy(celdas);
                        }
                    }
                    const fusionado: EstadoExp = {
                        ...s,
                        ...(typeof estado.vida === 'number' ? {vida: estado.vida} : {}),
                        ...(typeof estado.exp === 'number' ? {exp: estado.exp} : {}),
                        ...(typeof estado.nivel === 'number' ? {nivel: estado.nivel} : {}),
                        ...(typeof estado.expEnNivel === 'number' ? {expEnNivel: estado.expEnNivel} : {}),
                        ...(typeof estado.expParaSiguienteNivel === 'number' ? {expParaSiguienteNivel: estado.expParaSiguienteNivel} : {}),
                        ...(estado.dificultades && typeof estado.dificultades === 'object' ? {dificultades: {...s.dificultades, ...estado.dificultades}} : {}),
                        ...(Array.isArray(estado.registros) ? {registros: estado.registros} : {}),
                        ...(typeof estado.minimizado === 'boolean' ? {minimizado: estado.minimizado} : {}),
                        ...(Object.keys(copasEntrantes).length > 0 ? {copasArbol: {...s.copasArbol, ...copasEntrantes}} : {}),
                        copasArbolMigrado: s.copasArbolMigrado || entranteMigrado
                    };
                    return migrarCopasSiNecesario(fusionado);
                });
            }
        }),
        {
            name: 'glory-exp',
            /* Migrar los datos legacy del editor del árbol una sola vez al
             * rehidratar desde localStorage (antes de que cualquier render use
             * copasArbol). El flag evita re-fusionar el tronco sobre una imagen
             * editada a propósito sin tronco. */
            merge: (persistido, actual) => {
                /* El estado persistido convive con las acciones del store;
                 * la migración toca solo el fragmento de estado (copasArbol). */
                const base = {...actual, ...(persistido as object)} as ExpStore;
                return {...base, ...migrarCopasSiNecesario(base)};
            }
        }
    )
);

/* Selector de conveniencia */
export const useExpActivo = () => useExpStore(s => s.vida);

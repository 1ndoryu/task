/*
 * plugins/exp/useExpPlugin.ts
 * Hook orquestador del plugin EXP. Solo hace trabajo cuando el plugin está
 * ACTIVO (usePluginActivo('exp')). Responsabilidades:
 * 1. Rehidratar el store desde localStorage al activarse (el mecanismo LWW de
 *    preferencias ya restauró la clave 'glory-exp' del servidor si es un
 *    navegador nuevo; este hook la aplica al store en memoria).
 * 2. Recalcular la vida desde el historial real de hábitos (derivado, durable).
 * 3. Registrar EXP al completar tareas/hábitos (detecta completados nuevos por
 *    diff de snapshot y evita doble registro por re-render).
 * 4. Estimar dificultades pendientes (entidades sin dificultad) por IA/heurística.
 */

import {useCallback, useEffect, useMemo, useRef} from 'react';
import {usePluginActivo} from '../../stores/pluginsStore';
import {useExpStore} from './store';
import {useHabitosStore} from '../../stores/habitosStore';
import {useDashboardData} from '../../hooks/dashboard/useDashboardData';
import {obtenerFechaHoy} from '../../utils/fecha';
import {calcularVida, type HabitoParaVida} from './logica';
import {estimarDificultad} from './service';
import type {Dificultad} from './types';

/* El store persist de Zustand guarda {state, version} bajo 'glory-exp'. */
interface BlobGloryExp {
    state?: Partial<{
        vida: number;
        exp: number;
        nivel: number;
        expEnNivel: number;
        expParaSiguienteNivel: number;
        dificultades: Record<string, Dificultad>;
        registros: unknown[];
    }>;
    config?: Record<string, unknown>;
}

function leerBlobLocal(): BlobGloryExp | null {
    try {
        const crudo = localStorage.getItem('glory-exp');
        if (!crudo) return null;
        const parsed = JSON.parse(crudo) as BlobGloryExp;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

export function useExpPlugin(): void {
    const activo = usePluginActivo('exp');
    const registrarExp = useExpStore(s => s.registrarExp);
    const asignarDificultades = useExpStore(s => s.asignarDificultades);
    const actualizarVida = useExpStore(s => s.actualizarVida);
    const config = useExpStore(s => s.config);
    const ultimoCalculoVida = useExpStore(s => s.ultimoCalculoVida);
    const dificultades = useExpStore(s => s.dificultades);
    const restaurarDesdeServidor = useExpStore(s => s.restaurarDesdeServidor);

    const habitos = useHabitosStore(s => s.habitos);
    const {tareas} = useDashboardData();

    /* Snapshot previo para detectar completados nuevos (diff por fecha). */
    const prevSnapshotRef = useRef<{habitos: Record<number, string[]>; tareas: Record<number, boolean>}>({habitos: {}, tareas: {}});

    /* 1. Rehidratar desde localStorage al activarse (el blob ya fue restaurado
     * del servidor por aplicarPreferenciasServidor si era navegador nuevo). */
    const hidratadoRef = useRef(false);
    useEffect(() => {
        if (!activo || hidratadoRef.current) return;
        const blob = leerBlobLocal();
        if (blob?.state) {
            restaurarDesdeServidor(blob.state as never, blob.config as never);
        }
        hidratadoRef.current = true;
    }, [activo, restaurarDesdeServidor]);

    /* 2. Recalcular vida desde el historial real (derivado). Se ejecuta al
     * activar y una vez por día. */
    const fechaHoy = useMemo(() => obtenerFechaHoy(), []);
    const recalcularVida = useCallback(() => {
        if (!activo) return;
        if (ultimoCalculoVida === fechaHoy) return;

        const paraVida: HabitoParaVida[] = habitos.map(h => ({
            id: h.id,
            importancia: h.importancia,
            pausado: h.pausado,
            frecuencia: h.frecuencia as HabitoParaVida['frecuencia'],
            historialCompletados: h.historialCompletados || [],
            historialPospuestos: h.historialPospuestos || []
        }));
        const nuevaVida = calcularVida(paraVida, dificultades, {
            vidaMaxima: config.vidaMaxima,
            penalizacionFraccion: config.penalizacionFraccion,
            ventanaDias: config.ventanaIncumplimientos,
            fechaHoy
        });
        actualizarVida(nuevaVida, fechaHoy);
    }, [activo, habitos, dificultades, ultimoCalculoVida, fechaHoy, config, actualizarVida]);

    useEffect(() => {
        recalcularVida();
    }, [recalcularVida, activo]);

    /* 3. Registrar EXP por completados nuevos (diff sobre el snapshot previo). */
    useEffect(() => {
        if (!activo) return;
        const snapshot = prevSnapshotRef.current;
        const ahora = {habitos: {} as Record<number, string[]>, tareas: {} as Record<number, boolean>};
        const hoy = fechaHoy;

        for (const h of habitos) {
            ahora.habitos[h.id] = [...(h.historialCompletados || [])];
            const prev = snapshot.habitos[h.id];
            const recienCompletado = prev && !prev.includes(hoy) && (h.historialCompletados || []).includes(hoy);
            if (recienCompletado) {
                const dificultad: Dificultad = dificultades[String(h.id)] ?? 'Media';
                registrarExp(h.id, 'habito', h.nombre, dificultad, h.importancia, config.multHabito);
            }
        }

        for (const t of tareas) {
            ahora.tareas[t.id] = Boolean(t.completado);
            const prev = snapshot.tareas[t.id];
            const recienCompletado = prev === false && t.completado && (t.fechaCompletado ?? '').startsWith(hoy);
            if (recienCompletado) {
                const dificultad: Dificultad = dificultades[String(t.id)] ?? 'Media';
                const importancia = prioridadANivelImportancia((t.prioridad ?? 'media') as never);
                registrarExp(t.id, 'tarea', t.texto, dificultad, importancia, config.multTarea);
            }
        }

        prevSnapshotRef.current = ahora;
    }, [activo, habitos, tareas, dificultades, config, fechaHoy, registrarExp]);

    /* 4. Estimar dificultades pendientes (entidades sin dificultad) al activar,
     * en segundo plano y sin bloquear. Solo si config.dificultadAutomatica. */
    const pendientesRef = useRef(false);
    useEffect(() => {
        if (!activo || !config.dificultadAutomatica || pendientesRef.current) return;
        pendientesRef.current = true;

        const estimarPendientes = async () => {
            const pendientesHabitos = habitos.filter(h => !dificultades[String(h.id)]);
            const pendientesTareas = tareas.filter(t => !dificultades[String(t.id)]);
            if (pendientesHabitos.length === 0 && pendientesTareas.length === 0) {
                pendientesRef.current = false;
                return;
            }

            const mapa: Record<string, Dificultad> = {};
            /* Limitar el lote para no disparar N llamadas IA de golpe. */
            for (const h of pendientesHabitos.slice(0, 10)) {
                const dificultad = await estimarDificultad({
                    nombre: h.nombre,
                    importancia: h.importancia,
                    frecuenciaDesc: h.frecuencia?.tipo ?? 'diario',
                    extras: h.descripcion
                });
                mapa[String(h.id)] = dificultad;
            }
            for (const t of pendientesTareas.slice(0, 10)) {
                const dificultad = await estimarDificultad({
                    nombre: t.texto,
                    importancia: prioridadANivelImportancia((t.prioridad ?? 'media') as never),
                    frecuenciaDesc: 'una vez',
                    extras: t.configuracion?.descripcion
                });
                mapa[String(t.id)] = dificultad;
            }
            if (Object.keys(mapa).length > 0) {
                asignarDificultades(mapa);
            }
            pendientesRef.current = false;
        };

        estimarPendientes().catch(() => { pendientesRef.current = false; });
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [activo, config.dificultadAutomatica]);
}

function prioridadANivelImportancia(p: 'muy_alta' | 'alta' | 'media' | 'baja' | 'muy_baja'): 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja' {
    switch (p) {
        case 'muy_alta': return 'Muy Alta';
        case 'alta': return 'Alta';
        case 'baja': return 'Baja';
        case 'muy_baja': return 'Muy Baja';
        default: return 'Media';
    }
}

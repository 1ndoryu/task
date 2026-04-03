import {useLocalStorage} from './useLocalStorage';
import {useEsMovil} from './useEsMovil';

export interface ColumnasHabitos {
    indice: boolean;
    nombre: boolean;
    historial: boolean;
    racha: boolean;
    frecuencia: boolean;
    importancia: boolean;
    tocaHoy: boolean;
    acciones: boolean;
    urgencia: boolean;
    inactividad: boolean;
}

/*
 * Presets de tolerancia de urgencia para hábitos
 * Define cuántos días de inactividad se necesitan para cada nivel de urgencia
 */
export type ToleranciaPreset = 'muyEstricto' | 'estricto' | 'moderado' | 'relajado' | 'personalizado';

export interface UmbralesUrgencia {
    normal: number;
    urgente: number;
    bloqueante: number;
}

export const TOLERANCIA_PRESETS: Record<ToleranciaPreset, UmbralesUrgencia> = {
    muyEstricto: {normal: 1, urgente: 1, bloqueante: 2},
    estricto: {normal: 1, urgente: 2, bloqueante: 4},
    moderado: {normal: 1, urgente: 3, bloqueante: 5},
    relajado: {normal: 3, urgente: 7, bloqueante: 14}
} as Record<ToleranciaPreset, UmbralesUrgencia>;

export interface ConfiguracionHabitos {
    ocultarCompletadosHoy: boolean;
    modoCompacto: boolean;
    mostrarPausados: boolean;
    columnasVisibles: ColumnasHabitos;
    toleranciaPreset: ToleranciaPreset;
    umbralesPersonalizados: UmbralesUrgencia;
}

/*
 * Configuración de columnas por defecto para desktop
 * Incluye frecuencia, tocaHoy y más opciones visuales
 * historial: true para mostrar Actividad (5 días) por defecto en Beta
 */
export const COLUMNAS_DESKTOP_POR_DEFECTO: ColumnasHabitos = {
    indice: true,
    nombre: true,
    historial: true,
    racha: false,
    frecuencia: true,
    importancia: true,
    tocaHoy: true,
    acciones: false,
    urgencia: false,
    inactividad: false
};

/*
 * Configuración de columnas por defecto para móvil
 * Solo columnas esenciales: checkbox, nombre, historial e importancia
 * Layout esperado: [x] | Nombre del Habito | *o**o | ALTA
 */
export const COLUMNAS_MOVIL_POR_DEFECTO: ColumnasHabitos = {
    indice: true,
    nombre: true,
    historial: true,
    racha: false,
    frecuencia: false,
    importancia: true,
    tocaHoy: false,
    acciones: false,
    urgencia: false,
    inactividad: false
};

/* Mantener compatibilidad con código existente */
export const COLUMNAS_POR_DEFECTO: ColumnasHabitos = COLUMNAS_DESKTOP_POR_DEFECTO;

/* 
 * Configuración por defecto de hábitos
 * modoCompacto: false para mostrar vista detallada inicialmente (Beta feedback)
 */
export const CONFIG_HABITOS_DESKTOP_POR_DEFECTO: ConfiguracionHabitos = {
    ocultarCompletadosHoy: false,
    modoCompacto: false,
    mostrarPausados: true,
    columnasVisibles: COLUMNAS_DESKTOP_POR_DEFECTO,
    toleranciaPreset: 'moderado',
    umbralesPersonalizados: {normal: 1, urgente: 3, bloqueante: 5}
};

export const CONFIG_HABITOS_MOVIL_POR_DEFECTO: ConfiguracionHabitos = {
    ocultarCompletadosHoy: false,
    modoCompacto: false,
    mostrarPausados: true,
    columnasVisibles: COLUMNAS_MOVIL_POR_DEFECTO,
    toleranciaPreset: 'moderado',
    umbralesPersonalizados: {normal: 1, urgente: 3, bloqueante: 5}
};

/* Mantener compatibilidad con código existente */
export const CONFIG_HABITOS_POR_DEFECTO: ConfiguracionHabitos = CONFIG_HABITOS_DESKTOP_POR_DEFECTO;

/* Keys de localStorage separadas por dispositivo */
const STORAGE_KEY_DESKTOP = 'glory_config_habitos_desktop';
const STORAGE_KEY_MOVIL = 'glory_config_habitos_movil';

export function useConfiguracionHabitos() {
    const {esTablet: esMovil} = useEsMovil();

    /* Seleccionar key y defaults según dispositivo */
    const storageKey = esMovil ? STORAGE_KEY_MOVIL : STORAGE_KEY_DESKTOP;
    const configPorDefecto = esMovil ? CONFIG_HABITOS_MOVIL_POR_DEFECTO : CONFIG_HABITOS_DESKTOP_POR_DEFECTO;
    const columnasPorDefecto = esMovil ? COLUMNAS_MOVIL_POR_DEFECTO : COLUMNAS_DESKTOP_POR_DEFECTO;

    const {valor: valorGuardado, setValor} = useLocalStorage<ConfiguracionHabitos>(storageKey, {
        valorPorDefecto: configPorDefecto
    });

    /*
     * Merge de columnas: asegurar que nuevas columnas se agreguen
     * aunque el usuario tenga configuración antigua
     * [014A-13] En móvil, modoCompacto siempre activo — no es configurable
     */
    const valor: ConfiguracionHabitos = {
        ...configPorDefecto,
        ...valorGuardado,
        ...(esMovil ? {modoCompacto: true} : {}),
        columnasVisibles: {
            ...columnasPorDefecto,
            ...valorGuardado.columnasVisibles
        }
    };

    const toggleOcultarCompletadosHoy = () => {
        setValor(prev => ({...prev, ocultarCompletadosHoy: !prev.ocultarCompletadosHoy}));
    };

    const toggleModoCompacto = () => {
        setValor(prev => ({...prev, modoCompacto: !prev.modoCompacto}));
    };

    const toggleMostrarPausados = () => {
        setValor(prev => ({...prev, mostrarPausados: !prev.mostrarPausados}));
    };

    const toggleColumnaVisible = (columna: keyof ColumnasHabitos) => {
        setValor(prev => ({
            ...prev,
            columnasVisibles: {
                ...prev.columnasVisibles,
                [columna]: !prev.columnasVisibles[columna]
            }
        }));
    };

    const cambiarToleranciaPreset = (preset: ToleranciaPreset) => {
        setValor(prev => ({...prev, toleranciaPreset: preset}));
    };

    const actualizarUmbralesPersonalizados = (umbrales: UmbralesUrgencia) => {
        setValor(prev => ({
            ...prev,
            toleranciaPreset: 'personalizado',
            umbralesPersonalizados: umbrales
        }));
    };

    /* Obtener los umbrales efectivos según el preset actual */
    const obtenerUmbralesActuales = (): UmbralesUrgencia => {
        if (valor.toleranciaPreset === 'personalizado') {
            return valor.umbralesPersonalizados;
        }
        return TOLERANCIA_PRESETS[valor.toleranciaPreset] || TOLERANCIA_PRESETS.moderado;
    };

    return {
        configuracion: valor,
        esMovil,
        actualizarConfiguracion: setValor,
        toggleOcultarCompletadosHoy,
        toggleModoCompacto,
        toggleMostrarPausados,
        toggleColumnaVisible,
        cambiarToleranciaPreset,
        actualizarUmbralesPersonalizados,
        obtenerUmbralesActuales
    };
}

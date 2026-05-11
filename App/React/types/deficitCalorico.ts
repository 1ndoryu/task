/*
 * types/deficitCalorico.ts
 * Tipos para el plugin de déficit calórico
 * Define comidas, configuración de usuario y estado del seguimiento
 */

/* Datos del usuario para cálculo de TMB */
export interface DatosUsuarioTMB {
    altura?: number;
    peso?: number;
    cintura?: number;
    edad?: number;
    sexo?: 'masculino' | 'femenino';
    ejercicioSesiones?: number;
    ejercicioMinutos?: number;
    objetivoDeficit?: 'bajo' | 'moderado' | 'alto' | 'peligroso' /* Nivel de déficit */;
}

/* Comida registrada con estimación calórica */
export interface ComidaRegistrada {
    id: string;
    descripcion: string;
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
    azucar?: number /* Nuevo campo para azúcar */;
    fotoUrl?: string;
    horaRegistro: number;
    fecha: string;
    fuenteEstimacion: 'ia' | 'manual';
    promptOriginal?: string /* Input original del usuario para reintentar */;
    logProceso?: string[] /* Log del proceso de IA para inspección */;
}

/* Registro diario de alimentación */
export interface RegistroDiario {
    fecha: string;
    comidas: ComidaRegistrada[];
    totalCalorias: number;
    tmb: number;
    deficit: number;
}

/* Estado persistido del store */
export interface DeficitCaloricoState {
    datosUsuario: DatosUsuarioTMB;
    apiKeyGemini: string /* Campo legacy: API key local antigua de IA nutricional */;
    comidas: ComidaRegistrada[];
    historial: RegistroDiario[];
    cargandoIA: boolean;
    errorIA: string | null;
}

/* Acciones del store */
export interface DeficitCaloricoActions {
    guardarDatosUsuario: (datos: Partial<DatosUsuarioTMB>) => void;
    guardarApiKey: (keyIA: string) => void;
    agregarComida: (comida: ComidaRegistrada) => void;
    eliminarComida: (comidaId: string) => void;
    setCargandoIA: (cargando: boolean) => void;
    setErrorIA: (error: string | null) => void;
    obtenerComidasHoy: () => ComidaRegistrada[];
    obtenerCaloriasHoy: () => number;
    consolidarDia: (fecha: string, tmb: number) => void;
    obtenerHistorial: (dias: number) => RegistroDiario[];
}

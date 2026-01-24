/*
 * Tipos para la calculadora de arbitraje
 * Centraliza todas las interfaces y tipos del módulo
 */

export interface RangoValor {
    min: number;
    max: number;
}

export interface TasasConversion {
    usdABs: number;
    bsAPaypal: number;
    usdtAPaypal: number;
    comisionBinance: number;
    comisionPaypal: number; /* Porcentaje de comisión que cobra PayPal, ej: 5.7 */
}

export interface PasoConversion {
    descripcion: string;
    entrada: number;
    salida: number;
    unidadEntrada: string;
    unidadSalida: string;
    tasa?: string;
    comision?: number;
}

export interface DetalleRuta {
    pasos: PasoConversion[];
    totalFinal: number;
    ganancia: number;
}

export interface ResultadoEscenario {
    nombre: string;
    tipo: 'pesimista' | 'realista' | 'optimista';
    costoTotal: number;
    ventaUsd: number;
    gananciaRutaA: number;
    gananciaRutaB: number;
    mejorRuta: 'A' | 'B';
    roi: number;
    margen: number;
    breakeven: number;
    detalleRutaA: DetalleRuta;
    detalleRutaB: DetalleRuta;
}

export type ModoSimulacion = 'fijo' | 'reinversion';

export type TipoEscenario = 'pesimista' | 'realista' | 'optimista';

export interface EstadoViabilidad {
    estado: 'viable' | 'riesgoso' | 'noViable';
    mensaje: string;
}

export interface SimulacionCiclos {
    pesimista: number;
    realista: number;
    optimista: number;
    inversionTotal: number;
    capitalFinalPesimista: number;
    capitalFinalRealista: number;
    capitalFinalOptimista: number;
}

/* Props de los componentes */
export interface ArbitrajeIslandProps {
    titulo?: string;
}

export interface ModalDetalleRutaProps {
    ruta: 'A' | 'B';
    detalle: DetalleRuta;
    costoTotal: number;
    onCerrar: () => void;
}

export interface CabeceraArbitrajeProps {
    titulo: string;
    viabilidad: EstadoViabilidad;
}

export interface ResumenRapidoProps {
    escenarioRealista: ResultadoEscenario;
}

export interface PanelInputsProps {
    costoProducto: RangoValor;
    costoEnvio: RangoValor;
    precioVenta: RangoValor;
    tasas: TasasConversion;
    onCostoProductoChange: (campo: 'min' | 'max', valor: string) => void;
    onCostoEnvioChange: (campo: 'min' | 'max', valor: string) => void;
    onPrecioVentaChange: (campo: 'min' | 'max', valor: string) => void;
    onTasaChange: (campo: keyof TasasConversion, valor: string) => void;
}

export interface TarjetaEscenarioProps {
    escenario: ResultadoEscenario;
}

export interface TablaComparacionProps {
    escenarioRealista: ResultadoEscenario;
    onVerDetalle: (ruta: 'A' | 'B') => void;
}

export interface SimuladorCiclosProps {
    numeroCiclos: number;
    modoSimulacion: ModoSimulacion;
    simulacionCiclos: SimulacionCiclos;
    costoTotalRealista: number;
    onNumeroCiclosChange: (valor: number) => void;
    onModoSimulacionChange: (modo: ModoSimulacion) => void;
}

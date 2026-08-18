/*
 * ArbitrajeIsland.tsx
 * Calculadora de arbitraje para compra/venta internacional
 *
 * Flujo: Compra eBay → Venta local → Conversión USD→Bs→USDT→PayPal
 * Compara dos rutas de conversión y simula ganancias por ciclos
 *
 * Refactorizado: Componente orquestador que delega en subcomponentes
 */

import {useState} from 'react';
import type {ArbitrajeIslandProps, DetalleRuta, TasasConversion} from '../components/arbitraje';
import {useArbitraje, ModalDetalleRuta, CabeceraArbitraje, ResumenRapido, TarjetaEscenario, TablaComparacion, SimuladorCiclos, PanelInputs} from '../components/arbitraje';

/* Componente principal - Orquestador */
export function ArbitrajeIsland({titulo = 'Calculadora de Arbitraje'}: ArbitrajeIslandProps): JSX.Element {
    /* Hook que contiene toda la lógica de estado y cálculos */
    const {costoProducto, costoEnvio, precioVenta, tasas, numeroCiclos, modoSimulacion, setCostoProducto, setCostoEnvio, setPrecioVenta, setTasas, setNumeroCiclos, setModoSimulacion, escenarios, simulacionCiclos, viabilidad} = useArbitraje();

    /* Estado para modal de detalle */
    const [modalDetalle, setModalDetalle] = useState<{ruta: 'A' | 'B'; detalle: DetalleRuta; costoTotal: number} | null>(null);

    /* Handlers para actualizar rangos */
    const handleCostoProductoChange = (campo: 'min' | 'max', valor: string) => {
        const numerico = parseFloat(valor) || 0;
        setCostoProducto(prev => ({...prev, [campo]: numerico}));
    };

    const handleCostoEnvioChange = (campo: 'min' | 'max', valor: string) => {
        const numerico = parseFloat(valor) || 0;
        setCostoEnvio(prev => ({...prev, [campo]: numerico}));
    };

    const handlePrecioVentaChange = (campo: 'min' | 'max', valor: string) => {
        const numerico = parseFloat(valor) || 0;
        setPrecioVenta(prev => ({...prev, [campo]: numerico}));
    };

    const handleTasaChange = (campo: keyof TasasConversion, valor: string) => {
        const numerico = parseFloat(valor) || 0;
        setTasas(prev => ({...prev, [campo]: numerico}));
    };

    /* Abrir modal de detalle de ruta */
    const abrirDetalleRuta = (ruta: 'A' | 'B') => {
        const escenarioRealista = escenarios[1];
        const detalle = ruta === 'A' ? escenarioRealista.detalleRutaA : escenarioRealista.detalleRutaB;
        setModalDetalle({ruta, detalle, costoTotal: escenarioRealista.costoTotal});
    };

    /* Escenario realista para componentes que lo usan */
    const escenarioRealista = escenarios[1];

    return (
        <div id="calculadoraArbitraje" className="contenedorArbitraje">
            {/* Modal de detalle */}
            {modalDetalle && <ModalDetalleRuta ruta={modalDetalle.ruta} detalle={modalDetalle.detalle} costoTotal={modalDetalle.costoTotal} onCerrar={() => setModalDetalle(null)} />}

            {/* Cabecera */}
            <CabeceraArbitraje titulo={titulo} viabilidad={viabilidad} />

            {/* Resumen rápido */}
            <ResumenRapido escenarioRealista={escenarioRealista} />

            {/* Layout principal */}
            <div className="layoutArbitraje">
                {/* Panel de inputs */}
                <PanelInputs costoProducto={costoProducto} costoEnvio={costoEnvio} precioVenta={precioVenta} tasas={tasas} onCostoProductoChange={handleCostoProductoChange} onCostoEnvioChange={handleCostoEnvioChange} onPrecioVentaChange={handlePrecioVentaChange} onTasaChange={handleTasaChange} />

                {/* Panel de resultados */}
                <main className="panelResultados">
                    {/* Tarjetas de escenarios */}
                    <div className="tarjetasEscenarios">
                        {escenarios.map(escenario => (
                            <TarjetaEscenario key={escenario.tipo} escenario={escenario} />
                        ))}
                    </div>

                    {/* Comparación de rutas */}
                    <TablaComparacion escenarioRealista={escenarioRealista} onVerDetalle={abrirDetalleRuta} />

                    {/* Simulador de ciclos */}
                    <SimuladorCiclos numeroCiclos={numeroCiclos} modoSimulacion={modoSimulacion} simulacionCiclos={simulacionCiclos} costoTotalRealista={escenarioRealista.costoTotal} onNumeroCiclosChange={setNumeroCiclos} onModoSimulacionChange={setModoSimulacion} />
                </main>
            </div>
        </div>
    );
}

export default ArbitrajeIsland;

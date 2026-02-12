/**
 * ModalUpgrade
 *
 * Modal que muestra los beneficios de Premium y permite
 * proceder al checkout con Stripe.
 * El trial se configura directamente en Stripe (14 dias de prueba).
 *
 * @package App/React/components/shared
 */

import {useState} from 'react';
import {Modal} from './Modal';
import {Boton} from '../ui';
import {useStripe} from '../../hooks/useStripe';
import type {InfoSuscripcion} from '../../types/dashboard';

interface ModalUpgradeProps {
    visible: boolean;
    onCerrar: () => void;
    suscripcion: InfoSuscripcion;
}

type PlanSeleccionado = 'monthly' | 'yearly';

/*
 * Precios de referencia (mostrados en UI)
 */
const PRECIOS = {
    monthly: {
        precio: 4.99,
        descripcion: 'por mes'
    },
    yearly: {
        precio: 39.99,
        descripcion: 'por año',
        ahorro: '33%'
    }
};

/*
 * Comparativa de planes
 * Incluye todas las características premium disponibles
 */
const CARACTERISTICAS = [
    {nombre: 'Almacenamiento', free: '50 MB', premium: '1 GB'},
    {nombre: 'Habitos', free: '5 max', premium: 'Ilimitados'},
    {nombre: 'Tareas activas', free: '20 max', premium: 'Ilimitadas'},
    {nombre: 'Proyectos', free: '3 max', premium: 'Ilimitados'},
    {nombre: 'Adjuntos', free: 'No', premium: '10 por tarea'},
    {nombre: 'Panel de Actividad', free: 'No', premium: 'Mapa de calor'},
    {nombre: 'Copias de Seguridad', free: 'No', premium: 'Automaticas'},
    {nombre: 'Conexion con IA', free: 'No', premium: 'Integrada'},
    {nombre: 'Sincronizacion', free: 'No', premium: 'Multi-dispositivo'},
    {nombre: 'Estadisticas', free: 'No', premium: 'Avanzadas'},
    {nombre: 'Cifrado E2E', free: 'Basico', premium: 'Completo'}
];

export function ModalUpgrade({visible, onCerrar, suscripcion}: ModalUpgradeProps) {
    const {plan, estado, diasRestantes} = suscripcion;
    const {iniciarCheckout, abrirPortalFacturacion, cargando, error} = useStripe();
    const [planSeleccionado, setPlanSeleccionado] = useState<PlanSeleccionado>('yearly');

    const handleComprar = async () => {
        await iniciarCheckout(planSeleccionado);
    };

    const handleGestionarSuscripcion = async () => {
        await abrirPortalFacturacion();
    };

    const renderEncabezado = () => {
        if (plan === 'premium') {
            if (estado === 'trial') {
                return (
                    <div className="modalUpgrade__encabezado modalUpgrade__encabezado--trial">
                        <span className="modalUpgrade__icono">*</span>
                        <h2>Tu periodo de prueba</h2>
                        <p className="modalUpgrade__subtitulo">
                            Te quedan <strong>{diasRestantes} dias</strong> de Premium gratis
                        </p>
                    </div>
                );
            }
            return (
                <div className="modalUpgrade__encabezado modalUpgrade__encabezado--premium">
                    <span className="modalUpgrade__icono">*</span>
                    <h2>Eres Premium</h2>
                    <p className="modalUpgrade__subtitulo">{diasRestantes ? `Tu suscripcion vence en ${diasRestantes} dias` : 'Disfruta de todas las funcionalidades'}</p>
                </div>
            );
        }

        return (
            <div className="modalUpgrade__encabezado">
                <span className="modalUpgrade__icono">&gt;</span>
                <h2>DESBLOQUEA TU POTENCIAL</h2>
                <p className="modalUpgrade__subtitulo">Prueba 30 dias gratis, cancela cuando quieras</p>
            </div>
        );
    };

    const renderSelectorPlan = () => {
        if (plan === 'premium' && estado !== 'trial') {
            return null;
        }

        return (
            <div className="modalUpgrade__planes">
                <Boton variante={planSeleccionado === 'monthly' ? 'primario' : 'ghost'} onClick={() => setPlanSeleccionado('monthly')} claseAdicional={`modalUpgrade__planOpcion ${planSeleccionado === 'monthly' ? 'modalUpgrade__planOpcion--activo' : ''}`}>
                    <span className="modalUpgrade__planNombre">Mensual</span>
                    <span className="modalUpgrade__planPrecio">${PRECIOS.monthly.precio}</span>
                    <span className="modalUpgrade__planDescripcion">{PRECIOS.monthly.descripcion}</span>
                </Boton>

                <Boton variante={planSeleccionado === 'yearly' ? 'primario' : 'ghost'} onClick={() => setPlanSeleccionado('yearly')} claseAdicional={`modalUpgrade__planOpcion ${planSeleccionado === 'yearly' ? 'modalUpgrade__planOpcion--activo' : ''}`}>
                    <span className="modalUpgrade__planBadge">-{PRECIOS.yearly.ahorro}</span>
                    <span className="modalUpgrade__planNombre">Anual</span>
                    <span className="modalUpgrade__planPrecio">${PRECIOS.yearly.precio}</span>
                    <span className="modalUpgrade__planDescripcion">{PRECIOS.yearly.descripcion}</span>
                </Boton>
            </div>
        );
    };

    const renderAcciones = () => {
        const precioSeleccionado = planSeleccionado === 'yearly' ? PRECIOS.yearly.precio : PRECIOS.monthly.precio;

        if (plan === 'premium') {
            if (estado === 'trial') {
                return (
                    <div className="modalUpgrade__acciones">
                        <Boton variante="primario" onClick={handleComprar} cargando={cargando} claseAdicional="modalUpgrade__boton--primario">
                            Continuar con Premium
                        </Boton>
                        <Boton variante="secundario" onClick={onCerrar} claseAdicional="modalUpgrade__boton--secundario">
                            Seguir probando
                        </Boton>
                    </div>
                );
            }
            return (
                <div className="modalUpgrade__acciones">
                    <Boton variante="primario" onClick={handleGestionarSuscripcion} cargando={cargando} claseAdicional="modalUpgrade__boton--primario">
                        Gestionar suscripción
                    </Boton>
                    <Boton variante="secundario" onClick={onCerrar} claseAdicional="modalUpgrade__boton--secundario">
                        Cerrar
                    </Boton>
                </div>
            );
        }

        return (
            <div className="modalUpgrade__acciones">
                <Boton variante="primario" onClick={handleComprar} cargando={cargando} claseAdicional="modalUpgrade__boton--primario">
                    Probar 30 días gratis - luego ${precioSeleccionado}
                </Boton>
                <p className="modalUpgrade__aviso">Sin compromiso. Cancela antes del día 30 y no se te cobrará nada.</p>
                <Boton variante="secundario" onClick={onCerrar} claseAdicional="modalUpgrade__boton--secundario">
                    Quizás después
                </Boton>
            </div>
        );
    };

    return (
        <Modal estaAbierto={visible} onCerrar={onCerrar} titulo="">
            <div id="modal-upgrade-contenido" className="modalUpgrade">
                {renderEncabezado()}

                {error && <div className="modalUpgrade__error">[ERROR] {error}</div>}

                <div className="modalUpgrade__comparativa">
                    <div className="modalUpgrade__columnas">
                        <div className="modalUpgrade__columna modalUpgrade__columna--header"></div>
                        <div className="modalUpgrade__columna modalUpgrade__columna--free">FREE</div>
                        <div className="modalUpgrade__columna modalUpgrade__columna--premium">PREMIUM</div>
                    </div>

                    {CARACTERISTICAS.map((caract, index) => (
                        <div key={index} className="modalUpgrade__fila">
                            <div className="modalUpgrade__caracteristica">{caract.nombre}</div>
                            <div className="modalUpgrade__valor modalUpgrade__valor--free">{caract.free}</div>
                            <div className="modalUpgrade__valor modalUpgrade__valor--premium">{caract.premium}</div>
                        </div>
                    ))}
                </div>

                {renderSelectorPlan()}
                {renderAcciones()}
            </div>
        </Modal>
    );
}

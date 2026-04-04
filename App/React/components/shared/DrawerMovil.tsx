/*
 * DrawerMovil
 * Panel de navegación deslizable desde la izquierda
 * Fase 10.3: Header Móvil + Drawer
 *
 * Características:
 * - Se desliza desde la izquierda
 * - Ancho: 280px (max 80vw)
 * - Overlay oscuro al abrir
 * - Cerrar con click en overlay o swipe
 * - Contiene navegación y perfil de usuario
 */

import {Crown} from 'lucide-react';
import {Boton} from '../ui';
import {useDrawerMovil} from '../../hooks/dashboard/useDrawerMovil';
import type {InfoSuscripcion} from '../../types/dashboard';

export interface OpcionDrawer {
    id: string;
    etiqueta: string;
    icono: React.ReactNode;
    badge?: number;
    peligroso?: boolean;
    separadorDespues?: boolean;
    activo?: boolean;
}

export interface DrawerMovilProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    usuario: {
        nombre: string;
        email?: string;
        avatar?: string;
    };
    suscripcion?: InfoSuscripcion | null;
    opciones: OpcionDrawer[];
    onSeleccionar: (opcionId: string) => void;
    opcionesSecundarias?: OpcionDrawer[];
    onClickPerfil?: () => void;
    onClickPlan?: () => void;
}

export function DrawerMovil({estaAbierto, onCerrar, usuario, suscripcion, opciones, onSeleccionar, opcionesSecundarias, onClickPerfil, onClickPlan}: DrawerMovilProps): JSX.Element | null {
    const {drawerRef, manejarTouchStart, manejarTouchEnd, manejarClickOverlay, manejarClickOpcion, manejarClickPerfil, manejarClickPlan} = useDrawerMovil({estaAbierto, onCerrar, onSeleccionar, onClickPerfil, onClickPlan});

    /* Determinar badge del plan - ahora clickeable */
    const obtenerBadgePlan = () => {
        if (!suscripcion) return null;
        const esClickeable = onClickPlan && suscripcion.plan !== 'premium';

        if (suscripcion.plan === 'premium' && suscripcion.estado === 'activa') {
            return (
                <span className="drawerMovilPlanBadge drawerMovilPlanBadge--premium">
                    <Crown size={12} />
                    Premium
                </span>
            );
        }
        /* Plan free es clickeable para upgrade */
        return (
            <Boton type="button" variante="ghost" claseAdicional="drawerMovilPlanBadge drawerMovilPlanBadge--free drawerMovilPlanBadge--clickeable" onClick={esClickeable ? manejarClickPlan : undefined}>
                Free
            </Boton>
        );
    };

    if (!estaAbierto) return null;

    return (
        <>
            {/* Overlay oscuro */}
            {/* sentinel-disable-next-line componente-artesanal — ES el drawer primitivo del sistema */}
            <div className={`drawerMovilOverlay ${estaAbierto ? 'drawerMovilOverlay--visible' : ''}`} onClick={manejarClickOverlay} aria-hidden="true" />

            {/* Panel del drawer */}
            <div ref={drawerRef as React.RefObject<HTMLDivElement>} className={`drawerMovilPanel ${estaAbierto ? 'drawerMovilPanel--visible' : ''}`} role="dialog" aria-modal="true" aria-label="Menú de navegación" onTouchStart={manejarTouchStart} onTouchEnd={manejarTouchEnd}>
                {/* Cabecera con perfil - foto y nombre clickeables */}
                <div className="drawerMovilCabecera">
                    <Boton type="button" variante="ghost" claseAdicional="drawerMovilPerfil drawerMovilPerfil--clickeable" onClick={onClickPerfil ? manejarClickPerfil : undefined}>
                        {usuario.avatar ? <img src={usuario.avatar} alt="" className="drawerMovilAvatar" /> : <div className="drawerMovilAvatarInicial">{usuario.nombre.charAt(0).toUpperCase()}</div>}
                        <div className="drawerMovilPerfilInfo">
                            <span className="drawerMovilNombre">{usuario.nombre}</span>
                            {obtenerBadgePlan()}
                        </div>
                    </Boton>
                </div>

                {/* Navegación principal - Todas las opciones unificadas */}
                <nav className="drawerMovilNavegacion">
                    {opciones.map(opcion => (
                        <div key={opcion.id}>
                            <Boton type="button" variante="ghost" claseAdicional={`drawerMovilItem ${opcion.peligroso ? 'drawerMovilItem--peligro' : ''} ${opcion.activo ? 'drawerMovilItem--activo' : ''}`} onClick={() => manejarClickOpcion(opcion.id)}>
                                <span className="drawerMovilItemIcono">{opcion.icono}</span>
                                <span className="drawerMovilItemTexto">{opcion.etiqueta}</span>
                                {opcion.badge !== undefined && opcion.badge > 0 && <span className="drawerMovilItemBadge">{opcion.badge}</span>}
                            </Boton>
                            {opcion.separadorDespues && <div className="drawerMovilSeparador" />}
                        </div>
                    ))}
                    {/* Opciones secundarias fusionadas en navegación principal */}
                    {opcionesSecundarias && opcionesSecundarias.length > 0 && (
                        <>
                            {/* Solo mostrar separador si la última opción principal no lo tiene */}
                            {!(opciones.length > 0 && opciones[opciones.length - 1].separadorDespues) && <div className="drawerMovilSeparador" />}
                            {opcionesSecundarias.map(opcion => (
                                <Boton key={opcion.id} type="button" variante="ghost" claseAdicional={`drawerMovilItem ${opcion.peligroso ? 'drawerMovilItem--peligro' : ''}`} onClick={() => manejarClickOpcion(opcion.id)}>
                                    <span className="drawerMovilItemIcono">{opcion.icono}</span>
                                    <span className="drawerMovilItemTexto">{opcion.etiqueta}</span>
                                </Boton>
                            ))}
                        </>
                    )}
                </nav>
            </div>
        </>
    );
}

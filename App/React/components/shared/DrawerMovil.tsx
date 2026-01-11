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

import {useEffect, useCallback, useRef} from 'react';
import {X, Crown} from 'lucide-react';
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
}

export function DrawerMovil({estaAbierto, onCerrar, usuario, suscripcion, opciones, onSeleccionar, opcionesSecundarias}: DrawerMovilProps): JSX.Element | null {
    const drawerRef = useRef<HTMLDivElement>(null);
    const inicioToqueRef = useRef<number>(0);

    /* Cerrar con Escape */
    const manejarTecla = useCallback(
        (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        },
        [onCerrar]
    );

    /* Bloquear scroll del body cuando está abierto */
    useEffect(() => {
        if (estaAbierto) {
            document.addEventListener('keydown', manejarTecla);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', manejarTecla);
            document.body.style.overflow = '';
        };
    }, [estaAbierto, manejarTecla]);

    /* Swipe para cerrar */
    const manejarTouchStart = (evento: React.TouchEvent) => {
        inicioToqueRef.current = evento.touches[0].clientX;
    };

    const manejarTouchEnd = (evento: React.TouchEvent) => {
        const finToque = evento.changedTouches[0].clientX;
        const diferencia = inicioToqueRef.current - finToque;

        /* Si deslizó más de 100px hacia la izquierda, cerrar */
        if (diferencia > 100) {
            onCerrar();
        }
    };

    const manejarClickOverlay = (evento: React.MouseEvent<HTMLDivElement>) => {
        if (evento.target === evento.currentTarget) {
            onCerrar();
        }
    };

    const manejarClickOpcion = (opcionId: string) => {
        onSeleccionar(opcionId);
        onCerrar();
    };

    /* Determinar badge del plan */
    const obtenerBadgePlan = () => {
        if (!suscripcion) return null;
        if (suscripcion.plan === 'premium' && suscripcion.estado === 'activa') {
            return (
                <span className="drawerMovilPlanBadge drawerMovilPlanBadge--premium">
                    <Crown size={12} />
                    Premium
                </span>
            );
        }
        if (suscripcion.plan === 'trial') {
            return <span className="drawerMovilPlanBadge drawerMovilPlanBadge--trial">Trial</span>;
        }
        return <span className="drawerMovilPlanBadge drawerMovilPlanBadge--free">Free</span>;
    };

    if (!estaAbierto) return null;

    return (
        <>
            {/* Overlay oscuro */}
            <div className={`drawerMovilOverlay ${estaAbierto ? 'drawerMovilOverlay--visible' : ''}`} onClick={manejarClickOverlay} aria-hidden="true" />

            {/* Panel del drawer */}
            <div ref={drawerRef} className={`drawerMovilPanel ${estaAbierto ? 'drawerMovilPanel--visible' : ''}`} role="dialog" aria-modal="true" aria-label="Menú de navegación" onTouchStart={manejarTouchStart} onTouchEnd={manejarTouchEnd}>
                {/* Cabecera con perfil */}
                <div className="drawerMovilCabecera">
                    <div className="drawerMovilPerfil">
                        {usuario.avatar ? <img src={usuario.avatar} alt="" className="drawerMovilAvatar" /> : <div className="drawerMovilAvatarInicial">{usuario.nombre.charAt(0).toUpperCase()}</div>}
                        <div className="drawerMovilPerfilInfo">
                            <span className="drawerMovilNombre">{usuario.nombre}</span>
                            {usuario.email && <span className="drawerMovilEmail">{usuario.email}</span>}
                            {obtenerBadgePlan()}
                        </div>
                    </div>
                    <button type="button" className="drawerMovilCerrar" onClick={onCerrar} aria-label="Cerrar menú">
                        <X size={20} />
                    </button>
                </div>

                {/* Navegación principal */}
                <nav className="drawerMovilNavegacion">
                    {opciones.map(opcion => (
                        <div key={opcion.id}>
                            <button type="button" className={`drawerMovilItem ${opcion.peligroso ? 'drawerMovilItem--peligro' : ''} ${opcion.activo ? 'drawerMovilItem--activo' : ''}`} onClick={() => manejarClickOpcion(opcion.id)}>
                                <span className="drawerMovilItemIcono">{opcion.icono}</span>
                                <span className="drawerMovilItemTexto">{opcion.etiqueta}</span>
                                {opcion.badge !== undefined && opcion.badge > 0 && <span className="drawerMovilItemBadge">{opcion.badge}</span>}
                            </button>
                            {opcion.separadorDespues && <div className="drawerMovilSeparador" />}
                        </div>
                    ))}
                </nav>

                {/* Opciones secundarias (pie del drawer) */}
                {opcionesSecundarias && opcionesSecundarias.length > 0 && (
                    <div className="drawerMovilPie">
                        {opcionesSecundarias.map(opcion => (
                            <button key={opcion.id} type="button" className={`drawerMovilItem drawerMovilItem--secundario ${opcion.peligroso ? 'drawerMovilItem--peligro' : ''}`} onClick={() => manejarClickOpcion(opcion.id)}>
                                <span className="drawerMovilItemIcono">{opcion.icono}</span>
                                <span className="drawerMovilItemTexto">{opcion.etiqueta}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

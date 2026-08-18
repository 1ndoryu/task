/*
 * ModalesAutenticacion
 * Agrupa modales relacionados con autenticación, perfil y suscripción
 * Incluye: Login, Perfil, Seguridad, Upgrade, LimiteAlcanzado
 */

import {ModalLogin} from '../ModalLogin';
import {PanelSeguridad} from '../PanelSeguridad';
import {ModalPerfil} from '../ModalPerfil';
import {ModalUpgrade, ModalLimiteAlcanzado} from '../../shared';

import type {DashboardCompletoRetorno} from '../../../hooks/useDashboardCompleto';

interface ModalesAutenticacionProps {
    auth: DashboardCompletoRetorno['auth'];
    suscripcion: DashboardCompletoRetorno['suscripcion'];
    modales: DashboardCompletoRetorno['modales'];
    limites: DashboardCompletoRetorno['limites'];
}

export function ModalesAutenticacion({auth, suscripcion, modales, limites}: ModalesAutenticacionProps): JSX.Element {
    return (
        <>
            <ModalLogin
                estaAbierto={modales.modalLoginAbierto}
                onCerrar={modales.cerrarModalLogin}
                onLoginGoogle={auth.loginWithGoogle}
                onLoginCredentials={auth.loginWithCredentials}
                onRegister={auth.register}
                loading={auth.loading}
                error={auth.error}
                /* Overlay opaco cuando no hay usuario autenticado para ocultar la app */
                overlayOpaco={!auth.user}
            />
            <ModalUpgrade visible={modales.modalUpgradeAbierto} onCerrar={modales.cerrarModalUpgrade} suscripcion={suscripcion} />
            <ModalLimiteAlcanzado visible={limites.modalLimite.visible} onCerrar={limites.cerrarModalLimite} onActualizarPlan={modales.abrirModalUpgrade} tipoEntidad={limites.modalLimite.tipoEntidad} limite={limites.modalLimite.limite} actual={limites.modalLimite.actual} />
            <PanelSeguridad visible={modales.panelSeguridadAbierto} onCerrar={modales.cerrarPanelSeguridad} />
            <ModalPerfil estaAbierto={modales.modalPerfilAbierto} onCerrar={modales.cerrarModalPerfil} />
        </>
    );
}

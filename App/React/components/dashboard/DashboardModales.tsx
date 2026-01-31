/*
 * DashboardModales
 * Componente compositor que agrupa todos los modales del Dashboard
 * Refactorizado para cumplir SRP: solo compone subcomponentes, sin lógica de negocio
 *
 * La lógica de creación de entidades está en: useCreacionEntidades
 * Los modales están organizados por dominio en: components/dashboard/modales/
 */

import {ModalesAutenticacion, ModalesConfiguracion, ModalesHabitos, ModalesProyectos, ModalesTareas, ModalesCompartir, ModalesAuxiliares, ModalCreacionRapidaWrapper} from './modales';

import {useEsMovil} from '../../hooks/useEsMovil';
import {useCreacionEntidades} from '../../hooks/useCreacionEntidades';

import type {DashboardCompletoRetorno} from '../../hooks/useDashboardCompleto';

import '../../styles/dashboard/componentes/bottomSheetCreacion.css';

interface DashboardModalesProps {
    ctx: DashboardCompletoRetorno;
}

export function DashboardModales({ctx}: DashboardModalesProps): JSX.Element {
    const {dashboard, auth, suscripcion, esAdmin, limites, modales, equipos, notificaciones, compartir, configTareas, configHabitos, configProyectos, configScratchpad, configActividad, layout, arrastre, acciones, temas} = ctx;
    const {esMovil} = useEsMovil();

    /* Hook centralizado para lógica de creación */
    const creacion = useCreacionEntidades({dashboard, limites, acciones});

    return (
        <>
            <ModalesAutenticacion auth={auth} suscripcion={suscripcion} modales={modales} limites={limites} />
            <ModalesConfiguracion modales={modales} configTareas={configTareas} configHabitos={configHabitos} configProyectos={configProyectos} configScratchpad={configScratchpad} configActividad={configActividad} layout={layout} temas={temas} />
            <ModalesHabitos dashboard={dashboard} modales={modales} esMovil={esMovil} manejarCrearHabitoConLimite={creacion.manejarCrearHabitoConLimite} manejarCrearTareaConLimite={creacion.manejarCrearTareaConLimite} manejarGuardarHabitoBottomSheet={creacion.manejarGuardarHabitoBottomSheet} />
            <ModalesProyectos dashboard={dashboard} modales={modales} equipos={equipos} compartir={compartir} acciones={acciones} esMovil={esMovil} manejarCrearProyectoConLimite={creacion.manejarCrearProyectoConLimite} manejarGuardarProyectoBottomSheet={creacion.manejarGuardarProyectoBottomSheet} />
            <ModalesTareas dashboard={dashboard} modales={modales} acciones={acciones} esMovil={esMovil} manejarGuardarTareaBottomSheet={creacion.manejarGuardarTareaBottomSheet} />
            <ModalesCompartir modales={modales} equipos={equipos} compartir={compartir} notificaciones={notificaciones} acciones={acciones} />
            <ModalesAuxiliares dashboard={dashboard} auth={auth} modales={modales} layout={layout} arrastre={arrastre} acciones={acciones} esAdmin={esAdmin} />
            <ModalCreacionRapidaWrapper dashboard={dashboard} modales={modales} esMovil={esMovil} manejarGuardarRapido={creacion.manejarGuardarRapido} />
        </>
    );
}

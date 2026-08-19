/* [H-F13-01] Estados de PanelGruposFb extraídos: carga, error y el empty state
 * diagnóstico ([263A-6] DB vacía vs filtros que ocultan vs todos ocultos). */

import {Users, EyeOff, Settings} from 'lucide-react';
import {Boton} from '../ui';
import type {GrupoFb} from '../../stores/gruposFbStore';

interface EstadosPanelGruposFbProps {
    cargando: boolean;
    inicializado: boolean;
    error: string | null;
    grupos: GrupoFb[];
    todosLosGrupos: GrupoFb[];
    mostrarOcultos: boolean;
    hayFiltrosActivos: boolean;
    totalServidor: number;
    recargar: () => void;
}

export function EstadosPanelGruposFb({cargando, inicializado, error, grupos, todosLosGrupos, mostrarOcultos, hayFiltrosActivos, totalServidor, recargar}: EstadosPanelGruposFbProps): JSX.Element | null {
    if (error) {
        return (
            <div className="panelGruposFb__vacio">
                <p>Error: {error}</p>
                <Boton variante="ghost" onClick={recargar}>Reintentar</Boton>
            </div>
        );
    }

    if (cargando && !inicializado) {
        return <div className="panelGruposFb__cargando">Cargando grupos...</div>;
    }

    /* [263A-6] Empty state diagnóstico: distingue DB vacía vs filtros ocultan grupos */
    if (!inicializado || grupos.length > 0) {
        return null;
    }

    return (
        <div className="panelGruposFb__vacio">
            <Users size={24} />
            {todosLosGrupos.length > 0 ? (
                /* Grupos existen pero los filtros activos los ocultan */
                <>
                    <p className="panelGruposFb__vacioPrincipal">
                        {todosLosGrupos.length} grupos cargados — ninguno visible con los filtros actuales
                    </p>
                    {!mostrarOcultos && todosLosGrupos.some(g => g.oculto) && (
                        <p className="panelGruposFb__vacioDetalle">
                            {todosLosGrupos.filter(g => g.oculto).length} grupos están ocultos.
                            Activa el filtro <EyeOff size={11} className="panelGruposFb__vacioIconoInline" /> para verlos.
                        </p>
                    )}
                    {hayFiltrosActivos && (
                        <p className="panelGruposFb__vacioDetalle">
                            Hay filtros activos (categoría, importancia o búsqueda). Límpialos para ver más.
                        </p>
                    )}
                </>
            ) : totalServidor > 0 ? (
                /* La estadística dice que hay grupos pero todos están marcados ocultos en el store */
                <>
                    <p className="panelGruposFb__vacioPrincipal">
                        {totalServidor} grupos en el servidor — todos ocultos
                    </p>
                    <p className="panelGruposFb__vacioDetalle">
                        Activa <EyeOff size={11} className="panelGruposFb__vacioIconoInline" /> para mostrar grupos ocultos.
                    </p>
                </>
            ) : (
                /* DB genuinamente vacía — la extensión nunca sincronizó o falló */
                <>
                    <p className="panelGruposFb__vacioPrincipal">
                        El servidor no tiene grupos (total en BD: {totalServidor})
                    </p>
                    <p className="panelGruposFb__vacioDetalle">
                        La extensión tiene los grupos localmente pero aún no los sincronizó.
                        Abre la extensión → Config → &quot;Sincronizar ahora&quot;, o navega por Facebook para activar la detección automática.
                    </p>
                    <p className="panelGruposFb__vacioAyuda">
                        Verifica también que el token API y la URL estén configurados correctamente en <Settings size={11} className="panelGruposFb__vacioIconoInline" />.
                    </p>
                </>
            )}
            <Boton variante="ghost" onClick={recargar}>Recargar</Boton>
        </div>
    );
}

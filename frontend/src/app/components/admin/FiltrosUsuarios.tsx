/*
 * FiltrosUsuarios
 *
 * Barra de filtros para la lista de usuarios del panel de administración.
 * Permite filtrar por plan y buscar por nombre/email.
 */

import {useState, useCallback} from 'react';
import {Search, Filter, RefreshCw} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {Input} from '../ui/Input';
import type {FiltrosAdmin} from '../../types/dashboard';

interface FiltrosUsuariosProps {
    filtros: FiltrosAdmin;
    onFiltrarPlan: (plan: FiltrosAdmin['plan']) => void;
    onBuscar: (busqueda: string) => void;
    onReiniciar: () => void;
}

const OPCIONES_PLAN: {valor: FiltrosAdmin['plan']; etiqueta: string}[] = [
    {valor: 'todos', etiqueta: 'Todos'},
    {valor: 'premium', etiqueta: 'Premium'},
    {valor: 'trial', etiqueta: 'Trial'},
    {valor: 'free', etiqueta: 'Free'}
];

export function FiltrosUsuarios({filtros, onFiltrarPlan, onBuscar, onReiniciar}: FiltrosUsuariosProps): JSX.Element {
    const [busquedaLocal, setBusquedaLocal] = useState(filtros.busqueda);

    /* Manejar búsqueda con debounce */
    const manejarCambioBusqueda = useCallback((valor: string) => {
        setBusquedaLocal(valor);
    }, []);

    /* Ejecutar búsqueda al presionar Enter */
    const manejarTeclaBusqueda = useCallback(
        (evento: React.KeyboardEvent) => {
            if (evento.key === 'Enter') {
                onBuscar(busquedaLocal);
            }
        },
        [busquedaLocal, onBuscar]
    );

    /* Ejecutar búsqueda al hacer click en el botón */
    const manejarClickBuscar = useCallback(() => {
        onBuscar(busquedaLocal);
    }, [busquedaLocal, onBuscar]);

    return (
        <div id="filtros-usuarios" className="filtrosUsuarios">
            {/* Filtros de plan */}
            <div className="filtrosUsuariosPlan">
                <Filter size={14} className="filtrosIcono" />
                <div className="filtrosBotones">
                    {OPCIONES_PLAN.map(({valor, etiqueta}) => (
                        <Boton key={valor} type="button" claseAdicional={`filtroPlanBoton ${filtros.plan === valor ? 'filtroPlanBotonActivo' : ''}`} onClick={() => onFiltrarPlan(valor)}>
                            {etiqueta}
                        </Boton>
                    ))}
                </div>
            </div>

            {/* Barra de búsqueda */}
            <div className="filtrosUsuariosBusqueda">
                <div className="busquedaInputContenedor">
                    <Search size={14} className="busquedaIcono" />
                    <Input tipo="text" claseAdicional="busquedaInput" placeholder="Buscar por nombre o email..." value={busquedaLocal} onChange={e => manejarCambioBusqueda((e.target as HTMLInputElement).value)} onKeyDown={manejarTeclaBusqueda} />
                    <Boton type="button" claseAdicional="busquedaBoton" onClick={manejarClickBuscar} title="Buscar">
                        Buscar
                    </Boton>
                </div>

                {/* Botón reiniciar */}
                <Boton type="button" claseAdicional="filtrosReiniciarBoton" onClick={onReiniciar} title="Reiniciar filtros">
                    <RefreshCw size={14} />
                </Boton>
            </div>
        </div>
    );
}

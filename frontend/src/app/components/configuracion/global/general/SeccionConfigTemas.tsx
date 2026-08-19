/* [233A-27] Selector de temas del modal global. */
import {Check} from 'lucide-react';
import {Boton} from '../../../ui';
import {useTema, TEMAS_DISPONIBLES} from '../../../../hooks/useTema';
import {useConfiguracionLayout} from '../../../../hooks/useConfiguracionLayout';

export function SeccionConfigTemas(): JSX.Element {
    const {tema, cambiarTema} = useTema();
    const {tipoLayout} = useConfiguracionLayout();
    const temasVisibles = tipoLayout === 'sidebar'
        ? TEMAS_DISPONIBLES.filter(t => t.id !== 'original')
        : TEMAS_DISPONIBLES;
    return (
        <div className="selectorTemas">
            {temasVisibles.map(t => (
                <Boton key={t.id} type="button" claseAdicional={`selectorTemas__opcion ${tema === t.id ? 'selectorTemas__opcion--activa' : ''}`} onClick={() => cambiarTema(t.id)}>
                    <span className="selectorTemas__nombre">{t.nombre}</span>
                    {tema === t.id && <Check size={14} className="selectorTemas__check" />}
                </Boton>
            ))}
        </div>
    );
}

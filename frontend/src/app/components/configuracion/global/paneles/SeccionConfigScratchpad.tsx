/* [233A-27] Configuración del scratchpad (tamaño de fuente y auto-guardado).
 * [318A-3] Migrado al sistema centralizado: los campos son especificación
 * declarativa (FormularioConfiguracion) — un solo layout y el mismo `Select`
 * del sistema con selectOpcionConfig, idéntico al esqueleto previo. */
import {FormularioConfiguracion} from '../../../shared';
import type {CampoEspecificacion} from '../../../shared';
import {useConfiguracionScratchpad} from '../../../../hooks/useConfiguracionScratchpad';
import type {TamanoFuente} from '../../../../hooks/useConfiguracionScratchpad';

interface FormaScratchpad {
    tamanoFuente: TamanoFuente;
    autoGuardadoIntervalo: number;
}

export function SeccionConfigScratchpad(): JSX.Element {
    const {configuracion, cambiarTamanoFuente, cambiarAutoGuardado} = useConfiguracionScratchpad();

    const campos: CampoEspecificacion<FormaScratchpad>[] = [
        {
            clave: 'tamanoFuente',
            titulo: 'Tamaño de fuente',
            descripcion: 'Ajustar legibilidad del texto',
            tipo: 'select',
            opciones: [
                {valor: 'pequeno', etiqueta: 'Pequeño'},
                {valor: 'normal', etiqueta: 'Normal'},
                {valor: 'grande', etiqueta: 'Grande'}
            ],
            alCambiar: (valor) => cambiarTamanoFuente(valor as TamanoFuente)
        },
        {
            clave: 'autoGuardadoIntervalo',
            titulo: 'Auto-guardado',
            descripcion: 'Tiempo de espera antes de guardar',
            tipo: 'select',
            opciones: [
                {valor: 500, etiqueta: 'Rápido (0.5s)'},
                {valor: 1500, etiqueta: 'Normal (1.5s)'},
                {valor: 3000, etiqueta: 'Relax (3s)'}
            ],
            alCambiar: (valor) => cambiarAutoGuardado(Number(valor))
        }
    ];

    return (
        <FormularioConfiguracion
            campos={campos}
            valores={configuracion}
            alCambiar={() => {
                /* La persistencia la manejan los alCambiar de cada campo. */
            }}
        />
    );
}

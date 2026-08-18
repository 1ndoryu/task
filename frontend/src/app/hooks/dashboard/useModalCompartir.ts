/*
 * useModalCompartir
 * Hook que encapsula la lógica del modal de compartir elementos
 * (tarea, proyecto o hábito) con miembros del equipo.
 */

import {useState, useCallback, useEffect} from 'react';
import type {TipoElementoCompartido, RolCompartido, CompaneroEquipo, Participante} from '../../types/dashboard';

export interface UseModalCompartirProps {
    visible: boolean;
    tipo: TipoElementoCompartido;
    companeros: CompaneroEquipo[];
    participantes: Participante[];
    cifradoActivo?: boolean;
    onCompartir: (usuarioId: number, rol: RolCompartido) => Promise<boolean>;
    onCambiarRol: (compartidoId: number, nuevoRol: RolCompartido) => Promise<boolean>;
    onDejarDeCompartir: (compartidoId: number) => Promise<boolean>;
}

export interface UseModalCompartirReturn {
    /* Estado */
    companeroSeleccionado: number | null;
    setCompaneroSeleccionado: (v: number | null) => void;
    rolSeleccionado: RolCompartido;
    setRolSeleccionado: (v: RolCompartido) => void;
    compartiendo: boolean;
    error: string | null;
    mostroAdvertencia: boolean;

    /* Derivados */
    tipoTexto: string;
    tipoTextoMayus: string;
    companerosDisponibles: CompaneroEquipo[];
    esPropietario: boolean;

    /* Acciones */
    manejarCompartir: () => Promise<void>;
    manejarCambioRol: (compartidoId: number, nuevoRol: RolCompartido) => Promise<void>;
    manejarEliminar: (compartidoId: number) => Promise<void>;
}

export function useModalCompartir({
    visible,
    tipo,
    companeros,
    participantes,
    cifradoActivo = false,
    onCompartir,
    onCambiarRol,
    onDejarDeCompartir
}: UseModalCompartirProps): UseModalCompartirReturn {
    const [companeroSeleccionado, setCompaneroSeleccionado] = useState<number | null>(null);
    const [rolSeleccionado, setRolSeleccionado] = useState<RolCompartido>('colaborador');
    const [compartiendo, setCompartiendo] = useState(false);
    const [mostroAdvertencia, setMostroAdvertencia] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* Texto del tipo */
    const tipoTexto = tipo === 'tarea' ? 'tarea' : tipo === 'proyecto' ? 'proyecto' : 'hábito';
    const tipoTextoMayus = tipo === 'tarea' ? 'Tarea' : tipo === 'proyecto' ? 'Proyecto' : 'Hábito';

    /* Filtrar compañeros que ya tienen acceso */
    const companerosDisponibles = companeros.filter(c => !participantes.some(p => p.usuarioId === c.companeroId));

    /* Determinar si soy el propietario */
    const esPropietario = participantes.some(p => p.esPropietario && p.usuarioId === participantes[0]?.usuarioId);

    /* Limpiar estado al cerrar */
    useEffect(() => {
        if (!visible) {
            setCompaneroSeleccionado(null);
            setRolSeleccionado('colaborador');
            setMostroAdvertencia(false);
            setError(null);
        }
    }, [visible]);

    /* Manejar compartir */
    const manejarCompartir = useCallback(async () => {
        if (!companeroSeleccionado) return;

        /* Si hay cifrado activo y no se ha mostrado advertencia */
        if (cifradoActivo && !mostroAdvertencia) {
            setMostroAdvertencia(true);
            return;
        }

        setError(null);
        setCompartiendo(true);

        const exito = await onCompartir(companeroSeleccionado, rolSeleccionado);

        setCompartiendo(false);

        if (exito) {
            setCompaneroSeleccionado(null);
            setRolSeleccionado('colaborador');
            setMostroAdvertencia(false);
        } else {
            setError('Error al compartir. Por favor, intenta de nuevo.');
        }
    }, [companeroSeleccionado, rolSeleccionado, cifradoActivo, mostroAdvertencia, onCompartir]);

    /* Manejar cambio de rol */
    const manejarCambioRol = useCallback(
        async (compartidoId: number, nuevoRol: RolCompartido) => {
            await onCambiarRol(compartidoId, nuevoRol);
        },
        [onCambiarRol]
    );

    /* Manejar eliminar participante */
    const manejarEliminar = useCallback(
        async (compartidoId: number) => {
            await onDejarDeCompartir(compartidoId);
        },
        [onDejarDeCompartir]
    );

    return {
        companeroSeleccionado,
        setCompaneroSeleccionado,
        rolSeleccionado,
        setRolSeleccionado,
        compartiendo,
        error,
        mostroAdvertencia,
        tipoTexto,
        tipoTextoMayus,
        companerosDisponibles,
        esPropietario,
        manejarCompartir,
        manejarCambioRol,
        manejarEliminar
    };
}

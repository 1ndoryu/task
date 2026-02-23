/*
 * useSeccionResponsables
 * Hook que encapsula la lógica de gestión de participantes/responsables.
 * Maneja menús de agregar/remover, selección de rol y filtrado de compañeros disponibles.
 */

import {useState, useCallback} from 'react';
import type {Participante, CompaneroEquipo, RolCompartido} from '../../types/dashboard';

interface UseSeccionResponsablesParams {
    participantes: Participante[];
    companeros: CompaneroEquipo[];
    onAgregar?: (companeroId: number, rol: RolCompartido) => void;
    onRemover?: (participanteId: number) => void;
    onCambiarRol?: (participanteId: number, nuevoRol: RolCompartido) => void;
}

export function useSeccionResponsables({participantes, companeros, onAgregar, onRemover, onCambiarRol}: UseSeccionResponsablesParams) {
    const [menuAgregarAbierto, setMenuAgregarAbierto] = useState(false);
    const [menuParticipanteAbierto, setMenuParticipanteAbierto] = useState<number | null>(null);
    const [rolSeleccionado, setRolSeleccionado] = useState<RolCompartido>('colaborador');
    const [menuAgregarPos, setMenuAgregarPos] = useState({x: 0, y: 0});
    const [menuParticipantePos, setMenuParticipantePos] = useState({x: 0, y: 0});

    /* Filtrar compañeros que ya son participantes */
    const companeroDisponibles = companeros.filter(comp => !participantes.some(p => p.usuarioId === comp.companeroId));

    /* Abrir/cerrar menú de agregar, calculando posición */
    const toggleMenuAgregar = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (!menuAgregarAbierto) {
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuAgregarPos({x: rect.left, y: rect.bottom + 4});
            }
            setMenuAgregarAbierto(!menuAgregarAbierto);
            setMenuParticipanteAbierto(null);
        },
        [menuAgregarAbierto]
    );

    /* Abrir/cerrar menú de opciones de un participante */
    const toggleMenuParticipante = useCallback(
        (e: React.MouseEvent, participanteId: number) => {
            e.preventDefault();
            e.stopPropagation();

            if (menuParticipanteAbierto !== participanteId) {
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuParticipantePos({x: rect.left, y: rect.bottom + 4});
                setMenuParticipanteAbierto(participanteId);
            } else {
                setMenuParticipanteAbierto(null);
            }
            setMenuAgregarAbierto(false);
        },
        [menuParticipanteAbierto]
    );

    /* Agregar un compañero como participante con el rol seleccionado */
    const manejarAgregarParticipante = useCallback(
        (companeroId: number) => {
            if (onAgregar) {
                onAgregar(companeroId, rolSeleccionado);
            }
            setMenuAgregarAbierto(false);
            setRolSeleccionado('colaborador');
        },
        [onAgregar, rolSeleccionado]
    );

    /* Remover un participante */
    const manejarRemoverParticipante = useCallback(
        (participanteId: number) => {
            if (onRemover) {
                onRemover(participanteId);
            }
            setMenuParticipanteAbierto(null);
        },
        [onRemover]
    );

    /* Cambiar el rol de un participante existente */
    const manejarCambiarRol = useCallback(
        (participanteId: number, nuevoRol: RolCompartido) => {
            if (onCambiarRol) {
                onCambiarRol(participanteId, nuevoRol);
            }
            setMenuParticipanteAbierto(null);
        },
        [onCambiarRol]
    );

    return {
        menuAgregarAbierto,
        setMenuAgregarAbierto,
        menuParticipanteAbierto,
        setMenuParticipanteAbierto,
        rolSeleccionado,
        setRolSeleccionado,
        menuAgregarPos,
        menuParticipantePos,
        companeroDisponibles,
        toggleMenuAgregar,
        toggleMenuParticipante,
        manejarAgregarParticipante,
        manejarRemoverParticipante,
        manejarCambiarRol
    };
}

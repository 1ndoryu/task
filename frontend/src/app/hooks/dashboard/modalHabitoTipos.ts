/*
 * modalHabitoTipos
 *
 * Tipos e interfaces del hook useModalHabito, extraídos a su propio módulo
 * para que el hook quede dentro del límite de líneas. Se re-exportan desde
 * useModalHabito para conservar la superficie pública.
 */

import type {
    DatosEdicionTarea,
    DatosNuevoHabito,
    DatosNuevoSubHabito,
    FrecuenciaHabito,
    NivelImportancia,
    ReferenciaDependencia,
    SubHabito,
    Tarea,
    Habito,
    VentanaOportunidad,
    Participante
} from '../../types/dashboard';
import type {ParticipanteChat} from '../usePanelChat';
import type {EstadoHabito} from '../../components/shared';

export type DatosFormulario = DatosNuevoHabito;

export interface BaseModalHabito {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosFormulario) => void;
    onPausarHabito?: (id: number) => void;
    habito?: Habito;
    participantes?: Participante[];
    tareas?: Tarea[];
}

export interface CallbacksModalHabito {
    onToggleTarea?: (id: number) => void;
    onCrearTarea?: (datos: DatosEdicionTarea) => void;
    onEliminarTarea?: (id: number) => void;
    onConfigurarTarea?: (tarea: Tarea) => void;
    onActualizarOrdenTareasHabito?: (habitoId: number, tareasIds: number[]) => void;
    onEditarTarea?: (id: number, datos: DatosEdicionTarea) => void;
    subHabito?: SubHabito | null;
    habitoPadre?: Habito | null;
}

export interface UseModalHabitoProps extends BaseModalHabito, CallbacksModalHabito {}

/* Fragmentos del retorno, cohesionados por dominio (ISP). */
export interface UmhEdicion {
    modoEdicion: boolean;
    nombre: string;
    setNombre: (v: string) => void;
    descripcion: string;
    setDescripcion: (v: string) => void;
    icono: string;
    setIcono: (v: string) => void;
    colorIcono: string;
    setColorIcono: (v: string) => void;
}

export interface UmhAtributos {
    importancia: NivelImportancia;
    setImportancia: (v: NivelImportancia) => void;
    dificultad: import('../../plugins/exp/types').Dificultad;
    setDificultad: (v: import('../../plugins/exp/types').Dificultad) => void;
    frecuencia: FrecuenciaHabito;
    setFrecuencia: (v: FrecuenciaHabito) => void;
    ventanaOportunidad: VentanaOportunidad | undefined;
    setVentanaOportunidad: (v: VentanaOportunidad | undefined) => void;
    dependencias: ReferenciaDependencia[];
    setDependencias: (v: ReferenciaDependencia[]) => void;
}

export interface UmhGrupo {
    grupoEjecucion: string | null;
    setGrupoEjecucion: (v: string | null) => void;
    errores: {nombre?: string};
    esHabitoEspecialAyuno: boolean;
    esModoSubHabito: boolean;
    estadoHoy: EstadoHabito;
    manejarCambioEstado: (nuevoEstado: EstadoHabito) => void;
}

export interface UmhChat {
    chatVisible: boolean;
    toggleChat: () => void;
    tieneMensajesSinLeer: boolean;
    participantesChat: ParticipanteChat[];
    mostrarChatColumna: boolean;
    tareasDelHabito: Tarea[];
    manejarReordenarTareas: (tareasIds: number[]) => void;
}

export interface UmhSubHabitos {
    manejarCrearSubHabito: (datos: DatosNuevoSubHabito) => void;
    manejarEditarSubHabito: (subHabitoId: number, datos: DatosNuevoSubHabito) => void;
    manejarEliminarSubHabito: (subHabitoId: number) => void;
    manejarToggleSubHabito: (subHabitoId: number) => void;
    manejarMarcarDiaSubHabito: (fecha: string, estado: EstadoHabito) => boolean;
    manejarDesmarcarDiaSubHabito: (fecha: string) => boolean;
    manejarGuardar: () => void;
    manejarCerrarConGuardado: () => void;
    manejarPausarHabito: (() => void) | undefined;
}

export interface UseModalHabitoReturn extends UmhEdicion, UmhAtributos, UmhGrupo, UmhChat, UmhSubHabitos {}
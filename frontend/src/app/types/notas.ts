export interface Nota {
    id: number;
    carpetaId: number | null;
    titulo: string;
    contenido: string;
    fechaCreacion: string;
    fechaModificacion: string;
}

export interface CarpetaNota {
    id: number | null;
    nombre: string;
    orden: number;
    totalNotas: number;
    esVirtual: boolean;
}

export interface NotaActiva {
    id: number | null;
    contenido: string;
    modificada: boolean;
    carpetaId?: number | null;
}

export interface RespuestaListaNotas {
    success: boolean;
    notas: Nota[];
    total: number;
    hayMas: boolean;
}

export interface RespuestaOperacionNota {
    success: boolean;
    nota: Nota;
}

/* [25-08-2026] Los ids de notas y carpetas son UUID (backend Rust), no numéricos (WordPress). */
export interface Nota {
    id: string;
    carpetaId: string | null;
    titulo: string;
    contenido: string;
    fechaCreacion: string;
    fechaModificacion: string;
}

export interface CarpetaNota {
    id: string | null;
    nombre: string;
    orden: number;
    totalNotas: number;
    esVirtual: boolean;
}

export interface NotaActiva {
    id: string | null;
    contenido: string;
    modificada: boolean;
    carpetaId?: string | null;
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

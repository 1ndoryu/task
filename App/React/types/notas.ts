export interface Nota {
    id: number;
    titulo: string;
    contenido: string;
    fechaCreacion: string;
    fechaModificacion: string;
}

export interface NotaActiva {
    id: number | null;
    contenido: string;
    modificada: boolean;
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

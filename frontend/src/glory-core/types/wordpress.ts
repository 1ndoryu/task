/*
 * Tipos base de WordPress para uso en React.
 * Mapean las estructuras de datos que WP expone via REST API y PHP bridge.
 */

export interface WPMedia {
    id: number;
    url: string;
    alt: string;
    title?: string;
    caption?: string;
    width?: number;
    height?: number;
    mimeType?: string;
    sizes?: Record<string, { url: string; width: number; height: number }>;
}

export interface WPTerm {
    id: number;
    name: string;
    slug: string;
    description?: string;
    count?: number;
    parent?: number;
}

export interface WPCategory extends WPTerm {
    parent?: number;
}

export type WPTag = WPTerm;

export interface WPUser {
    id: number;
    name: string;
    slug: string;
    avatar?: string;
    description?: string;
    url?: string;
}

/* Fragmento de contenido de un post (ISP) */
export interface WPPostContenido {
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    permalink: string;
}

/* Temporalidad y metadatos de lectura */
export interface WPPostTemporalidad {
    date: string;
    dateFormatted: string;
    modified?: string;
    readTime: string;
}

/* Clasificacion (autor, taxonomias, meta libre) */
export interface WPPostClasificacion {
    author: string;
    categories: WPCategory[];
    tags: WPTag[];
    meta: Record<string, unknown>;
    type?: string;
}

/* Presentacion visual y ciclo de vida del post */
export interface WPPostPresentacion {
    featuredImage: WPMedia | null;
    status?: 'publish' | 'draft' | 'pending' | 'private' | 'trash';
}

export interface WPPost extends WPPostContenido, WPPostTemporalidad, WPPostClasificacion, WPPostPresentacion {}

export interface WPPage extends WPPost {
    template?: string;
    menuOrder?: number;
    parent?: number;
}

/* Fragmento base de un item de menu (ISP) */
export interface WPMenuItemBasico {
    id: number;
    title: string;
    url: string;
    target?: string;
    description?: string;
}

/* Jerarquia y presentacion del item en el menu */
export interface WPMenuItemJerarquia {
    classes?: string[];
    parent?: number;
    order?: number;
    children?: WPMenuItem[];
}

/* Objetivo del item (contenido al que apunta) */
export interface WPMenuItemObjetivo {
    objectType?: string;
    objectId?: number;
}

export interface WPMenuItem extends WPMenuItemBasico, WPMenuItemJerarquia, WPMenuItemObjetivo {}

export interface WPMenu {
    id: number;
    name: string;
    slug: string;
    items: WPMenuItem[];
}

export interface WPTaxonomy {
    name: string;
    slug: string;
    description: string;
    types: string[];
    hierarchical: boolean;
    restBase: string;
}

export interface WPPagination {
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
}

export interface WPRestResponse<T> {
    data: T;
    pagination?: WPPagination;
}

export interface WPError {
    code: string;
    message: string;
    data?: {
        status: number;
        [key: string]: unknown;
    };
}

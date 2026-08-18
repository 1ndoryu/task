/* [18-08-2026] useCompartidos contra /api/shared (backend Rust).
 * El backend identifica usuarios con UUID; el front original usaba ids
 * numericos de WP. Los ids de usuario y de compartido se pasan como string
 * UUID en runtime (tipos del front conservados por compatibilidad).
 * Sesion por cookie HttpOnly + X-CSRF-Token en mutaciones. */

import {useState, useCallback, useRef, useEffect} from 'react';
import {apiFetch} from '../utils/apiClient';
import type {TipoElementoCompartido, RolCompartido, ElementoCompartidoConmigo, ElementoCompartidoPorMi, Participante, PermisosAcceso, ContadoresCompartidos, CompaneroEquipo} from '../types/dashboard';
import {ErrorSilencioso, esErrorSilencioso} from '../utils/errores';

interface EstadoCompartidos {
    compartidosConmigo: ElementoCompartidoConmigo[];
    misCompartidos: ElementoCompartidoPorMi[];
    contadores: ContadoresCompartidos;
    cargando: boolean;
    error: string | null;
}

interface UseCompartidosReturn extends EstadoCompartidos {
    compartir: (tipo: TipoElementoCompartido, elementoId: number, usuarioId: number, rol?: RolCompartido) => Promise<boolean>;
    dejarDeCompartir: (compartidoId: number) => Promise<boolean>;
    actualizarRol: (compartidoId: number, nuevoRol: RolCompartido) => Promise<boolean>;
    obtenerParticipantes: (tipo: TipoElementoCompartido, elementoId: number) => Promise<Participante[]>;
    verificarAcceso: (tipo: TipoElementoCompartido, elementoId: number, propietarioId: number) => Promise<PermisosAcceso | null>;
    recargar: () => Promise<void>;
    obtenerCompanerosDisponibles: (tipo: TipoElementoCompartido, elementoId: number, companeros: CompaneroEquipo[]) => CompaneroEquipo[];
    estaCompartido: (tipo: TipoElementoCompartido, elementoId: number) => boolean;
}

/* Contratos Rust (JSON plano, camelCase) */
interface UsuarioRust {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
}

interface CompartidoRust {
    id: string;
    itemType: string;
    itemId: number;
    owner: UsuarioRust;
    recipient: UsuarioRust;
    role: string;
    createdAt: string;
    updatedAt: string;
}

interface ParticipanteRust {
    id: string | null;
    user: UsuarioRust;
    role: string;
    isOwner: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

interface ListadoRust {
    items: CompartidoRust[];
    total: number;
}

function obtenerIdUsuarioActual(): string {
    return (window as unknown as {gloryDashboard?: {currentUser?: {id?: string}}}).gloryDashboard?.currentUser?.id || '';
}

export function useCompartidos(): UseCompartidosReturn {
    const [estado, setEstado] = useState<EstadoCompartidos>({
        compartidosConmigo: [],
        misCompartidos: [],
        contadores: {tareas: 0, proyectos: 0, habitos: 0, total: 0},
        cargando: true,
        error: null
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    const haySesion = useCallback((): boolean => {
        return Boolean(obtenerIdUsuarioActual());
    }, []);

    /* Peticion autenticada; sin sesion lanza ErrorSilencioso sin fetch */
    const fetchAutenticado = useCallback(
        async <T = unknown>(path: string, opciones: RequestInit = {}): Promise<T> => {
            if (!haySesion()) {
                throw new ErrorSilencioso('No autenticado');
            }
            try {
                return await apiFetch<T>(path, opciones as never);
            } catch (error) {
                if (error instanceof ErrorSilencioso) throw error;
                if (error instanceof Error && (error as {status?: number}).status === 401) {
                    throw new ErrorSilencioso('No autenticado');
                }
                throw error;
            }
        },
        [haySesion]
    );

    const mapearConmigo = useCallback((item: CompartidoRust): ElementoCompartidoConmigo => ({
        id: item.id as unknown as number,
        tipo: item.itemType as TipoElementoCompartido,
        elementoId: item.itemId,
        propietarioId: item.owner.id as unknown as number,
        propietarioNombre: item.owner.displayName,
        propietarioEmail: item.owner.email,
        propietarioAvatar: item.owner.avatarUrl || '',
        rol: item.role as RolCompartido,
        fechaCompartido: item.createdAt
    }), []);

    const mapearPorMi = useCallback((item: CompartidoRust): ElementoCompartidoPorMi => ({
        id: item.id as unknown as number,
        tipo: item.itemType as TipoElementoCompartido,
        elementoId: item.itemId,
        usuarioId: item.recipient.id as unknown as number,
        usuarioNombre: item.recipient.displayName,
        usuarioEmail: item.recipient.email,
        usuarioAvatar: item.recipient.avatarUrl || '',
        rol: item.role as RolCompartido,
        fechaCompartido: item.createdAt
    }), []);

    /* Carga compartidos conmigo */
    const cargarCompartidosConmigo = useCallback(async (): Promise<ElementoCompartidoConmigo[]> => {
        const datos = await fetchAutenticado<ListadoRust>('/shared?page=1&perPage=50');
        return (datos?.items || []).map(mapearConmigo);
    }, [fetchAutenticado, mapearConmigo]);

    /* Carga elementos que yo he compartido */
    const cargarMisCompartidos = useCallback(async (): Promise<ElementoCompartidoPorMi[]> => {
        const datos = await fetchAutenticado<ListadoRust>('/shared/mine?page=1&perPage=50');
        return (datos?.items || []).map(mapearPorMi);
    }, [fetchAutenticado, mapearPorMi]);

    /* Carga contadores */
    const cargarContadores = useCallback(async (): Promise<ContadoresCompartidos> => {
        const datos = await fetchAutenticado<{tasks: number; projects: number; habits: number; total: number}>('/shared/counts');
        return {
            tareas: datos?.tasks ?? 0,
            proyectos: datos?.projects ?? 0,
            habitos: datos?.habits ?? 0,
            total: datos?.total ?? 0
        };
    }, [fetchAutenticado]);

    /* Recarga todos los datos */
    const recargar = useCallback(async (): Promise<void> => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setEstado(prev => ({...prev, cargando: true, error: null}));

        try {
            const [compartidosConmigo, misCompartidos, contadores] = await Promise.all([cargarCompartidosConmigo(), cargarMisCompartidos(), cargarContadores()]);

            setEstado({
                compartidosConmigo,
                misCompartidos,
                contadores,
                cargando: false,
                error: null
            });
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                if (esErrorSilencioso(error)) {
                    setEstado(prev => ({...prev, cargando: false}));
                    return;
                }
                setEstado(prev => ({
                    ...prev,
                    cargando: false,
                    error: 'Error al cargar los datos de compartidos'
                }));
            }
        }
    }, [cargarCompartidosConmigo, cargarMisCompartidos, cargarContadores]);

    /* Comparte un elemento con otro usuario (usuarioId = UUID del receptor) */
    const compartir = useCallback(
        async (tipo: TipoElementoCompartido, elementoId: number, usuarioId: number, rol: RolCompartido = 'colaborador'): Promise<boolean> => {
            try {
                const datos = await fetchAutenticado<CompartidoRust>('/shared', {
                    method: 'POST',
                    body: JSON.stringify({
                        itemType: tipo,
                        itemId: elementoId,
                        userId: String(usuarioId),
                        role: rol
                    })
                });

                setEstado(prev => ({
                    ...prev,
                    misCompartidos: [...prev.misCompartidos, mapearPorMi(datos)],
                    contadores: {
                        ...prev.contadores,
                        [tipo + 's']: (prev.contadores[(tipo + 's') as keyof ContadoresCompartidos] as number) + 1,
                        total: prev.contadores.total + 1
                    }
                }));
                return true;
            } catch {
                return false;
            }
        },
        [fetchAutenticado, mapearPorMi]
    );

    /* Deja de compartir un elemento (id = UUID del compartido) */
    const dejarDeCompartir = useCallback(
        async (compartidoId: number): Promise<boolean> => {
            try {
                await fetchAutenticado(`/shared/${compartidoId}`, {method: 'DELETE'});
                setEstado(prev => {
                    const enMisCompartidos = prev.misCompartidos.find(c => c.id === compartidoId);
                    const enCompartidosConmigo = prev.compartidosConmigo.find(c => c.id === compartidoId);
                    const tipo = enMisCompartidos?.tipo ?? enCompartidosConmigo?.tipo;

                    return {
                        ...prev,
                        misCompartidos: prev.misCompartidos.filter(c => c.id !== compartidoId),
                        compartidosConmigo: prev.compartidosConmigo.filter(c => c.id !== compartidoId),
                        contadores: tipo
                            ? {
                                  ...prev.contadores,
                                  [tipo + 's']: Math.max(0, (prev.contadores[(tipo + 's') as keyof ContadoresCompartidos] as number) - 1),
                                  total: Math.max(0, prev.contadores.total - 1)
                              }
                            : prev.contadores
                    };
                });
                return true;
            } catch {
                return false;
            }
        },
        [fetchAutenticado]
    );

    /* Actualiza el rol de un compartido */
    const actualizarRol = useCallback(
        async (compartidoId: number, nuevoRol: RolCompartido): Promise<boolean> => {
            try {
                await fetchAutenticado(`/shared/${compartidoId}/role`, {
                    method: 'PUT',
                    body: JSON.stringify({role: nuevoRol})
                });
                setEstado(prev => ({
                    ...prev,
                    misCompartidos: prev.misCompartidos.map(c => (c.id === compartidoId ? {...c, rol: nuevoRol} : c))
                }));
                return true;
            } catch {
                return false;
            }
        },
        [fetchAutenticado]
    );

    /* Obtiene los participantes de un elemento (propietario = usuario actual) */
    const obtenerParticipantes = useCallback(
        async (tipo: TipoElementoCompartido, elementoId: number): Promise<Participante[]> => {
            try {
                const propietarioId = obtenerIdUsuarioActual();
                if (!propietarioId) return [];

                const datos = await fetchAutenticado<{participants: ParticipanteRust[]}>(`/shared/participants/${tipo}/${elementoId}/${propietarioId}`);

                return (datos?.participants || []).map((p): Participante => ({
                    id: (p.id || p.user.id) as unknown as number,
                    usuarioId: p.user.id as unknown as number,
                    nombre: p.user.displayName,
                    email: p.user.email,
                    avatar: p.user.avatarUrl || '',
                    rol: p.role as RolCompartido,
                    esPropietario: p.isOwner
                }));
            } catch {
                return [];
            }
        },
        [fetchAutenticado]
    );

    /* Verifica si el usuario tiene acceso a un elemento */
    const verificarAcceso = useCallback(
        async (tipo: TipoElementoCompartido, elementoId: number, propietarioId: number): Promise<PermisosAcceso | null> => {
            try {
                const datos = await fetchAutenticado<{hasAccess: boolean; access: {role: string; canEdit: boolean; canDelete: boolean} | null}>(`/shared/access/${tipo}/${elementoId}/${propietarioId}`);

                if (datos?.hasAccess && datos.access) {
                    return {
                        rol: datos.access.role as RolCompartido,
                        puedeEditar: datos.access.canEdit,
                        puedeEliminar: datos.access.canDelete
                    };
                }
                return null;
            } catch {
                return null;
            }
        },
        [fetchAutenticado]
    );

    /* Filtra compañeros que aún no tienen acceso a un elemento */
    const obtenerCompanerosDisponibles = useCallback(
        (tipo: TipoElementoCompartido, elementoId: number, companeros: CompaneroEquipo[]): CompaneroEquipo[] => {
            const compartidosDelElemento = estado.misCompartidos.filter(c => c.tipo === tipo && c.elementoId === elementoId);

            const idsCompartidos = new Set(compartidosDelElemento.map(c => c.usuarioId));

            return companeros.filter(c => !idsCompartidos.has(c.companeroId));
        },
        [estado.misCompartidos]
    );

    /* Verifica si un elemento está siendo compartido con otros usuarios */
    const estaCompartido = useCallback(
        (tipo: TipoElementoCompartido, elementoId: number): boolean => {
            return estado.misCompartidos.some(c => c.tipo === tipo && c.elementoId === elementoId);
        },
        [estado.misCompartidos]
    );

    /* Carga inicial - solo si hay usuario autenticado */
    useEffect(() => {
        if (!haySesion()) {
            setEstado(prev => ({...prev, cargando: false}));
            return;
        }

        recargar();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [recargar, haySesion]);

    return {
        ...estado,
        compartir,
        dejarDeCompartir,
        actualizarRol,
        obtenerParticipantes,
        verificarAcceso,
        recargar,
        obtenerCompanerosDisponibles,
        estaCompartido
    };
}

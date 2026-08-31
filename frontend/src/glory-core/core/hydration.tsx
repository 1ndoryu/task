/*
 * Motor de hidratacion/montaje de islas React.
 * Extrae y mejora la logica que antes vivia en main.tsx.
 *
 * Soporta dos modos:
 *   A) Islas individuales: busca [data-island] y monta cada uno (legacy/fallback).
 *   B) SPA: si __GLORY_ROUTES__ existe, monta un PageRenderer unico
 *      que intercambia islas sin recarga al navegar.
 *
 * Flujo por isla (modo A):
 *   1. Busca contenedores [data-island] en el DOM
 *   2. Resuelve el componente via IslandRegistry
 *   3. Parsea props de data-props (JSON)
 *   4. Envuelve en: StrictMode > GloryProvider > AppProvider? > ErrorBoundary > Suspense? > DevOverlay?
 *   5. Monta con createRoot (CSR) o hydrateRoot (SSG)
 *
 * Si el montaje falla por completo, escribe un mensaje visible en el contenedor
 * para que el fallo no quede silenciado (el usuario no ve la consola).
 */

import { StrictMode, Suspense, type ComponentType, type ReactNode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { islandRegistry } from './IslandRegistry';
import { IslandErrorBoundary } from './ErrorBoundary';
import {logError, logWarn} from '../../app/utils/logger';
import { GloryProvider } from './GloryProvider';
import { DevOverlay } from './DevOverlay';
import { useNavigationStore } from './router/navigationStore';
import { PageRenderer } from './router/PageRenderer';
import type { GloryRoutesMap } from './router/navigationStore';

export interface InitOptions {
    appProvider?: ComponentType<{ children: ReactNode }>;
    suspenseFallback?: ReactNode;
}

const defaultSuspenseFallback = (
    <div style={{ /* sentinel-disable inline-style-prohibido — fallback cargando framework Glory */ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
        Cargando...
    </div>
);

/*
 * Construye el arbol de wrappers alrededor de un elemento.
 * AppProvider es opcional y definido por el proyecto usuario en appIslands.tsx.
 */
function wrapWithProviders(
    element: JSX.Element,
    appProvider?: ComponentType<{ children: ReactNode }>,
): JSX.Element {
    const AppProv = appProvider;
    const wrapped = AppProv ? <AppProv>{element}</AppProv> : element;
    return <GloryProvider>{wrapped}</GloryProvider>;
}

/* Parsea props JSON del contenedor. Devuelve undefined si el JSON es invalido:
 * el caller degrada con props por defecto y la isla sigue montandose. El catch
 * vacio es intencional: "no parseable -> defaults" es la semantica por convenio
 * del sobrenombre, asi que no hay un error visible que reportar. */
function parsearPropsSeguro(json: string): Record<string, unknown> | undefined {
    try {
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        return undefined;
    }
}

/*
 * Monta una isla individual en su contenedor DOM.
 */
function mountIsland(
    container: HTMLElement,
    islandName: string,
    props: Record<string, unknown>,
    options: InitOptions,
): void {
    const resolved = islandRegistry.resolve(islandName);
    if (!resolved) {
        logError('hydration', `Componente "${islandName}" no registrado en IslandRegistry`);
        return;
    }

    const { component: Component, isLazy } = resolved;
    const shouldHydrate = container.dataset.hydrate === 'true';
    const hasContent =
        container.innerHTML.trim() !== '' &&
        !container.innerHTML.includes('<!-- react-island-loading -->');

    let islandContent: JSX.Element = <Component {...props} />;

    /* Lazy: envolver en Suspense para mostrar fallback mientras carga */
    if (isLazy) {
        islandContent = (
            <Suspense fallback={options.suspenseFallback ?? defaultSuspenseFallback}>
                {islandContent}
            </Suspense>
        );
    }

    /* DevOverlay solo en desarrollo */
    if (import.meta.env.DEV) {
        islandContent = (
            <DevOverlay islandName={islandName} props={props}>
                {islandContent}
            </DevOverlay>
        );
    }

    const element = (
        <StrictMode>
            {wrapWithProviders(
                <IslandErrorBoundary islandName={islandName}>
                    {islandContent}
                </IslandErrorBoundary>,
                options.appProvider,
            )}
        </StrictMode>
    );

    try {
        if (shouldHydrate && hasContent) {
            hydrateRoot(container, element);
            if (import.meta.env.DEV) {
                logWarn('hydration', `Isla "${islandName}" hidratada (SSG)`);
            }
        } else {
            container.innerHTML = '';
            createRoot(container).render(element);
            if (import.meta.env.DEV) {
                logWarn('hydration', `Isla "${islandName}" montada (CSR)`);
            }
        }
    } catch (error) {
        /* El feedback real al usuario es renderFalloVisible (vuelca un mensaje
         * visible en el contenedor con el detalle en el title): el error
         * seria redundante, por eso no se registra aqui. */
        if (shouldHydrate) {
            /* Fallback: si la hidratacion falla, intentar CSR. El usuario recibe
             * el mensaje visible solo si el CSR tambien falla. */
            try {
                container.innerHTML = '';
                createRoot(container).render(element);
            } catch (fallbackError) {
                renderFalloVisible(container, islandName, fallbackError);
            }
        } else {
            renderFalloVisible(container, islandName, error);
        }
    }
}

/* Fallo total de montaje: vuelca un mensaje visible en el contenedor en vez de
 * dejarlo en blanco, para que el error no quede silenciado en produccion. */
function renderFalloVisible(container: HTMLElement, islandName: string, error: unknown): void {
    const detalle = error instanceof Error ? error.message : String(error);
    const escondido = document.createElement('div');
    escondido.style.padding = '12px';
    escondido.style.textAlign = 'center';
    escondido.style.color = '#b91c1c';
    escondido.style.fontSize = '13px';
    escondido.textContent = `La sección "${islandName}" no pudo cargarse. Recarga la página o reintenta luego.`;
    escondido.title = `[Glory] ${detalle}`;
    /* Escribir el mensaje directamente: renderFalloVisible se invoca desde bloques
     * catch ya establecidos y no necesita un try anidado (si el contenedor ya no
     * esta en el DOM no hay un segundo fallo real que capturar). */
    container.innerHTML = '';
    container.replaceChildren(escondido);
}

/*
 * Inicializa todas las islas React encontradas en el DOM.
 * Si __GLORY_ROUTES__ esta disponible, activa modo SPA con PageRenderer.
 * Si no, monta islas individualmente (modo clasico).
 */
export function initializeIslands(options: InitOptions = {}): void {
    const routes = window.__GLORY_ROUTES__ as GloryRoutesMap | undefined;

    /* Modo SPA: hay rutas definidas, montar PageRenderer en el contenedor principal */
    if (routes && Object.keys(routes).length > 0) {
        initializeSPA(routes, options);
        return;
    }

    /* Modo clasico: montar islas individuales */
    initializeClassicIslands(options);
}

/*
 * Modo SPA: monta un unico PageRenderer que intercambia islas segun la ruta.
 * El contenedor [data-island] existente se reutiliza como root.
 */
function initializeSPA(routes: GloryRoutesMap, options: InitOptions): void {
    /*
     * Los callable props de PHP se omiten de __GLORY_ROUTES__ por diseño,
     * pero SÍ se evalúan y serializan en data-props del contenedor DOM.
     * Leer esos props evaluados y mergarlos en la ruta actual del mapa,
     * para que la isla inicial reciba datos como el usuario autenticado.
     */
    const contenedorInicial = document.querySelector<HTMLElement>('[data-island]');

    /* Extraer props evaluados del servidor (data-props del DOM).
     * Para rutas dinámicas (/cancion/slug), la búsqueda exacta en el mapa fallaría
     * porque el mapa solo tiene /cancion/. Se pasan directamente a inicializar,
     * que usa buscarRutaEnMapa (soporta prefijo) y los mergea sobre los props del mapa. */
    let propsEvaluadosServidor: Record<string, unknown> | undefined;
    if (contenedorInicial?.dataset.props) {
        const parseado = parsearPropsSeguro(contenedorInicial.dataset.props);
        if (parseado) {
            propsEvaluadosServidor = parseado;
        }
    }

    /* Inicializar store con rutas + props evaluados del servidor para la ruta inicial */
    useNavigationStore.getState().inicializar(routes, window.location.pathname, propsEvaluadosServidor);

    if (import.meta.env.DEV) {
        const rutasStr = Object.keys(routes).join(', ');
        logWarn('hydration', `Modo SPA activo con ${Object.keys(routes).length} rutas: ${rutasStr}`);
    }

    /* Encontrar el contenedor principal [data-island] para montar el PageRenderer */
    const container = document.querySelector<HTMLElement>('[data-island]');
    if (!container) {
        if (import.meta.env.DEV) {
            logError('hydration', 'No se encontro contenedor [data-island] para PageRenderer');
        }
        return;
    }

    const AppProv = options.appProvider;

    const element = (
        <StrictMode>
            <GloryProvider>
                {AppProv ? (
                    <AppProv>
                        <PageRenderer suspenseFallback={options.suspenseFallback} />
                    </AppProv>
                ) : (
                    <PageRenderer suspenseFallback={options.suspenseFallback} />
                )}
            </GloryProvider>
        </StrictMode>
    );

    container.innerHTML = '';
    createRoot(container).render(element);

    if (import.meta.env.DEV) {
        const { islaActual } = useNavigationStore.getState();
        logWarn('hydration', `PageRenderer montado, isla inicial: ${islaActual}`);
    }
}

/*
 * Modo clasico: monta cada isla individualmente en su contenedor DOM.
 */
function initializeClassicIslands(options: InitOptions): void {
    const islands = document.querySelectorAll<HTMLElement>('[data-island]');

    if (islands.length === 0) {
        if (import.meta.env.DEV) {
            logWarn('hydration', 'No se encontraron islas para montar');
        }
        return;
    }

    if (import.meta.env.DEV) {
        logWarn('hydration', `Montando ${islands.length} isla(s), registry: ${islandRegistry.getNames().join(', ')}`);
    }

    islands.forEach((container) => {
        const islandName = container.dataset.island;

        if (!islandName) {
            logError('hydration', 'Contenedor sin nombre de isla:', container);
            return;
        }

        let props: Record<string, unknown> = {};
        const propsJson = container.dataset.props;

        if (propsJson) {
            const parseado = parsearPropsSeguro(propsJson);
            if (parseado) {
                props = parseado;
            }
        }

        mountIsland(container, islandName, props, options);
    });
}

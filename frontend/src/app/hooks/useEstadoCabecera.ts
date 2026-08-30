/*
 * useEstadoCabecera
 * [por que] DashboardEncabezado acumulaba 4 useState + el effect de collapse
 * del buscador (ResizeObserver). Extraerlo a un hook quita el estado local de
 * UI del componente y lo deja como orquestador puro (usestate-excesivo).
 */
import {useLayoutEffect, useRef, useState} from 'react';

/* El input de escritorio (.encabezadoBuscador) es position:absolute centrado
 * con ancho fijo 320px, así que su borde derecho = centro del header + 160.
 * Calcular contra el header evita el deadlock de medir el propio input
 * (que desaparece al colapsar y nunca se restauraría). */
const ANCHO_BUSCADOR = 320;

export function useEstadoCabecera(puedeBuscarGlobal: boolean) {
    /* Estado Local de UI (Orquestación) */
    const [drawerAbierto, setDrawerAbierto] = useState(false);
    const [mostrarBuscadorMovil, setMostrarBuscadorMovil] = useState(false);
    const [menuOpcionesMovilAbierto, setMenuOpcionesMovilAbierto] = useState(false);

    /* [19-08-2026] Buscador responsive: si el input centrado de escritorio
     * choca con los botones de encabezadoNav (viewport estrecho), se colapsa
     * a un boton de lupa dentro de la nav que abre el mismo modal de busqueda.
     * Se mide con ResizeObserver para reaccionar a cambios de ancho. */
    const encabezadoRef = useRef<HTMLElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const [buscadorColapsado, setBuscadorColapsado] = useState(false);

    useLayoutEffect(() => {
        const encabezado = encabezadoRef.current;
        if (!encabezado) return;

        const medir = () => {
            const nav = navRef.current;
            if (!nav) return;
            const nRect = nav.getBoundingClientRect();
            const hRect = encabezado.getBoundingClientRect();
            const centroHeader = hRect.left + hRect.width / 2;
            const bordeDerechoBuscador = centroHeader + ANCHO_BUSCADOR / 2;
            /* El boton de lupa colapsado vive DENTRO de la nav: medirlo como
             * parte de la nav crearia un deadlock (la lupa empuja la nav a la
             * izquierda y el choque nunca se restaura). Se excluye su ancho. */
            const botonLupa = nav.querySelector<HTMLElement>('.botonBuscadorEncabezado');
            const anchoLupa = botonLupa ? botonLupa.getBoundingClientRect().width + 8 : 0;
            const navLeftSinLupa = nRect.left + anchoLupa;
            /* choca cuando el borde derecho del buscador pasa el borde izquierdo
             * de la nav sin la lupa (con 8px de margen de seguridad) */
            setBuscadorColapsado(bordeDerechoBuscador > navLeftSinLupa - 8);
        };
        medir();

        const observador = new ResizeObserver(medir);
        observador.observe(encabezado);
        window.addEventListener('resize', medir);
        return () => {
            observador.disconnect();
            window.removeEventListener('resize', medir);
        };
    }, [puedeBuscarGlobal]);

    return {
        ANCHO_BUSCADOR,
        encabezadoRef,
        navRef,
        drawerAbierto,
        onAbrirDrawer: () => setDrawerAbierto(true),
        onCerrarDrawer: () => setDrawerAbierto(false),
        mostrarBuscadorMovil,
        setMostrarBuscadorMovil,
        menuOpcionesMovilAbierto,
        onAbrirMenuOpcionesMovil: () => setMenuOpcionesMovilAbierto(true),
        onCerrarMenuOpcionesMovil: () => setMenuOpcionesMovilAbierto(false),
        buscadorColapsado
    };
}
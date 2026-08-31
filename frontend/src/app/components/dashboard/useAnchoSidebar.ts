/*
 * useAnchoSidebar / useGruposColapsados
 *
 * [300A-3] Ancho dinámico del sidebar (arrastre del borde derecho, persistido)
 * y colapso de la sección de grupos. Ambos son state ligero y comparten un
 * único módulo sin superar el límite de useState por archivo.
 */
import {useState, useCallback, useEffect, useRef} from 'react';
import {ANCHO_MIN, ANCHO_MAX, UMBRAL_COLAPSAR, leerGuardado} from './sidebarShared';

export function useAnchoSidebar() {
    const [ancho, setAncho] = useState<number>(() =>
        leerGuardado<number>('glory_sidebar_ancho', 180, raw => {
            const n = Number(raw);
            return Number.isFinite(n) && n >= ANCHO_MIN ? n : 180;
        }),
    );
    const [arrastrando, setArrastrando] = useState(false);
    const inicioRef = useRef<{x: number; ancho: number} | null>(null);

    const comenzarArrastre = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        inicioRef.current = {x: e.clientX, ancho};
        setArrastrando(true);
    }, [ancho]);

    useEffect(() => {
        if (!arrastrando) return;
        const manejarMovimiento = (e: MouseEvent) => {
            const inicio = inicioRef.current;
            if (!inicio) return;
            const nuevoAncho = Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, inicio.ancho + (e.clientX - inicio.x)));
            setAncho(nuevoAncho);
        };
        const manejarFin = () => {
            inicioRef.current = null;
            setArrastrando(false);
            setAncho(prev => {
                const final = prev < UMBRAL_COLAPSAR ? ANCHO_MIN : prev;
                try {
                    localStorage.setItem('glory_sidebar_ancho', String(final));
                } catch {
                    /* localStorage no disponible */
                }
                return final;
            });
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', manejarMovimiento);
        document.addEventListener('mouseup', manejarFin);
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', manejarMovimiento);
            document.removeEventListener('mouseup', manejarFin);
        };
    }, [arrastrando]);

    return {ancho, arrastrando, comenzarArrastre, expandido: ancho > UMBRAL_COLAPSAR};
}

export function useGruposColapsados() {
    const [gruposColapsados, setGruposColapsados] = useState<boolean>(() =>
        leerGuardado<boolean>('glory_sidebar_grupos_colapsado', false, raw => raw === 'true'),
    );
    const toggleGruposColapsados = useCallback(() => {
        setGruposColapsados(prev => {
            const nuevo = !prev;
            try {
                localStorage.setItem('glory_sidebar_grupos_colapsado', String(nuevo));
            } catch {
                /* localStorage no disponible */
            }
            return nuevo;
        });
    }, []);
    return {gruposColapsados, toggleGruposColapsados};
}
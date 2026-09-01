/*
 * glory-core/components/pixelart/EditorPixelArt.tsx
 * Editor de pixel art AGNÓSTICO y reutilizable (glory-core).
 * sentinel-disable-file componente-sin-hook-glory — editor editorial (glory-core): capa de
 * framework/editorial sin design system de la app (§4.2 plan 318A-3); no extraer hook de producto.
 *
 * No conoce nada del plugin Game ni del árbol: es un lienzo de cuadrícula
 * dibujable donde un consumidor pinta/borra celdas. Útil para cualquier otro
 * caso (iconos, sprites, mapas pequeños): recibe el estado del lienzo y
 * emite cambios.
 *
 * API:
 * - `dimensionesDfx`: ancho de la cuadrícula (por defecto 16) cuadrada.
 * - `activas`: Set de celdas "`${x},${y}`" pintadas (state externo).
 * - `onCambio(celdas, nuevaActivaClave)`: se llama al pintar/borrar con el
 *   Set actualizado y la clave tocada.
 * - `bloqueadas`: Set de celdas no editables (ej. tronco fijo en el caso árbol).
 * - `mostrar`: si pinta estáticas en color de relleno (o transparente).
 *
 * Convención coordenadas: origen (0,0) arriba-izquierda; x crece a derecha,
 * y crece hacia abajo, matching la lectura de arriba a abajo al dibujar.
 * El widget pinta en el color de relleno dado (blanco por defecto).
 */

import {useCallback, useRef, useState} from 'react';
import {Pencil, Eraser, Grid3X3, Trash2, MousePointer} from 'lucide-react';
import './editorPixelArt.css';

export type HerramientaPixelArt = 'pluma' | 'pluma2' | 'borrador' | 'ver';

interface EditorPixelArtProps {
    dimensiones?: number;
    activas: Set<string>;
    onCambio: (nuevasActivas: Set<string>, toque: {x: number; y: number; poner: boolean}) => void;
    bloqueadas?: Set<string>;
    colorRelleno?: string;
    /* Muestra u oculta las líneas de la cuadrícula (auto). */
    mostrarCuadricula?: boolean;
}

export function EditorPixelArt({
    dimensiones = 16,
    activas,
    onCambio,
    bloqueadas = new Set(),
    colorRelleno = '#ffffff',
    mostrarCuadricula = true
}: EditorPixelArtProps): JSX.Element {
    const [herramienta, setHerramienta] = useState<HerramientaPixelArt>('pluma');
    const pintandoRef = useRef(false);
    const ultimaClaveRef = useRef<string | null>(null);

    /* Pintar una celda con la herramienta activa. El borrador borra de
     * corrido al arrastrar (no requiere shift); la pluma pinta; 'ver' navega
     * sin tocar el lienzo. */
    const pintarEn = useCallback(
        (x: number, y: number, forzar?: 'borrar') => {
            if (bloqueadas.has(`${x},${y}`)) return;
            if (herramienta === 'ver') return;

            const siguiente = new Set(activas);
            /* La pluma SIEMPRE pinta (nunca borra al pasar sobre una celda ya
             * pintada); el borrador (o shift/click derecho que fuerza 'borrar')
             * es lo único que elimina. Antes era un toggle (poner = !tiene) y
             * al arrastrar el pincel sobre celdas pintadas las borraba. */
            let poner: boolean;
            if (herramienta === 'borrador' || forzar === 'borrar') poner = false;
            else poner = true;

            const operarCelda = (px: number, py: number, val: boolean) => {
                if (px >= dimensiones || py >= dimensiones) return;
                const kClave = `${px},${py}`;
                if (bloqueadas.has(kClave)) return;
                if (val) siguiente.add(kClave);
                else siguiente.delete(kClave);
            };

            if (herramienta === 'pluma2') {
                operarCelda(x, y, poner);
                operarCelda(x + 1, y, poner);
                operarCelda(x, y + 1, poner);
                operarCelda(x + 1, y + 1, poner);
            } else {
                operarCelda(x, y, poner);
            }
            onCambio(siguiente, {x, y, poner});
        },
        [activas, bloqueadas, dimensiones, herramienta, onCambio]
    );

    const manejadorDown = useCallback(
        (e: React.MouseEvent, x: number, y: number) => {
            pintandoRef.current = true;
            e.preventDefault();
            const forzar: 'borrar' | undefined = e.shiftKey || e.button === 2 ? 'borrar' : undefined;
            pintarEn(x, y, forzar);
        },
        [pintarEn]
    );

    const manejadorMove = useCallback(
        (e: React.MouseEvent, x: number, y: number) => {
            if (!pintandoRef.current) return;
            const clave = `${x},${y}`;
            if (ultimaClaveRef.current === clave) return;
            ultimaClaveRef.current = clave;
            const forzar: 'borrar' | undefined = e.shiftKey || e.button === 2 ? 'borrar' : undefined;
            pintarEn(x, y, forzar);
        },
        [pintarEn]
    );

    const soltar = useCallback(() => {
        pintandoRef.current = false;
        ultimaClaveRef.current = null;
    }, []);

    const limpiar = useCallback(() => {
        /* Limpia solo celdas no bloqueadas. */
        const siguiente = new Set<string>();
        for (const clave of activas) if (bloqueadas.has(clave)) siguiente.add(clave);
        onCambio(siguiente, {x: -1, y: -1, poner: false});
    }, [activas, bloqueadas, onCambio]);

    const celdas: JSX.Element[] = [];
    for (let i = 0; i < dimensiones * dimensiones; i++) {
        const x = i % dimensiones;
        const y = Math.floor(i / dimensiones);
        const clave = `${x},${y}`;
        const pintada = activas.has(clave) || bloqueadas.has(clave);
        const bloqueada = bloqueadas.has(clave);
        celdas.push(
            <div
                key={clave}
                className={`editorPixelCelda ${pintada ? 'editorPixelCelda--activa' : ''} ${bloqueada ? 'editorPixelCelda--bloqueada' : ''}`}
                onMouseDown={e => manejadorDown(e, x, y)}
                onMouseMove={e => manejadorMove(e, x, y)}
                onContextMenu={e => e.preventDefault()}
                style={pintada ? {background: colorRelleno} : undefined}
            />
        );
    }

    return (
        <div className="editorPixel">
            <div className="editorPixelToolbar">
                <button
                    className={`editorPixelHerramienta ${herramienta === 'pluma' ? 'editorPixelHerramienta--activa' : ''}`}
                    title="Pluma (pinta 1 celda)"
                    onClick={() => setHerramienta('pluma')}
                >
                    <Pencil size={14} />
                </button>
                <button
                    className={`editorPixelHerramienta ${herramienta === 'pluma2' ? 'editorPixelHerramienta--activa' : ''}`}
                    title="Pluma 2x2"
                    onClick={() => setHerramienta('pluma2')}
                >
                    <Grid3X3 size={14} />
                </button>
                <button
                    className={`editorPixelHerramienta ${herramienta === 'borrador' ? 'editorPixelHerramienta--activa' : ''}`}
                    title="Borrador (borra de corrido al arrastrar)"
                    onClick={() => setHerramienta('borrador')}
                >
                    <Eraser size={14} />
                </button>
                <button
                    className={`editorPixelHerramienta ${herramienta === 'ver' ? 'editorPixelHerramienta--activa' : ''}`}
                    title="Ver / navegar (sin pintar)"
                    onClick={() => setHerramienta('ver')}
                >
                    <MousePointer size={14} />
                </button>
                <span className="editorPixelToolbarSep" />
                <button className="editorPixelHerramienta editorPixelHerramienta--destructiva" title="Limpiar lienzo" onClick={limpiar}>
                    <Trash2 size={14} />
                </button>
            </div>

            <div
                className={`editorPixelGrid ${mostrarCuadricula ? 'editorPixelGrid--cuadricula' : ''}`}
                onMouseLeave={soltar}
                onMouseUp={soltar}
                tabIndex={0}
                role="grid"
                aria-label="Editor de pixel art"
                style={{['--pixel-df' as string]: dimensiones}}
            >
                {celdas}
            </div>
        </div>
    );
}
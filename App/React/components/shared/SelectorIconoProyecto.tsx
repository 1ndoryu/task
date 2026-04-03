/*
 * SelectorIconoProyecto
 * Grid de iconos predefinidos con seleccion de color
 * Permite elegir un icono y color para identificar proyectos
 *
 * Fase 9.2.1: Selector de icono para proyectos
 */

import {useState, useRef, useEffect} from 'react';
import {Folder, FolderOpen, Briefcase, Code, Palette, BookOpen, Heart, Star, Zap, Target, Trophy, Flag, Home, Building, Plane, Car, ShoppingCart, DollarSign, Users, MessageSquare, Mail, Phone, Calendar, Clock, Camera, Music, Film, Gamepad2, Dumbbell, Coffee} from 'lucide-react';import {Boton} from '../ui';
/* Categorias de iconos disponibles */
const CATEGORIAS_ICONOS = {
    trabajo: [
        {id: 'folder', Icono: Folder},
        {id: 'folderOpen', Icono: FolderOpen},
        {id: 'briefcase', Icono: Briefcase},
        {id: 'code', Icono: Code},
        {id: 'palette', Icono: Palette},
        {id: 'bookOpen', Icono: BookOpen}
    ],
    personal: [
        {id: 'heart', Icono: Heart},
        {id: 'star', Icono: Star},
        {id: 'zap', Icono: Zap},
        {id: 'target', Icono: Target},
        {id: 'trophy', Icono: Trophy},
        {id: 'flag', Icono: Flag}
    ],
    vida: [
        {id: 'home', Icono: Home},
        {id: 'building', Icono: Building},
        {id: 'plane', Icono: Plane},
        {id: 'car', Icono: Car},
        {id: 'shoppingCart', Icono: ShoppingCart},
        {id: 'dollarSign', Icono: DollarSign}
    ],
    social: [
        {id: 'users', Icono: Users},
        {id: 'messageSquare', Icono: MessageSquare},
        {id: 'mail', Icono: Mail},
        {id: 'phone', Icono: Phone},
        {id: 'calendar', Icono: Calendar},
        {id: 'clock', Icono: Clock}
    ],
    hobbies: [
        {id: 'camera', Icono: Camera},
        {id: 'music', Icono: Music},
        {id: 'film', Icono: Film},
        {id: 'gamepad2', Icono: Gamepad2},
        {id: 'dumbbell', Icono: Dumbbell},
        {id: 'coffee', Icono: Coffee}
    ]
} as const;

/* Colores disponibles */
const COLORES_DISPONIBLES = [
    {id: 'gris', valor: '#888888'},
    {id: 'rojo', valor: '#ef4444'},
    {id: 'naranja', valor: '#f97316'},
    {id: 'amarillo', valor: '#eab308'},
    {id: 'verde', valor: '#22c55e'},
    {id: 'azul', valor: '#3b82f6'},
    {id: 'morado', valor: '#a855f7'},
    {id: 'rosa', valor: '#ec4899'}
];

/* Nombres de categorias en espanol */
const NOMBRES_CATEGORIAS: Record<string, string> = {
    trabajo: 'Trabajo',
    personal: 'Personal',
    vida: 'Vida',
    social: 'Social',
    hobbies: 'Hobbies'
};

interface SelectorIconoProyectoProps {
    iconoId: string;
    colorIcono: string;
    onCambio: (iconoId: string, colorIcono: string) => void;
}

export function SelectorIconoProyecto({iconoId, colorIcono, onCambio}: SelectorIconoProyectoProps): JSX.Element {
    const [abierto, setAbierto] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);

    /* Cerrar al hacer click fuera */
    useEffect(() => {
        const manejarClickFuera = (evento: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
                setAbierto(false);
            }
        };

        if (abierto) {
            document.addEventListener('mousedown', manejarClickFuera);
        }

        return () => {
            document.removeEventListener('mousedown', manejarClickFuera);
        };
    }, [abierto]);

    /* Obtener el icono actual */
    const obtenerIconoActual = () => {
        for (const categoria of Object.values(CATEGORIAS_ICONOS)) {
            const encontrado = categoria.find(i => i.id === iconoId);
            if (encontrado) return encontrado;
        }
        return CATEGORIAS_ICONOS.trabajo[0];
    };

    const iconoActual = obtenerIconoActual();
    const IconoActual = iconoActual.Icono;

    const manejarSeleccionIcono = (nuevoIconoId: string) => {
        onCambio(nuevoIconoId, colorIcono);
    };

    const manejarSeleccionColor = (nuevoColor: string) => {
        onCambio(iconoId, nuevoColor);
    };

    return (
        <div ref={contenedorRef} className="selectorIconoProyecto">
            <Boton type="button" variante="ghost" claseAdicional="selectorIconoProyecto__trigger" onClick={() => setAbierto(!abierto)} title="Cambiar icono">
                <IconoActual size={16} style={{/* sentinel-disable inline-style-prohibido */ color: colorIcono}} />
            </Boton>

            {abierto && (
                <div className="selectorIconoProyecto__dropdown">
                    {Object.entries(CATEGORIAS_ICONOS).map(([categoria, iconos]) => (
                        <div key={categoria} className="selectorIconoProyecto__categoria">
                            <div className="selectorIconoProyecto__categoriaTitulo">{NOMBRES_CATEGORIAS[categoria]}</div>
                            <div className="selectorIconoProyecto__grid">
                                {iconos.map(({id, Icono}) => (
                                    <Boton key={id} type="button" variante="ghost" claseAdicional={`selectorIconoProyecto__opcion${id === iconoId ? ' selectorIconoProyecto__opcion--seleccionado' : ''}`} onClick={() => manejarSeleccionIcono(id)} title={id}>
                                        <Icono size={14} style={{/* sentinel-disable inline-style-prohibido */ color: colorIcono}} />
                                    </Boton>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="selectorColores">
                        {COLORES_DISPONIBLES.map(({id, valor}) => (
                            <Boton key={id} type="button" variante="ghost" claseAdicional={`selectorColores__opcion${valor === colorIcono ? ' selectorColores__opcion--seleccionado' : ''}`} style={{/* sentinel-disable inline-style-prohibido */ backgroundColor: valor}} onClick={() => manejarSeleccionColor(valor)} title={id} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* Exportar constantes para uso externo */
export {CATEGORIAS_ICONOS, COLORES_DISPONIBLES};

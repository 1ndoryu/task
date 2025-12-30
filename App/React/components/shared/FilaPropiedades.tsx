/*
 * FilaPropiedades
 * Fila reutilizable para mostrar propiedades con etiqueta y pills
 * Sigue el patron visual de PropiedadesCompactas
 *
 * Fase 9.4/9.5: Layout consistente para propiedades extendidas
 */

interface FilaPropiedadesProps {
    etiqueta: string;
    children: React.ReactNode;
}

export function FilaPropiedades({etiqueta, children}: FilaPropiedadesProps): JSX.Element {
    return (
        <div className="propiedadesCompactas">
            <span className="propiedadesCompactas__etiqueta">{etiqueta}</span>
            <div className="propiedadesCompactas__contenido">{children}</div>
        </div>
    );
}

export type {FilaPropiedadesProps};

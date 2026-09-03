/*
 * islands/GaleriaVisualIsland.tsx
 * Fase 4.5 del plan-agente-ia-plugin (sección 9.5): galería visual del chat
 * del agente. Ruta /agente/visuales, SOLO en dev (registrada en main.tsx bajo
 * import.meta.env.DEV). Renderiza los 19 ítems del checklist con los MISMOS
 * componentes del chat (plugins/agente/componentes.tsx) alimentados por
 * fixtures realistas (plugins/agente/fixtures.ts) — no hay copias ni maquetas
 * divergentes. Incluye toggle de los 3 temas (data-theme real del proyecto:
 * 'original' cae a :root (oscuro) y 'claro' tiene selector propio).
 * 318A-7: se añadió el ítem 20-contexto-detallado (desglose + botón Compactar).
 */

import {useEffect, useState} from 'react';
import {Monitor, Sun} from 'lucide-react';
import {CATALOGO} from '../plugins/agente/fixtures';
import {VISTAS, Entrada} from './GaleriaVisualVistas';
import {Boton} from '../components/ui';

import '../styles/dashboard/componentes/panelIA.css';
import '../plugins/agente/panelAgente.css';
import '../plugins/agente/modalConfigAgente.css';
import './galeriaVisual.css';

type TemaGaleria = 'original' | 'claro';

/* [029A-1] Vistas en GaleriaVisualVistas.tsx (limite-lineas). */

export function GaleriaVisualIsland(): JSX.Element {
    const [tema, setTema] = useState<TemaGaleria>('original');

    /* Aplica el tema real del proyecto (data-theme) y lo restaura al salir. */
    useEffect(() => {
        const anterior = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', tema);
        return () => {
            if (anterior) {
                document.documentElement.setAttribute('data-theme', anterior);
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        };
    }, [tema]);

    return (
        <div className="galeriaVisual">
            <header className="galeriaVisualCabecera">
                <div>
                    <h1 className="galeriaVisualTitulo">Galería visual del agente</h1>
                    <p className="galeriaVisualSub">
                        Los 19 ítems de la sección 9.5 + el ítem 20-contexto-detallado (318A-7)
                        con los mismos componentes del chat
                        (plugins/agente/componentes.tsx) y fixtures compartidos (fixtures.ts). Dev only.
                    </p>
                </div>
                <Boton
                    variante="secundario"
                    tamano="pequeño"
                    claseAdicional="galeriaVisualTema"
                    icono={tema === 'original' ? <Monitor size={14} /> : <Sun size={14} />}
                    onClick={() => setTema(t => (t === 'original' ? 'claro' : 'original'))}
                    title="Alternar tema: Terminal → Claro"
                >
                    {tema === 'original' ? 'Terminal' : 'Claro'}
                </Boton>
            </header>

            <main className="galeriaVisualGrid">
                {CATALOGO.map(entrada => {
                    const Vista = VISTAS[entrada.id];
                    return (
                        <Entrada key={entrada.id} entrada={entrada}>
                            {Vista ? <Vista /> : null}
                        </Entrada>
                    );
                })}
            </main>
        </div>
    );
}

export default GaleriaVisualIsland;

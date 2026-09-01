/* [318A-4] Catálogo de modelos y controles del input del agente.
 * Extraído de plugins/agente/componentes.tsx (seam natural): el catálogo y el
 * menú contextual de modelo/modo son una unidad independiente de los demás
 * componentes visuales del plugin. */
import {useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown} from 'lucide-react';
import {Boton} from '../../components/ui/Boton';
import {MenuContextual} from '../../components/shared/MenuContextual';
import type {OpcionMenu} from '../../components/shared/MenuContextual';

export type ModoAgente = 'predeterminado' | 'meta' | 'autonomo';

export const MODOS_AGENTE: ReadonlyArray<{id: ModoAgente; nombre: string; descripcion: string}> = Object.freeze([
    {id: 'predeterminado', nombre: 'Predeterminado', descripcion: 'Pide aprobación para herramientas con efecto.'},
    {id: 'meta', nombre: 'Meta', descripcion: 'Permite ajustar reglas además de pedir aprobación.'},
    {id: 'autonomo', nombre: 'Autónomo', descripcion: 'Ejecuta herramientas con efecto sin preguntar.'},
]);

/* [318A-4] Catálogo de modelos para el selector del input. Orden:
 * "auto" (deja que el backend resuelva la ruta, hoy Glory/commandcode) y luego
 * los modelos conocidos del backend (src/services/ai.rs). El backend aún fija
 * Glory/commandcode como política de servidor, pero la UI queda lista para
 * cuando los usuarios traigan sus propias APIs y haya varios gratuitos. */
export const MODELOS_AGENTE: ReadonlyArray<{id: string; nombre: string; proveedor: string; descripcion: string}> = Object.freeze([
    {id: 'auto', nombre: 'Auto', proveedor: 'glory', descripcion: 'Deja que el servidor elija la mejor ruta.'},
    /* [02-09-2026] Laguna S 2.1 Free: modelo GRATIS (100% OFF) de Command Code
     * Provider API directa (sin gloryapi). El ID real del endpoint Provider es
     * `poolside/laguna-s-2.1-free` (prefijo poolside/, verificado en /models).
     * Requiere COMMAND_CODE_API_KEY en el backend (y $1 de crédito en la
     * cuenta). Primera opción del fallback. */
    {id: 'poolside/laguna-s-2.1-free', nombre: 'Laguna S 2.1 Free', proveedor: 'commandcode', descripcion: 'Command Code Provider · GRATIS (mientras haya capacidad).'},
    {id: 'commandcode', nombre: 'Commandcode', proveedor: 'glory', descripcion: 'Glory API · ruta auto → DeepSeek Flash.'},
    {id: 'glm-5.3-flash', nombre: 'GLM 5.3 Flash', proveedor: 'glory', descripcion: 'Glory API · modelo gratuito disponible.'},
    {id: 'deepseek-v4-flash', nombre: 'DeepSeek V4 Flash', proveedor: 'deepseek', descripcion: 'API DeepSeek directa.'},
    {id: 'groq/compound-mini', nombre: 'Compound Mini', proveedor: 'groq', descripcion: 'API Groq · rápido y compacto.'},
    {id: 'groq/compound', nombre: 'Compound', proveedor: 'groq', descripcion: 'API Groq · general.'},
    {id: 'cerebras/gemma-4-31b', nombre: 'Gemma 4 31B', proveedor: 'cerebras', descripcion: 'API Cerebras.'},
    {id: 'cerebras/gpt-oss-120b', nombre: 'GPT-OSS 120B', proveedor: 'cerebras', descripcion: 'API Cerebras · razonamiento.'},
]);

interface ControlesInputIAProps {
    modelo: string;
    modo: ModoAgente;
    onCambiarModelo: (modelo: string) => void;
    onCambiarModo: (modo: ModoAgente) => void;
    deshabilitado?: boolean;
}

/* [318A-4] Controles compactos del input: selector de modelo y selector de modo.
 * Usan el MenuContextual global (no selects nativos) para coherencia visual con
 * el resto del proyecto. Cada botón abre el menú posicionado bajo él y marca la
 * opción activa con un check (patrón EncabezadoAcciones). */
export function ControlesInputIA({modelo, modo, onCambiarModelo, onCambiarModo, deshabilitado = false}: ControlesInputIAProps): JSX.Element {
    const [menuActivo, setMenuActivo] = useState<'modelo' | 'modo' | null>(null);
    const [posicion, setPosicion] = useState({x: 0, y: 0});

    const modeloActual = MODELOS_AGENTE.find(m => m.id === modelo) ?? MODELOS_AGENTE[0];
    const modoActual = MODOS_AGENTE.find(m => m.id === modo) ?? MODOS_AGENTE[0];

    const abrirMenu = (tipo: 'modelo' | 'modo', evento: React.MouseEvent) => {
        if (deshabilitado) return;
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setPosicion({x: rect.left, y: rect.bottom + 4});
        setMenuActivo(menuActivo === tipo ? null : tipo);
    };

    const opcionesModelo: OpcionMenu[] = MODELOS_AGENTE.map(m => ({
        id: m.id,
        etiqueta: m.nombre,
        marcada: m.id === modelo,
        separadorDespues: m.id === 'auto',
    }));

    const opcionesModo: OpcionMenu[] = MODOS_AGENTE.map(m => ({
        id: m.id,
        etiqueta: m.nombre,
        marcada: m.id === modo,
    }));

    const seleccionar = (tipo: 'modelo' | 'modo', opcionId: string) => {
        if (tipo === 'modelo') onCambiarModelo(opcionId);
        else onCambiarModo(opcionId as ModoAgente);
        setMenuActivo(null);
    };

    return (
        <div className="panelIAInputControles">
            <Boton
                type="button"
                variante="ghost"
                tamano="pequeño"
                compacto
                claseAdicional="panelIAInputControl"
                disabled={deshabilitado}
                onClick={e => abrirMenu('modelo', e)}
                title={modeloActual.descripcion}
                aria-haspopup="menu"
                aria-expanded={menuActivo === 'modelo'}
            >
                {modeloActual.nombre}
                <ChevronDown size={12} />
            </Boton>
            {menuActivo === 'modelo' && createPortal(
                <MenuContextual
                    opciones={opcionesModelo}
                    posicionX={posicion.x}
                    posicionY={posicion.y}
                    onSeleccionar={id => seleccionar('modelo', id)}
                    onCerrar={() => setMenuActivo(null)}
                />,
                document.body
            )}

            <Boton
                type="button"
                variante="ghost"
                tamano="pequeño"
                compacto
                claseAdicional="panelIAInputControl"
                disabled={deshabilitado}
                onClick={e => abrirMenu('modo', e)}
                title={modoActual.descripcion}
                aria-haspopup="menu"
                aria-expanded={menuActivo === 'modo'}
            >
                {modoActual.nombre}
                <ChevronDown size={12} />
            </Boton>
            {menuActivo === 'modo' && createPortal(
                <MenuContextual
                    opciones={opcionesModo}
                    posicionX={posicion.x}
                    posicionY={posicion.y}
                    onSeleccionar={id => seleccionar('modo', id)}
                    onCerrar={() => setMenuActivo(null)}
                />,
                document.body
            )}
        </div>
    );
}
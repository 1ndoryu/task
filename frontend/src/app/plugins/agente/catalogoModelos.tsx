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

/* [318A-4] Catálogo de modelos para el selector del input.
 * [318A-11 02-09-2026] Rediseño coherente con los modelos REALES que el
 * usuario tiene en gloryapi (verificado contra GET /v1/models el 02-09):
 * organizados POR PROVEEDOR (grupo) y sin modelos que no existen (se
 * eliminaron groq/* y cerebras/*, de los que no hay keys). Cada entrada:
 * - `id`: id único de la opción del menú (no se persiste).
 * - `modelo`: id real que se envía al proveedor (se persiste como config.modelo).
 * - `proveedor`: glory (gloryapi local) | commandcode (Provider directa) |
 *   deepseek (API DeepSeek directa).
 * - `grupo`: etiqueta de proveedor para agrupar en el menú.
 * - `razonamiento`: si el modelo acepta `reasoning_effort` (el backend lo
 *   envía a deepseek/groq/cerebras/glory; commandcode Provider directo no).
 * `commandcode` y `glm-5.3-flash` se conservan como alias legacy del grupo
 * glory (la ruta auto → DeepSeek Flash) para no romper configs guardadas. */
export interface ModeloAgente {
    id: string;
    modelo: string;
    nombre: string;
    proveedor: string;
    grupo: string;
    descripcion: string;
    razonamiento: boolean;
}

export const MODELOS_AGENTE: ReadonlyArray<ModeloAgente> = Object.freeze([
    /* Grupo Glory API (gloryapi local 3101). Modelos reales de /v1/models. */
    {id: 'glory:auto', modelo: 'auto', nombre: 'Auto (recomendado)', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Router de gloryapi → DeepSeek Flash (vía que siempre funciona).', razonamiento: true},
    {id: 'glory:commandcode', modelo: 'commandcode', nombre: 'Commandcode (alias auto)', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Alias legacy → DeepSeek Flash vía gloryapi.', razonamiento: true},
    {id: 'glory:deepseek-v4-flash', modelo: 'deepseek-v4-flash', nombre: 'DeepSeek V4 Flash', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Glory API · upstream andoryyu · razonamiento.', razonamiento: true},
    {id: 'glory:deepseek-v4-flash-free', modelo: 'deepseek-v4-flash-free', nombre: 'DeepSeek V4 Flash Free', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Glory API · upstream opencode-zen.', razonamiento: true},
    {id: 'glory:deepseek-v4-flash:free', modelo: 'deepseek-v4-flash:free', nombre: 'DeepSeek V4 Flash :free', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Glory API · upstream tokenharbor.', razonamiento: true},
    {id: 'glory:deepseek-ai-0731', modelo: 'deepseek-ai/deepseek-v4-flash-0731', nombre: 'DeepSeek V4 Flash 0731', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Glory API · upstream nvidia.', razonamiento: true},
    {id: 'glory:deepseek/deepseek-v4-flash', modelo: 'deepseek/deepseek-v4-flash', nombre: 'DeepSeek V4 Flash (CC)', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Glory API · upstream commandcode.', razonamiento: true},
    {id: 'glory:muse-spark', modelo: 'meta/muse-spark-1.2-contributor', nombre: 'Muse Spark 1.2 Contributor', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Glory API · upstream commandcode.', razonamiento: false},
    {id: 'glory:ox-alpha', modelo: 'stealth/ox-alpha', nombre: 'OX Alpha', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Glory API · upstream commandcode.', razonamiento: false},
    {id: 'glory:glm-5.3-flash', modelo: 'glm-5.3-flash', nombre: 'GLM 5.3 Flash (alias)', proveedor: 'glory', grupo: 'Glory API', descripcion: 'Alias legacy → DeepSeek Flash vía gloryapi.', razonamiento: true},
    /* [02-09-2026] Laguna S 2.1 Free: modelo GRATIS (100% OFF) de Command Code
     * Provider API directa (sin gloryapi). El ID real del endpoint Provider es
     * `poolside/laguna-s-2.1-free` (prefijo poolside/, verificado en /models).
     * Requiere COMMAND_CODE_API_KEY en el backend (y $1 de crédito en la
     * cuenta). Primera opción del fallback. */
    {id: 'commandcode:laguna', modelo: 'poolside/laguna-s-2.1-free', nombre: 'Laguna S 2.1 Free', proveedor: 'commandcode', grupo: 'Command Code Provider', descripcion: 'Provider directo · GRATIS (mientras haya capacidad).', razonamiento: false},
    /* DeepSeek API directa (api.deepseek.com) — key DEEPSEEK-API en el backend. */
    {id: 'deepseek:deepseek-v4-flash', modelo: 'deepseek-v4-flash', nombre: 'DeepSeek V4 Flash', proveedor: 'deepseek', grupo: 'DeepSeek (directo)', descripcion: 'API DeepSeek directa · razonamiento.', razonamiento: true},
]);

/* Grupos de proveedor en el orden del catálogo (para el menú de modelo). */
export const GRUPOS_MODELOS: ReadonlyArray<{id: string; etiqueta: string}> = Object.freeze([
    {id: 'glory', etiqueta: 'Glory API'},
    {id: 'commandcode', etiqueta: 'Command Code Provider'},
    {id: 'deepseek', etiqueta: 'DeepSeek (directo)'},
]);

/* Encuentra la entrada del catálogo que corresponde a un modelo persistido
 * (config.modelo) desambiguando por proveedor cuando hay IDs repetidos
 * (p. ej. deepseek-v4-flash existe en glory y en deepseek directo). */
export function entradaModelo(modelo: string, proveedor?: string): ModeloAgente | undefined {
    if (proveedor) {
        const porProveedor = MODELOS_AGENTE.find(m => m.modelo === modelo && m.proveedor === proveedor);
        if (porProveedor) return porProveedor;
    }
    return MODELOS_AGENTE.find(m => m.modelo === modelo);
}

export type NivelRazonamiento = 'low' | 'medium' | 'high';

interface ControlesInputIAProps {
    modelo: string;
    proveedor: string;
    modo: ModoAgente;
    nivelRazonamiento: NivelRazonamiento;
    onCambiarModelo: (modelo: string, proveedor: string) => void;
    onCambiarModo: (modo: ModoAgente) => void;
    onCambiarNivelRazonamiento: (nivel: NivelRazonamiento) => void;
    deshabilitado?: boolean;
}

const ETIQUETAS_RAZONAMIENTO: Record<NivelRazonamiento, string> = {
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
};

/* [318A-4] Controles compactos del input: selector de modelo (agrupado por
 * proveedor), selector de modo y selector de nivel de razonamiento.
 * Usan el MenuContextual global (no selects nativos) para coherencia visual con
 * el resto del proyecto. Cada botón abre el menú posicionado bajo él y marca la
 * opción activa con un check (patrón EncabezadoAcciones).
 * [318A-11 02-09-2026] El selector de modelo agrupa por proveedor mediante
 * submenús (patrón nativo de MenuContextual). El selector de razonamiento va
 * junto al de modelo: solo se muestra si el modelo actual lo soporta. */
export function ControlesInputIA({modelo, proveedor, modo, nivelRazonamiento, onCambiarModelo, onCambiarModo, onCambiarNivelRazonamiento, deshabilitado = false}: ControlesInputIAProps): JSX.Element {
    const [menuActivo, setMenuActivo] = useState<'modelo' | 'modo' | 'razonamiento' | null>(null);
    const [posicion, setPosicion] = useState({x: 0, y: 0});

    const modeloActual = entradaModelo(modelo, proveedor) ?? MODELOS_AGENTE[0]!;
    const modoActual = MODOS_AGENTE.find(m => m.id === modo) ?? MODOS_AGENTE[0];
    const soportaRazonamiento = modeloActual.razonamiento;

    const abrirMenu = (tipo: 'modelo' | 'modo' | 'razonamiento', evento: React.MouseEvent) => {
        if (deshabilitado) return;
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setPosicion({x: rect.left, y: rect.bottom + 4});
        setMenuActivo(menuActivo === tipo ? null : tipo);
    };

    /* Modelos agrupados por proveedor mediante submenús: cada grupo del
     * catálogo se convierte en una opción padre con subOpciones. El id que
     * recibe onSeleccionar es el del LEAF (grupo:modelo). */
    const opcionesModelo: OpcionMenu[] = GRUPOS_MODELOS.map(grupo => {
        const modelos = MODELOS_AGENTE.filter(m => m.proveedor === grupo.id);
        return {
            id: `grupo:${grupo.id}`,
            etiqueta: grupo.etiqueta,
            subOpciones: modelos.map(m => ({
                id: m.id,
                etiqueta: m.nombre,
                marcada: m.modelo === modelo && m.proveedor === proveedor,
                separadorDespues: m.modelo === 'auto' || m.id === 'glory:glm-5.3-flash' || m.id === 'commandcode:laguna',
            })),
        };
    });

    const opcionesModo: OpcionMenu[] = MODOS_AGENTE.map(m => ({
        id: m.id,
        etiqueta: m.nombre,
        marcada: m.id === modo,
    }));

    const opcionesRazonamiento: OpcionMenu[] = (['low', 'medium', 'high'] as NivelRazonamiento[]).map(n => ({
        id: n,
        etiqueta: `${ETIQUETAS_RAZONAMIENTO[n]} — ${n === 'low' ? 'rápido' : n === 'medium' ? 'equilibrio' : 'análisis profundo'}`,
        marcada: n === nivelRazonamiento,
    }));

    const seleccionar = (tipo: 'modelo' | 'modo' | 'razonamiento', opcionId: string) => {
        if (tipo === 'modelo') {
            const entrada = MODELOS_AGENTE.find(m => m.id === opcionId);
            if (entrada) onCambiarModelo(entrada.modelo, entrada.proveedor);
        } else if (tipo === 'modo') {
            onCambiarModo(opcionId as ModoAgente);
        } else {
            onCambiarNivelRazonamiento(opcionId as NivelRazonamiento);
        }
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

            {soportaRazonamiento ? (
                <Boton
                    type="button"
                    variante="ghost"
                    tamano="pequeño"
                    compacto
                    claseAdicional="panelIAInputControl"
                    disabled={deshabilitado}
                    onClick={e => abrirMenu('razonamiento', e)}
                    title="Nivel de razonamiento del modelo (reasoning_effort)"
                    aria-haspopup="menu"
                    aria-expanded={menuActivo === 'razonamiento'}
                >
                    {ETIQUETAS_RAZONAMIENTO[nivelRazonamiento]}
                    <ChevronDown size={12} />
                </Boton>
            ) : (
                /* [318A-11] El modelo actual no acepta reasoning_effort (p.ej.
                 * Command Code Provider directo): el botón se muestra igual
                 * para que el selector esté SIEMPRE en el input, pero
                 * deshabilitado con título explicativo. El backend ignora el
                 * campo en esos proveedores. */
                <Boton
                    type="button"
                    variante="ghost"
                    tamano="pequeño"
                    compacto
                    claseAdicional="panelIAInputControl"
                    disabled
                    title={`Este modelo no soporta nivel de razonamiento (${modeloActual.nombre}).`}
                    aria-disabled="true"
                >
                    {ETIQUETAS_RAZONAMIENTO[nivelRazonamiento]}
                    <ChevronDown size={12} />
                </Boton>
            )}
            {menuActivo === 'razonamiento' && soportaRazonamiento && createPortal(
                <MenuContextual
                    opciones={opcionesRazonamiento}
                    posicionX={posicion.x}
                    posicionY={posicion.y}
                    onSeleccionar={id => seleccionar('razonamiento', id)}
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
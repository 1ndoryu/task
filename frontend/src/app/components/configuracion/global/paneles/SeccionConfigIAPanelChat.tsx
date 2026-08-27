/* [105A-2] Config del chat IA: proveedor, modelo, keys de usuario, prompt system.
 * [243A-1] Sección del panel de chat dentro del modal global de configuración.
 * Admin usa backend con env rotation para no exponer claves del entorno.
 * [27-08-2026] Configuración detallada (plan IA): comportamiento del modelo
 * (temperatura, max tokens, idioma, estilo), contexto incluido (tareas
 * completadas, hábitos pausados, notas) y permisos de herramientas
 * (recordatorios, búsqueda web). Todo persistido en iaStore (no sensible). */

import {Checkbox, Input, Select, Textarea} from '../../../ui';
import {useIAStore} from '../../../../stores/iaStore';
import {MODELOS_IA, MODELO_FLASH_POR_PROVEEDOR, PROVEEDORES_IA} from '../../../../services/iaService';
import {esUsuarioAdmin} from '../../../../utils/dashboardRuntime';
import type {ProveedorIA} from '../../../../stores/iaStore';

const OPCIONES_IDIOMA = [
    {valor: 'es', etiqueta: 'Español'},
    {valor: 'en', etiqueta: 'English'}
];

const OPCIONES_ESTILO = [
    {valor: 'conciso', etiqueta: 'Conciso — respuestas cortas y directas'},
    {valor: 'detallado', etiqueta: 'Detallado — explica el razonamiento'},
    {valor: 'amable', etiqueta: 'Amable — tono cercano y motivador'}
];

export function SeccionConfigIAPanelChat(): JSX.Element {
    const proveedor = useIAStore(s => s.proveedor);
    const apiKey = useIAStore(s => s.apiKey);
    const apiKeyDeepseek = useIAStore(s => s.apiKeyDeepseek);
    const apiKeyCerebras = useIAStore(s => s.apiKeyCerebras);
    const modelo = useIAStore(s => s.modelo);
    const preferencias = useIAStore(s => s.preferenciasUsuario);
    const promptSistema = useIAStore(s => s.promptSistema);
    const temperatura = useIAStore(s => s.temperatura);
    const maxTokens = useIAStore(s => s.maxTokens);
    const idioma = useIAStore(s => s.idioma);
    const estilo = useIAStore(s => s.estilo);
    const incluirTareasCompletadas = useIAStore(s => s.incluirTareasCompletadas);
    const incluirHabitosPausados = useIAStore(s => s.incluirHabitosPausados);
    const incluirNotasEnContexto = useIAStore(s => s.incluirNotasEnContexto);
    const permitirRecordatorios = useIAStore(s => s.permitirRecordatorios);
    const permitirBusquedaWeb = useIAStore(s => s.permitirBusquedaWeb);
    const setProveedor = useIAStore(s => s.setProveedor);
    const setApiKey = useIAStore(s => s.setApiKey);
    const setApiKeyDeepseek = useIAStore(s => s.setApiKeyDeepseek);
    const setApiKeyCerebras = useIAStore(s => s.setApiKeyCerebras);
    const setModelo = useIAStore(s => s.setModelo);
    const setPreferencias = useIAStore(s => s.setPreferencias);
    const setPromptSistema = useIAStore(s => s.setPromptSistema);
    const setTemperatura = useIAStore(s => s.setTemperatura);
    const setMaxTokens = useIAStore(s => s.setMaxTokens);
    const setIdioma = useIAStore(s => s.setIdioma);
    const setEstilo = useIAStore(s => s.setEstilo);
    const setIncluirTareasCompletadas = useIAStore(s => s.setIncluirTareasCompletadas);
    const setIncluirHabitosPausados = useIAStore(s => s.setIncluirHabitosPausados);
    const setIncluirNotasEnContexto = useIAStore(s => s.setIncluirNotasEnContexto);
    const setPermitirRecordatorios = useIAStore(s => s.setPermitirRecordatorios);
    const setPermitirBusquedaWeb = useIAStore(s => s.setPermitirBusquedaWeb);
    const esAdmin = esUsuarioAdmin();
    const modelosProveedor = MODELOS_IA.filter(m => m.proveedor === proveedor);

    const manejarProveedor = (valor: string) => {
        const proveedorNuevo = valor as ProveedorIA;
        setProveedor(proveedorNuevo);
        if (!MODELOS_IA.some(m => m.proveedor === proveedorNuevo && m.id === modelo)) {
            setModelo(MODELO_FLASH_POR_PROVEEDOR[proveedorNuevo]);
        }
    };

    return (
        <div className="contenedorOpcionesConfig">
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Proveedor de IA</span>
                    <span className="descripcionOpcionConfig">El admin usa las claves del entorno; los usuarios normales configuran sus propias claves aquí.</span>
                </div>
            </div>
            <Select
                value={proveedor}
                onChange={e => manejarProveedor(e.target.value)}
                opciones={PROVEEDORES_IA.map(p => ({valor: p.id, etiqueta: p.nombre}))}
            />
            <div className="separadorOpcionesConfig" />
            {!esAdmin && proveedor === 'groq' && (
                <Input
                    tipo="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                />
            )}
            {!esAdmin && proveedor === 'deepseek' && (
                <Input
                    tipo="password"
                    value={apiKeyDeepseek}
                    onChange={e => setApiKeyDeepseek(e.target.value)}
                    placeholder="sk-..."
                />
            )}
            {!esAdmin && proveedor === 'cerebras' && (
                <Input
                    tipo="password"
                    value={apiKeyCerebras}
                    onChange={e => setApiKeyCerebras(e.target.value)}
                    placeholder="csk-..."
                />
            )}
            {esAdmin && (
                <div className="itemOpcionConfig">
                    <div className="detallesOpcionConfig">
                        <span className="tituloOpcionConfig">API del entorno activa</span>
                        <span className="descripcionOpcionConfig">Se usarán CEREBRAS_API_KEY, GROQ_API/GROQ_API_1..3, DEEPSEEK_API/DEEPSEEK-API o Glory API (sin key) desde el servidor.</span>
                    </div>
                </div>
            )}
            <div className="separadorOpcionesConfig" />
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Modelo de IA</span>
                    <span className="descripcionOpcionConfig">Modelo de lenguaje a usar en el chat</span>
                </div>
            </div>
            <Select
                value={modelo}
                onChange={e => setModelo(e.target.value)}
                opciones={modelosProveedor.map(m => ({valor: m.id, etiqueta: m.nombre}))}
            />
            <div className="separadorOpcionesConfig" />

            {/* [27-08-2026] Comportamiento del modelo (plan IA, Fase 4) */}
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Comportamiento</span>
                    <span className="descripcionOpcionConfig">Temperatura, longitud máxima, idioma y estilo de las respuestas.</span>
                </div>
            </div>
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Temperatura: {temperatura.toFixed(1)}</span>
                    <span className="descripcionOpcionConfig">Menor = más preciso y determinista; mayor = más creativo.</span>
                </div>
            </div>
            <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                className="input input--range"
                value={temperatura}
                onChange={e => setTemperatura(Number(e.target.value))}
            />
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Máximo de tokens: {maxTokens}</span>
                    <span className="descripcionOpcionConfig">Límite de tokens de la respuesta (64–4096).</span>
                </div>
            </div>
            <Input
                tipo="number"
                min={64}
                max={4096}
                step={64}
                value={maxTokens}
                onChange={e => setMaxTokens(Math.max(64, Math.min(4096, Number(e.target.value) || 2048)))}
            />
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Idioma</span>
                    <span className="descripcionOpcionConfig">Idioma de las respuestas.</span>
                </div>
            </div>
            <Select
                value={idioma}
                onChange={e => setIdioma(e.target.value)}
                opciones={OPCIONES_IDIOMA}
            />
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Estilo de respuesta</span>
                    <span className="descripcionOpcionConfig">Cómo redacta el asistente.</span>
                </div>
            </div>
            <Select
                value={estilo}
                onChange={e => setEstilo(e.target.value)}
                opciones={OPCIONES_ESTILO}
            />
            <div className="separadorOpcionesConfig" />

            {/* Contexto incluido en el prompt */}
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Contexto</span>
                    <span className="descripcionOpcionConfig">Qué información del dashboard se inyecta al asistente.</span>
                </div>
            </div>
            <Checkbox
                etiqueta="Incluir tareas completadas"
                descripcion="Añade las tareas completadas hoy al contexto."
                checked={incluirTareasCompletadas}
                onChange={e => setIncluirTareasCompletadas(e.target.checked)}
            />
            <Checkbox
                etiqueta="Incluir hábitos pausados"
                descripcion="Muestra también los hábitos en pausa al asistente."
                checked={incluirHabitosPausados}
                onChange={e => setIncluirHabitosPausados(e.target.checked)}
            />
            <Checkbox
                etiqueta="Incluir notas en contexto"
                descripcion="NOTA: nunca por defecto; solo se inyectan cuando lo pides explícitamente."
                checked={incluirNotasEnContexto}
                onChange={e => setIncluirNotasEnContexto(e.target.checked)}
            />
            <div className="separadorOpcionesConfig" />

            {/* Permisos de herramientas */}
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Permisos</span>
                    <span className="descripcionOpcionConfig">Herramientas que el asistente puede proponer. Las acciones destructivas siempre requieren confirmación.</span>
                </div>
            </div>
            <Checkbox
                etiqueta="Crear recordatorios"
                descripcion="El asistente puede proponer recordatorios con fecha; se crean solo al confirmar."
                checked={permitirRecordatorios}
                onChange={e => setPermitirRecordatorios(e.target.checked)}
            />
            <Checkbox
                etiqueta="Buscar en internet"
                descripcion="El asistente puede buscar información actualizada en la web."
                checked={permitirBusquedaWeb}
                onChange={e => setPermitirBusquedaWeb(e.target.checked)}
            />
            <div className="separadorOpcionesConfig" />

            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Prompt system</span>
                    <span className="descripcionOpcionConfig">Instrucciones persistentes que se añaden al sistema del asistente sin reemplazar sus permisos seguros.</span>
                </div>
            </div>
            <Textarea
                value={promptSistema}
                onChange={e => setPromptSistema(e.target.value)}
                placeholder="Ej: Sé directo, prioriza tareas bloqueantes, pregunta antes de acciones externas..."
                filas={3}
            />
            <div className="separadorOpcionesConfig" />
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Preferencias personales</span>
                    <span className="descripcionOpcionConfig">Contexto extra que la IA tendrá en cuenta (horarios, estilo de trabajo, etc.)</span>
                </div>
            </div>
            <Textarea
                value={preferencias}
                onChange={e => setPreferencias(e.target.value)}
                placeholder="Ej: Prefiero tareas cortas. Trabajo mejor de 9 a 14. Evitar notificaciones tarde..."
                filas={3}
            />
        </div>
    );
}

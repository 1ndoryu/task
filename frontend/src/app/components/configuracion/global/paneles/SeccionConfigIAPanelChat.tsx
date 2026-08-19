/* [105A-2] Config del chat IA: proveedor, modelo, keys de usuario y prompt system.
 * [243A-1] Sección del panel de chat dentro del modal global de configuración.
 * Admin usa backend con env rotation para no exponer claves del entorno. */

import {useEffect} from 'react';
import {Input, Select, Textarea} from '../../../ui';
import {useIAStore} from '../../../../stores/iaStore';
import {MODELOS_IA, MODELO_FLASH_POR_PROVEEDOR, PROVEEDORES_IA} from '../../../../services/iaService';
import {esUsuarioAdmin, obtenerNonceWP} from '../../../../utils/dashboardRuntime';
import type {ProveedorIA} from '../../../../stores/iaStore';

export function SeccionConfigIAPanelChat(): JSX.Element {
    const proveedor = useIAStore(s => s.proveedor);
    const apiKey = useIAStore(s => s.apiKey);
    const apiKeyDeepseek = useIAStore(s => s.apiKeyDeepseek);
    const apiKeyCerebras = useIAStore(s => s.apiKeyCerebras);
    const modelo = useIAStore(s => s.modelo);
    const preferencias = useIAStore(s => s.preferenciasUsuario);
    const promptSistema = useIAStore(s => s.promptSistema);
    const setProveedor = useIAStore(s => s.setProveedor);
    const setApiKey = useIAStore(s => s.setApiKey);
    const setApiKeyDeepseek = useIAStore(s => s.setApiKeyDeepseek);
    const setApiKeyCerebras = useIAStore(s => s.setApiKeyCerebras);
    const setModelo = useIAStore(s => s.setModelo);
    const setPreferencias = useIAStore(s => s.setPreferencias);
    const setPromptSistema = useIAStore(s => s.setPromptSistema);
    const esAdmin = esUsuarioAdmin();
    const modelosProveedor = MODELOS_IA.filter(m => m.proveedor === proveedor);

    /* [115A-1] Sincronizar proveedor+modelo al servidor para que el backend
     * los use en el chatbot. [18-08-2026] Sin backend de IA/chatbot en Rust
     * aun: localStorage es la unica fuente de verdad (sin llamada a /wp-json). */
    useEffect(() => {
        void esAdmin;
        void obtenerNonceWP;
    }, [esAdmin]);

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
                        <span className="descripcionOpcionConfig">Se usarán CEREBRAS_API_KEY, GROQ_API/GROQ_API_1..3 o DEEPSEEK_API/DEEPSEEK-API desde WordPress/Coolify.</span>
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

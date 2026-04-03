/* [263A-5] Hook para la sección de configuración de Grupos FB
 * Gestiona el estado de token, acciones de generación/copia y config de publicado.
 * [034A-17] Añadido publicadoHoras: duración configurable para "marcado como publicado". */

import {useState, useCallback, useEffect} from 'react';
import {gruposFbService} from '../../services/gruposFbService';

export function useSeccionConfigGruposFb() {
    const [token, setToken] = useState<string | null>(null);
    const [tieneToken, setTieneToken] = useState<boolean | null>(null);
    const [cargando, setCargando] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* [034A-17] Duración de "publicado recientemente" en horas */
    const [publicadoHoras, setPublicadoHoras] = useState<string>('24');
    const [guardandoConfig, setGuardandoConfig] = useState(false);

    useEffect(() => {
        gruposFbService.obtenerConfig(['publicado_horas']).then(cfg => {
            if (cfg.publicado_horas) setPublicadoHoras(cfg.publicado_horas);
        }).catch(() => { /* usa default 24 */ });
    }, []);

    const guardarPublicadoHoras = useCallback(async (valor: string) => {
        const num = parseInt(valor, 10);
        if (isNaN(num) || num < 1) return;
        setPublicadoHoras(valor);
        setGuardandoConfig(true);
        try {
            await gruposFbService.guardarConfig({publicado_horas: String(num)});
        } catch {
            /* silencioso — el valor se muestra igual */
        } finally {
            setGuardandoConfig(false);
        }
    }, []);

    const verificarToken = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const resp = await gruposFbService.obtenerToken();
            setTieneToken(resp.tieneToken ?? false);
            if (resp.token) setToken(resp.token);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al verificar token');
        } finally {
            setCargando(false);
        }
    }, []);

    const generarToken = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const resp = await gruposFbService.regenerarToken();
            setToken(resp.token);
            setTieneToken(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al generar token');
        } finally {
            setCargando(false);
        }
    }, []);

    const copiarToken = useCallback(async () => {
        if (!token) return;
        try {
            await navigator.clipboard.writeText(token);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            /* Fallback silencioso */
        }
    }, [token]);

    /* [024A-16] La extensión concatena /grupos-fb/sync a la URL base.
     * Si mostramos la URL completa con /grupos-fb, el usuario la copia y
     * la extensión genera /grupos-fb/grupos-fb/sync → 404. Mostrar solo la base. */
    const apiUrl = `${window.location.origin}/wp-json/glory/v1`;

    return {token, tieneToken, cargando, copiado, error, apiUrl, publicadoHoras, guardandoConfig, verificarToken, generarToken, copiarToken, guardarPublicadoHoras};
}

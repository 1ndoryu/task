/* [233A-27] Copias de seguridad: lista, restaurar y eliminar. */
import {RotateCcw as RotateCcwBackup, ShieldCheck as ShieldCheckBackup, AlertTriangle, Database, Trash2} from 'lucide-react';
import {Boton} from '../../../ui';
import {MensajeBloquePremium} from '../../../shared/MensajeBloquePremium';
import {useModalHistorialBackups} from '../../../../hooks/dashboard/useModalHistorialBackups';

export function SeccionConfigBackups({onAbrirUpgrade}: {onAbrirUpgrade?: () => void}): JSX.Element {
    const {backups, cargando, error, esPremium, handleRestaurar, handleEliminar, formatBytes, formatDate, formatTrigger} = useModalHistorialBackups({estaAbierto: true});
    if (!esPremium) return <MensajeBloquePremium titulo="Copias de Seguridad Premium" descripcion="Las copias automáticas están disponibles para usuarios Premium." onAbrirUpgrade={onAbrirUpgrade} />;
    return (
        <div className="contenedorBackups">
            <div className="panelInfoBackup"><ShieldCheckBackup size={18} className="iconoInfo" /><p className="textoInfo">Copias automáticas con cada cambio importante.</p></div>
            {error && <div className="mensajeError"><AlertTriangle size={14} /><span>{error}</span></div>}
            {cargando && <div className="spinnerCarga">Cargando copias...</div>}
            {!cargando && backups.length === 0 && <div className="estadoVacio"><Database size={32} /><p>No tienes copias de seguridad aún.</p></div>}
            {!cargando && backups.length > 0 && (
                <div className="listaBackups">
                    {backups.map(backup => (
                        <div key={backup.id} className="itemBackup">
                            <div className="infoBackup">
                                <span className="fechaBackup">{formatDate(backup.timestamp)}</span>
                                <div className="metaBackup">
                                    {formatTrigger(backup.trigger) && <span className="badgeTrigger">{formatTrigger(backup.trigger)}</span>}
                                    <span className="tamanoBackup">{formatBytes(backup.sizeBytes)}</span>
                                    <span className="dispositivoBackup">{backup.device}</span>
                                </div>
                            </div>
                            <div className="accionesBackup">
                                <Boton claseAdicional="botonRestaurar" onClick={() => handleRestaurar(backup.id)} title="Restaurar"><RotateCcwBackup size={14} /><span>Restaurar</span></Boton>
                                <Boton claseAdicional="botonEliminar" onClick={() => handleEliminar(backup.id)} title="Eliminar"><Trash2 size={14} /><span>Eliminar</span></Boton>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

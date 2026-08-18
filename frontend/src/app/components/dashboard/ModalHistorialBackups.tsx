import {Modal} from '../shared/Modal';
import {MensajeBloquePremium} from '../shared/MensajeBloquePremium';
import {useModalHistorialBackups} from '../../hooks/dashboard/useModalHistorialBackups';
import {RotateCcw, ShieldCheck, AlertTriangle, Database, Trash2} from 'lucide-react';
import {Boton} from '../ui/Boton';

interface ModalHistorialBackupsProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onAbrirUpgrade?: () => void;
}

export function ModalHistorialBackups({estaAbierto, onCerrar, onAbrirUpgrade}: ModalHistorialBackupsProps) {
    const {backups, cargando, error, esPremium, handleRestaurar, handleEliminar, formatBytes, formatDate, formatTrigger} = useModalHistorialBackups({estaAbierto});

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Copias de Seguridad">
            <div className="contenedorBackups">
                {!esPremium ? (
                    <MensajeBloquePremium
                        titulo="Copias de Seguridad Premium"
                        descripcion="Las copias automáticas con cada cambio importante están disponibles exclusivamente para usuarios Premium. Restaura versiones anteriores al instante."
                        onAbrirUpgrade={onAbrirUpgrade}
                    />
                ) : (
                    <>
                        <div className="panelInfoBackup">
                            <ShieldCheck size={18} className="iconoInfo" />
                            <p className="textoInfo">Copias automáticas con cada cambio importante. Restaura versiones anteriores al instante.</p>
                        </div>

                        {error && (
                            <div className="mensajeError">
                                <AlertTriangle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        {cargando && <div className="spinnerCarga">Cargando copias...</div>}

                        {!cargando && backups.length === 0 && (
                            <div className="estadoVacio">
                                <Database size={32} />
                                <p>No tienes copias de seguridad aún.</p>
                            </div>
                        )}

                        {!cargando && backups.length > 0 && (
                            <div className="listaBackups">
                                {backups.map(backup => (
                                    <div key={backup.id} className="itemBackup">
                                        <div className="infoBackup">
                                            <span className="fechaBackup">{formatDate(backup.timestamp)}</span>
                                            <div className="metaBackup">
                                                {formatTrigger(backup.trigger) && (
                                                    <span className="badgeTrigger">{formatTrigger(backup.trigger)}</span>
                                                )}
                                                <span className="tamanoBackup">{formatBytes(backup.sizeBytes)}</span>
                                                <span className="dispositivoBackup">{backup.device}</span>
                                            </div>
                                        </div>
                                        <div className="accionesBackup">
                                            <Boton claseAdicional="botonRestaurar" onClick={() => handleRestaurar(backup.id)} title="Restaurar esta versión">
                                                <RotateCcw size={14} />
                                                <span>Restaurar</span>
                                            </Boton>
                                            <Boton claseAdicional="botonEliminar" onClick={() => handleEliminar(backup.id)} title="Eliminar esta copia">
                                                <Trash2 size={14} />
                                                <span>Eliminar</span>
                                            </Boton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}

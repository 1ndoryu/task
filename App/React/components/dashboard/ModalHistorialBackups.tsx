import {useEffect} from 'react';
import {Modal} from '../shared/Modal';
import {useBackups} from '../../hooks/dashboard/useBackups';
import {RotateCcw, ShieldCheck, AlertTriangle, Database, Trash2} from 'lucide-react';

interface ModalHistorialBackupsProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

export function ModalHistorialBackups({estaAbierto, onCerrar}: ModalHistorialBackupsProps) {
    const {backups, cargando, error, obtenerBackups, restaurarBackup, eliminarBackup} = useBackups();

    useEffect(() => {
        if (estaAbierto) {
            obtenerBackups();
        }
    }, [estaAbierto, obtenerBackups]);

    const handleRestaurar = async (id: string) => {
        if (window.confirm('¿ESTÁS SEGURO? Esto restaurará tus datos al estado de esta copia. Cualquier cambio no guardado se perderá.')) {
            await restaurarBackup(id);
        }
    };

    const handleEliminar = async (id: string) => {
        if (window.confirm('¿Eliminar esta copia? Esta acción no se puede deshacer.')) {
            await eliminarBackup(id);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number) => {
        if (!timestamp) return 'Fecha desconocida';
        return new Date(timestamp).toLocaleString('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'medium'
        });
    };

    const formatTrigger = (trigger: string) => {
        if (!trigger) return '';
        if (trigger === 'sync') return 'Sincronización';
        if (trigger === 'manual') return 'Manual';
        if (trigger === 'auto') return 'Automática';
        return trigger;
    };

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Copias de Seguridad">
            <div className="contenedorBackups">
                <div className="panelInfoBackup">
                    <ShieldCheck size={18} className="iconoInfo" />
                    <p className="textoInfo">Copias automáticas con cada cambio importante (Premium). Restaura versiones anteriores al instante.</p>
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
                                    <button className="botonRestaurar" onClick={() => handleRestaurar(backup.id)} title="Restaurar esta versión">
                                        <RotateCcw size={14} />
                                        <span>Restaurar</span>
                                    </button>
                                    <button className="botonEliminar" onClick={() => handleEliminar(backup.id)} title="Eliminar esta copia">
                                        <Trash2 size={14} />
                                        <span>Eliminar</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}

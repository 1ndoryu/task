/*
 * ModalPerfil.tsx
 * Modal para editar el perfil del usuario
 * Lógica extraída a useModalPerfil hook
 */

import type {Ref} from 'react';
import {Camera, Save} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {IndicadorAlmacenamiento} from '../shared/IndicadorAlmacenamiento';
import {Boton, Input, Textarea} from '../ui';
import {useModalPerfil} from '../../hooks/dashboard/useModalPerfil';

interface ModalPerfilProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

export function ModalPerfil({estaAbierto, onCerrar}: ModalPerfilProps): JSX.Element {
    const {datos, cargando, mensaje, fileInputRef, handleChange, handleAvatarClick, handleFileChange, handleSubmit} = useModalPerfil({estaAbierto, onCerrar});

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Mi Perfil">
            <div id="modal-perfil" className="contenedorPerfil">
                {/* Avatar y Datos Basicos */}
                <div className="avatarContainer">
                    <div className="avatarPreview">{datos.avatarUrl ? <img src={datos.avatarUrl} alt="Avatar" /> : <span className="avatarInicial">{datos.nombre.charAt(0).toUpperCase()}</span>}</div>
                    <Boton claseAdicional="botonPerfil botonCambiarFoto" onClick={handleAvatarClick}>
                        <Camera size={14} />
                        Cambiar Foto
                    </Boton>
                    <Input tipo="file" ref={fileInputRef as Ref<HTMLInputElement>} claseAdicional="inputArchivoPerfil" accept="image/*" onChange={handleFileChange} />
                </div>

                <div className="seccionPerfil">
                    <div className="tituloSeccionPerfil">Información Personal</div>

                    <div className="grupoInputPerfil">
                        <label className="labelPerfil">Nombre de Usuario</label>
                        <Input tipo="text" claseAdicional="inputPerfil" value={datos.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Tu nombre visible" />
                    </div>

                    <div className="grupoInputPerfil">
                        <label className="labelPerfil">Breve Descripción</label>
                        <Textarea claseAdicional="inputPerfil inputPerfil--descripcion" value={datos.descripcion} onChange={e => handleChange('descripcion', (e.target as HTMLTextAreaElement).value)} placeholder="Developer, Designer, etc." filas={2} />
                    </div>
                </div>

                <div className="seccionPerfil">
                    <div className="tituloSeccionPerfil">Seguridad</div>

                    <div className="grupoInputPerfil">
                        <label className="labelPerfil">Contraseña Actual</label>
                        <Input tipo="password" claseAdicional="inputPerfil" value={datos.passwordActual} onChange={e => handleChange('passwordActual', e.target.value)} placeholder="Necesaria para cambios sensibles" />
                    </div>

                    <div className="grupoInputPerfil">
                        <label className="labelPerfil">Nueva Contraseña</label>
                        <Input tipo="password" claseAdicional="inputPerfil" value={datos.passwordNueva} onChange={e => handleChange('passwordNueva', e.target.value)} placeholder="Dejar en blanco para mantener" />
                    </div>

                    <div className="grupoInputPerfil">
                        <label className="labelPerfil">Confirmar Nueva Contraseña</label>
                        <Input tipo="password" claseAdicional="inputPerfil" value={datos.passwordConfirmar} onChange={e => handleChange('passwordConfirmar', e.target.value)} placeholder="Repite la nueva contraseña" />
                    </div>
                </div>

                <div className="seccionPerfil">
                    <div className="tituloSeccionPerfil">Uso de Espacio</div>
                    <IndicadorAlmacenamiento mostrarDetalles={true} />
                </div>

                {mensaje && <div className={`mensajePerfil mensajePerfil--${mensaje.tipo}`}>{mensaje.texto}</div>}

                <div className="accionesPerfil">
                    <Boton claseAdicional="botonPerfil botonCancelar" onClick={onCerrar} disabled={cargando}>
                        Cancelar
                    </Boton>
                    <Boton claseAdicional="botonPerfil botonGuardar" onClick={handleSubmit} disabled={cargando}>
                        <div className="botonPerfilContenido">
                            {cargando ? <span className="cargandoSpinner cargandoSpinner--pequeno"></span> : <Save size={14} />}
                            Guardar Cambios
                        </div>
                    </Boton>
                </div>
            </div>
        </Modal>
    );
}

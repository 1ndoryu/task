/* [233A-27] Configuración de perfil: avatar, nombre, descripción, contraseña y espacio. */
import type {Ref} from 'react';
import {Camera, Save} from 'lucide-react';
import {Boton, Input, Textarea} from '../../../ui';
import {IndicadorAlmacenamiento} from '../../../shared/IndicadorAlmacenamiento';
import {useModalPerfil} from '../../../../hooks/dashboard/useModalPerfil';

export function SeccionConfigPerfil({onCerrar}: {onCerrar: () => void}): JSX.Element {
    const {datos, cargando, mensaje, fileInputRef, handleChange, handleAvatarClick, handleFileChange, handleSubmit} = useModalPerfil({estaAbierto: true, onCerrar});
    return (
        <div className="contenedorPerfil">
            <div className="avatarContainer">
                <div className="avatarPreview">{datos.avatarUrl ? <img src={datos.avatarUrl} alt="Avatar" /> : <span className="avatarInicial">{datos.nombre.charAt(0).toUpperCase()}</span>}</div>
                <Boton claseAdicional="botonPerfil botonCambiarFoto" onClick={handleAvatarClick}><Camera size={14} /> Cambiar Foto</Boton>
                <Input tipo="file" ref={fileInputRef as Ref<HTMLInputElement>} claseAdicional="inputArchivoPerfil" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="seccionPerfil">
                <div className="tituloSeccionPerfil">Información Personal</div>
                <div className="grupoInputPerfil">
                    <label className="labelPerfil">Nombre de Usuario</label>
                    <Input tipo="text" claseAdicional="inputPerfil" value={datos.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Tu nombre visible" />
                </div>
                <div className="grupoInputPerfil">
                    <label className="labelPerfil">Descripción</label>
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
                <Boton claseAdicional="botonPerfil botonGuardar" onClick={handleSubmit} disabled={cargando}>
                    <div className="botonPerfilContenido">{cargando ? <span className="cargandoSpinner cargandoSpinner--pequeno"></span> : <Save size={14} />} Guardar Cambios</div>
                </Boton>
            </div>
        </div>
    );
}

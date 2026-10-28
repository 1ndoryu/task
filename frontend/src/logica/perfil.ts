/* Perfil de quien usa la app: nombre, correo y una foto que se queda en este
 * equipo (el backend solo admite una URL como avatar, no una imagen). */
import { pedir } from './cliente';
import { esInvitado, fijarInvitado } from './invitado';
import { cerrarSesionServidor } from './sesion';

const CLAVE_FOTO = 'tareas-nuevo:v1:foto';
const LADO_FOTO = 128;

export interface Perfil {
  nombre: string;
  correo: string;
  invitado: boolean;
}

export async function leerPerfil(): Promise<Perfil> {
  if (esInvitado()) return { nombre: 'Invitado', correo: 'Datos solo en este equipo', invitado: true };
  const usuario = await pedir<{ email: string; display_name: string }>('/auth/me');
  return { nombre: usuario.display_name || usuario.email.split('@')[0], correo: usuario.email, invitado: false };
}

export async function guardarNombre(nombre: string): Promise<void> {
  await pedir('/profile', { method: 'PUT', body: JSON.stringify({ display_name: nombre, avatar_url: null }) });
}

export const leerFoto = (): string | null => localStorage.getItem(CLAVE_FOTO);

export function quitarFoto(): void {
  localStorage.removeItem(CLAVE_FOTO);
}

/** Recorta al centro y reduce a un cuadrado pequeño: cabe de sobra en el almacén local. */
export async function guardarFoto(archivo: File): Promise<string> {
  const imagen = await createImageBitmap(archivo);
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = LADO_FOTO;
  const lado = Math.min(imagen.width, imagen.height);
  lienzo
    .getContext('2d')
    ?.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO);
  const url = lienzo.toDataURL('image/jpeg', 0.85);
  localStorage.setItem(CLAVE_FOTO, url);
  return url;
}

/** Sale de la cuenta o del modo invitado y recarga para volver al acceso. */
export async function cerrarSesion(): Promise<void> {
  if (esInvitado()) fijarInvitado(false);
  else await cerrarSesionServidor();
  location.reload();
}

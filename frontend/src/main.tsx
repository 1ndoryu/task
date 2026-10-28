/* Arranque del front nuevo: monta la lista de tareas y hábitos.
 * La lógica está en `logica/` y no importa nada de React; la vista, en `vista/`. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { cargarInvitado, esInvitado } from './logica/invitado';
import { restaurar } from './logica/preferenciasRemotas';
import { asegurarSesionLocal } from './logica/sesion';
import { Acceso } from './vista/Acceso';
import { Lista } from './vista/Lista';
import './estilos/acceso.css';
import './estilos/button.css';
import './estilos/dropdownPanel.css';
import './estilos/modal.css';
import './estilos/modal-numero.css';
import './estilos/pestanas.css';
import './estilos/listas.css';
import './estilos/cajas.css';
import './estilos/columnas.css';
import './estilos/algoritmo.css';
import './estilos/arrastre.css';
import './estilos/archivados.css';
import './estilos/dependencias.css';
import './estilos/ventana.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el nodo #raiz en index.html');

/* El respaldo del servidor se busca antes de montar: las preferencias, el
 * orden y los grupos se leen al crear los `useState`, y una copia que llegue
 * después ya no cambiaría lo que la vista tiene en la mano. Primero se asegura
 * la sesión —sin cookie, `/dashboard` responde 401 y no habría de dónde
 * restaurar— y la espera tiene tope: si el backend tarda o no está, manda la
 * copia del equipo. Lo peor es un arranque frío sin respaldo, nunca una app en
 * blanco. */
const ESPERA_RESPALDO = 2500;

async function arrancar(destino: HTMLElement): Promise<void> {
  // Solo se muestra el acceso si el servidor dijo que no hay sesión: un backend
  // lento o caído no echa a nadie de la app.
  let sinSesion = false;
  await Promise.race([
    (async () => {
      try {
        if (esInvitado()) await cargarInvitado();
        else sinSesion = (await asegurarSesionLocal()) === null;
        await restaurar();
      } catch {
        /* Sin sesión o sin red: la carga de la lista ya contará lo que pase. */
      }
    })(),
    new Promise((listo) => setTimeout(listo, ESPERA_RESPALDO)),
  ]);
  createRoot(destino).render(
    <StrictMode>
      {sinSesion ? <Acceso /> : <Lista />}
    </StrictMode>,
  );
}

void arrancar(raiz);

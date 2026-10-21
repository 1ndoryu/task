/* Arranque del front nuevo: monta la lista de tareas y hábitos.
 * La lógica está en `logica/` y no importa nada de React; la vista, en `vista/`. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Lista } from './vista/Lista';
import './estilos/listas.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el nodo #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    <Lista />
  </StrictMode>,
);

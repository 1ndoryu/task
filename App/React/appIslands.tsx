/*
 * App Islands Registry
 *
 * Punto de entrada de TODAS las islas específicas de este proyecto.
 * Glory/main.tsx importa este archivo para mantener Glory agnóstico del proyecto.
 *
 * SISTEMA NUEVO (OCP - Open/Closed Principle):
 * Las islands se registran automáticamente en config/inicializarIslands.ts
 * Para agregar una nueva isla:
 * 1. Crear el componente en App/React/islands/NombreIsla.tsx
 * 2. Registrar en App/React/config/inicializarIslands.ts
 * 3. Definir ruta en App/Config/pages.php
 *
 * COMPATIBILIDAD (proyectos legacy):
 * El objeto islandsManuales mantiene compatibilidad con el método anterior.
 * Las islands manuales tienen prioridad sobre las auto-registradas.
 */

/* Inicializar registros ANTES de cualquier otra importación */
import './config/inicializarPaneles';
import './config/inicializarIslands';

/* Obtener islands del registro */
import {obtenerMapaComponentes, fusionarConIslandsManuales} from './config/registroIslands';

/* Provider global de la app */
import {ProveedorAlertas} from './context/AlertasContext';

/* Estilos del proyecto */
import './styles/dashboard/index.css';

/*
 * Islands manuales (COMPATIBILIDAD)
 * Proyectos legacy pueden seguir agregando islands aquí.
 * Estas tienen prioridad sobre las auto-registradas.
 */
const islandsManuales: Record<string, React.ComponentType<Record<string, unknown>>> = {
    /* TO-DO: Agregar aquí islands que no usen el sistema de auto-registro */
};

/*
 * Registro combinado de islas de la aplicación
 * Fusiona islands auto-registradas con islands manuales
 */
export const appIslands: Record<string, React.ComponentType<Record<string, unknown>>> = fusionarConIslandsManuales(islandsManuales);

/*
 * Provider global de la aplicación
 * Glory lo usará para envolver todas las islas
 * Puede ser undefined si la app no necesita un provider
 */
export const AppProvider: React.ComponentType<{children: React.ReactNode}> | undefined = ProveedorAlertas;

/*
 * Exportación por defecto para facilitar el import en Glory/main.tsx
 */
export default appIslands;

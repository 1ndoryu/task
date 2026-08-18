/*
 * config/inicializarIslands.ts
 * Archivo de inicialización que registra todas las islands
 *
 * IMPORTANTE: Este archivo debe importarse una sola vez al inicio
 * antes de usar cualquier función del registro de islands.
 *
 * GUÍA PARA AGREGAR NUEVAS ISLANDS:
 * 1. Crear componente en App/React/islands/MiIsland.tsx
 * 2. Importar y registrar aquí con registrarIsland()
 * 3. Registrar ruta en App/Config/pages.php (sin modificar appIslands.tsx)
 *
 * COMPATIBILIDAD: Este sistema es OPCIONAL. Los proyectos que prefieren
 * el método manual (editar appIslands.tsx) pueden seguir usándolo.
 */

import {registrarIsland, marcarIslandsInicializadas} from './registroIslands';

/* Islands existentes - Importar y registrar cada island del proyecto */

import {DashboardIsland} from '../islands/DashboardIsland';
import {PaginaPruebaIsland} from '../islands/PaginaPruebaIsland';
import {ArbitrajeIsland} from '../islands/ArbitrajeIsland';
import PoliticaPrivacidadIsland from '../islands/PoliticaPrivacidadIsland';
import TerminosServicioIsland from '../islands/TerminosServicioIsland';

/* Estilos específicos de islands */
import '../styles/prueba/paginaPrueba.css';
import '../styles/arbitraje/arbitraje.css';

registrarIsland('DashboardIsland', DashboardIsland, 'Panel principal de productividad con tareas, hábitos y notas');

registrarIsland('PaginaPruebaIsland', PaginaPruebaIsland, 'Página de prueba para validar el sistema OCP de auto-registro');

registrarIsland('ArbitrajeIsland', ArbitrajeIsland, 'Calculadora de arbitraje para compra/venta internacional con conversión de divisas');

registrarIsland('PoliticaPrivacidadIsland', PoliticaPrivacidadIsland, 'Política de Privacidad - Requisito obligatorio para OAuth de Google');

registrarIsland('TerminosServicioIsland', TerminosServicioIsland, 'Términos de Servicio - Condiciones de uso de la plataforma');

/* TO-DO: Futuras islands se agregan aquí
 * Ejemplo:
 *
 * import {MiNuevaIsland} from '../islands/MiNuevaIsland';
 * registrarIsland('MiNuevaIsland', MiNuevaIsland, 'Descripción');
 */

/* Marcar como inicializado */
marcarIslandsInicializadas();

/* Export vacío para forzar que el archivo se ejecute como side-effect */
export {};

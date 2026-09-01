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
import {GaleriaVisualIsland} from '../islands/GaleriaVisualIsland';
import {VerificacionFormularios318A3Island} from '../islands/VerificacionFormularios318A3Island';
import {ArbitrajeIsland} from '../islands/ArbitrajeIsland';
import PoliticaPrivacidadIsland from '../islands/PoliticaPrivacidadIsland';
import TerminosServicioIsland from '../islands/TerminosServicioIsland';

/* Estilos específicos de islands */
import '../styles/prueba/paginaPrueba.css';
import '../styles/arbitraje/arbitraje.css';

registrarIsland('DashboardIsland', DashboardIsland, 'Panel principal de productividad con tareas, hábitos y notas');

registrarIsland('PaginaPruebaIsland', PaginaPruebaIsland, 'Página de prueba para validar el sistema OCP de auto-registro');

/* [Fase 4.5] Galería visual del agente: ruta /agente/visuales solo en dev
 * (ver main.tsx, registrada bajo import.meta.env.DEV). */
registrarIsland('GaleriaVisualIsland', GaleriaVisualIsland, 'Galería visual del chat del agente (Fase 4.5, dev only)');

/* [318A-3] Verificación visual del DoD: formularios migrados al sistema
 * centralizado (patrón A 9/9 + B). Ruta /agente/formularios318a3 solo en dev
 * (ver main.tsx, registrada bajo import.meta.env.DEV). */
registrarIsland('VerificacionFormularios318A3Island', VerificacionFormularios318A3Island, 'Verificación visual de formularios centralizados 318A-3 (dev only)');

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

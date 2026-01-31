/*
 * DOCUMENTACIÓN: ESTRUCTURA MODULAR DE ESTILOS MÓVIL
 * 
 * El archivo monolítico movil.css (1226 líneas) ha sido refactorizado en 8 archivos
 * especializados para cumplir con el límite de 300 líneas por archivo (Protocolo SOLID).
 * 
 * ORDEN DE CARGA (Definido en index.css):
 * =======================================
 * 
 * 1. movilBase.css (286 líneas)
 *    - Optimizaciones WebView base
 *    - Prevención de gestos accidentales
 *    - Touch actions y feedback táctil
 *    - Scroll optimizado
 *    - Gestos táctiles y pull-to-refresh
 *    - Animaciones optimizadas
 * 
 * 2. movilUtilidades.css (59 líneas)
 *    - Clases utilitarias: ocultarEnMovil, mostrarSoloEnMovil
 *    - Helpers responsive para tablet/móvil
 * 
 * 3. movilComponentes.css (198 líneas)
 *    - Modales fullscreen
 *    - Bottom sheets
 *    - Drawer lateral
 * 
 * 4. movilNavegacion.css (107 líneas)
 *    - Navegación inferior fija
 *    - Header móvil
 *    - FAB central
 * 
 * 5. movilSafeAreas.css (89 líneas)
 *    - Safe areas (notch, cámara perforada)
 *    - Optimizaciones GPU
 *    - Backface visibility
 * 
 * 6. movilGrid.css (227 líneas)
 *    - Grid móvil con navegación por páginas
 *    - Paneles fullscreen sin bordes
 *    - Menú opciones panel (bottom sheet)
 * 
 * 7. movilFormularios.css (273 líneas)
 *    - Formularios compactos
 *    - Pills y propiedades ultra compactas
 *    - Chat inline móvil
 *    - Modal moderna
 * 
 * 8. movilListas.css (177 líneas)
 *    - Proyectos layout 2 filas
 *    - Hábitos compactos
 *    - Tareas sin botones de acción
 *    - Padding lateral unificado (15px)
 * 
 * BREAKPOINTS:
 * ============
 * - Móvil: max-width 480px (teléfonos)
 * - Tablet: max-width 768px (tablets)
 * - Escritorio: min-width 1024px (desktop)
 * 
 * PRINCIPIOS DE MODULARIZACIÓN:
 * ==============================
 * - SRP (Single Responsibility Principle): Cada archivo una responsabilidad clara
 * - OCP (Open/Closed Principle): Extendible sin modificar archivos existentes
 * - Sin duplicación: Variables CSS centralizadas en variables.css
 * - Cascada natural: Los archivos posteriores pueden sobrescribir a los anteriores
 * - Nomenclatura en español: Todas las clases CSS en español (Protocolo)
 * 
 * MANTENIMIENTO:
 * ==============
 * - Al agregar nuevas reglas, identificar el archivo correspondiente por responsabilidad
 * - Si un archivo excede 300 líneas, dividir por subfuncionalidad
 * - Nunca duplicar reglas entre archivos
 * - Siempre usar variables CSS del sistema (variables.css)
 * - Comentar secciones con formato limpio (sin barras decorativas)
 * 
 * FECHA DE REFACTORIZACIÓN: 2026-01-31
 * VERSIÓN: v1.0.18-beta
 */

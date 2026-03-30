export interface Cambio {
    tipo: 'nuevo' | 'mejora' | 'arreglo';
    descripcion: string;
}

export interface Version {
    version: string;
    fecha: string;
    cambios: Cambio[];
}

/*
 * AVISO IMPORTANTE: Este changelog está orientado a usuarios finales.
 * Usar lenguaje natural y claro, evitar tecnicismos como:
 * - Nombres de componentes (ModalX, useHook, etc.)
 * - Términos técnicos (SOLID, refactorización, sync, cache, etc.)
 * - Detalles de implementación (px, TTL, API, etc.)
 *
 * En su lugar, describir el beneficio para el usuario:
 * - "Ahora puedes..." en vez de "Implementado sistema de..."
 * - "Se arregló el problema de..." en vez de "Fix en componente X"
 */
export const HISTORIAL_VERSIONES: Version[] = [
    {
        version: 'v1.0.28-beta',
        fecha: '2026-03-28',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Iconos de Sol y Luna para seleccionar rápidamente horarios de día o noche en los hábitos'},
            {tipo: 'mejora', descripcion: 'El historial de meses en el mapa de hábitos ahora separa cada mes correctamente'},
            {tipo: 'mejora', descripcion: 'Los nuevos usuarios ahora ven dos columnas por defecto para aprovechar mejor el espacio'},
            {tipo: 'mejora', descripcion: 'Menos espacio en la barra lateral de configuración para una vista más compacta'},
            {tipo: 'mejora', descripcion: 'Los botones principales ahora tienen mejor contraste con fondo blanco y texto oscuro'},
            {tipo: 'mejora', descripcion: 'El botón de enviar del chat IA ya no tiene borde visible'},
            {tipo: 'mejora', descripcion: 'El campo de texto del chat IA ahora ocupa todo el ancho disponible'},
            {tipo: 'mejora', descripcion: 'Ya no necesitas configurar la misma API Key de IA en dos lugares diferentes'},
            {tipo: 'arreglo', descripcion: 'El mapa de actividad ahora se adapta correctamente al ancho del panel sin dejar espacios vacíos'},
            {tipo: 'arreglo', descripcion: 'Se eliminó la leyenda innecesaria del panel de actividad'},
            {tipo: 'arreglo', descripcion: 'Los emojis en el modal de comentarios fueron reemplazados por iconos que se ven bien en todos los dispositivos'},
            {tipo: 'arreglo', descripcion: 'El área de texto en las notas rápidas ya no pega el texto contra el borde derecho'},
            {tipo: 'arreglo', descripcion: 'El campo de texto del modal de comentarios ya no se desborda fuera de su contenedor'},
            {tipo: 'arreglo', descripcion: 'Proporciones del avatar, selector de repetición y vista compacta corregidas'},
            {tipo: 'arreglo', descripcion: 'Botones sin efectos visuales extraños al pasar el cursor'}
        ]
    },
    {
        version: 'v1.0.27-beta',
        fecha: '2026-03-26',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Calendario interactivo para seleccionar fechas en lugar de un menú desplegable'},
            {tipo: 'nuevo', descripcion: 'Al crear notas, puedes elegir entre crearla aquí o en una ventana flotante'},
            {tipo: 'nuevo', descripcion: 'Panel de Grupos de Facebook que sincroniza tus grupos con filtros por categoría e importancia'},
            {tipo: 'nuevo', descripcion: 'Configuración del panel de grupos con tu token de API'},
            {tipo: 'nuevo', descripcion: 'Cada panel de notas duplicado mantiene su propio contenido independiente'},
            {tipo: 'mejora', descripcion: 'El panel de grupos sigue el diseño visual del resto de la aplicación'},
            {tipo: 'mejora', descripcion: 'Puedes duplicar el panel de notas para tener varias notas abiertas al mismo tiempo'},
            {tipo: 'mejora', descripcion: 'Al duplicar el panel de notas, se abre automáticamente un espacio limpio'},
            {tipo: 'mejora', descripcion: '"Omitir hoy" ahora es más claro que "Posponer hoy" en los hábitos'},
            {tipo: 'mejora', descripcion: 'Posponer ahora dice "1 día" en lugar de "Mañana" para mayor claridad'},
            {tipo: 'mejora', descripcion: 'El icono de IA se ve directamente en la barra de paneles cerrados'},
            {tipo: 'mejora', descripcion: 'Estimación de calorías mejorada para comidas latinoamericanas con medidas informales'},
            {tipo: 'arreglo', descripcion: 'Los subhábitos fantasma que no se podían borrar ni reaparecían ya están corregidos'},
            {tipo: 'arreglo', descripcion: 'El avatar del perfil ahora mantiene su proporción circular correctamente'},
            {tipo: 'arreglo', descripcion: 'Problemas de edición de subhábitos y seguimiento automático resueltos'},
            {tipo: 'arreglo', descripcion: 'Comportamiento de hover corregido en varios elementos'}
        ]
    },
    {
        version: 'v1.0.26-beta',
        fecha: '2026-03-24',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Cálculo de calorías con inteligencia artificial propia que no requiere servicios de pago'},
            {tipo: 'mejora', descripcion: 'Modelos de IA más inteligentes disponibles para el chat (GPT-OSS 120B, Llama 4, Kimi K2)'},
            {tipo: 'mejora', descripcion: 'El botón de envío del chat IA ahora es más grande y visible'},
            {tipo: 'mejora', descripcion: 'Icono de robot en el panel del asistente IA para identificarlo fácilmente'},
            {tipo: 'mejora', descripcion: 'La configuración de IA se accede desde el modal de configuración centralizado'},
            {tipo: 'mejora', descripcion: 'Más espacio en la barra del buscador de notas'},
            {tipo: 'mejora', descripcion: 'El botón cerrar invisible en modales ahora está completamente oculto'},
            {tipo: 'arreglo', descripcion: 'La ventana de oportunidad de los hábitos ahora aparece en la posición correcta desde el inicio'},
            {tipo: 'arreglo', descripcion: 'Los subhábitos ya no abren el modal equivocado al hacer clic'},
            {tipo: 'arreglo', descripcion: 'El historial de hábitos ya no se desborda fuera de su panel'},
            {tipo: 'arreglo', descripcion: 'El padding del modal de configuración ahora es consistente'},
            {tipo: 'arreglo', descripcion: 'Las alturas de los badges ahora son uniformes'}
        ]
    },
    {
        version: 'v1.0.25-beta',
        fecha: '2026-03-23',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Asistente IA integrado en el panel para crear tareas y hábitos por chat'},
            {tipo: 'nuevo', descripcion: 'Todas las configuraciones ahora están en un único modal organizado por categorías'},
            {tipo: 'nuevo', descripcion: 'Puedes posponer tareas y hábitos eligiendo el tiempo exacto: 1h, 4h, 8h, 1 día, 2 días o 1 semana'},
            {tipo: 'mejora', descripcion: 'Los plugins ahora se acceden desde la configuración centralizada'},
            {tipo: 'mejora', descripcion: 'El modal de configuración se convierte en panel deslizable en el móvil'},
            {tipo: 'mejora', descripcion: 'Iconos y colores unificados para todas las prioridades'},
            {tipo: 'mejora', descripcion: 'Selector de importancia con iconos más claros y consistentes'},
            {tipo: 'mejora', descripcion: 'Más de 40 ajustes de espaciado, bordes y estilo visual en todo el panel'},
            {tipo: 'arreglo', descripcion: 'Errores de tipos pre-existentes corregidos para mayor estabilidad'},
            {tipo: 'arreglo', descripcion: 'El panel deslizable en móvil ahora carga las fuentes correctamente'},
            {tipo: 'arreglo', descripcion: 'Alineación de iconos y espaciado corregidos en varios paneles'}
        ]
    },
    {
        version: 'v1.0.24-beta',
        fecha: '2026-02-07',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Sincronización de notas en tiempo real entre dispositivos mientras escribes'},
            {tipo: 'nuevo', descripcion: 'Desliza hacia abajo en móvil para actualizar los datos del panel'},
            {tipo: 'nuevo', descripcion: 'Notificaciones diarias recurrentes para tus hábitos en Android'},
            {tipo: 'mejora', descripcion: 'Las notas se mueven de carpeta inmediatamente sin necesidad de recargar'},
            {tipo: 'mejora', descripcion: 'Al crear una nota, se guarda automáticamente en la carpeta que tengas abierta'},
            {tipo: 'mejora', descripcion: 'Si cierras el editor de notas con cambios sin guardar, se guardan automáticamente'},
            {tipo: 'mejora', descripcion: 'Indicador visual que muestra cuando hay cambios sin guardar en una nota'},
            {tipo: 'arreglo', descripcion: 'Los cambios entre dispositivos ya no causan bucles al marcar o desmarcar hábitos'},
            {tipo: 'arreglo', descripcion: 'Los hábitos ya no aparecen duplicados en el panel de ejecución al sincronizar'},
            {tipo: 'arreglo', descripcion: 'Las fechas ya no se muestran como vencidas el mismo día en zonas horarias negativas'},
            {tipo: 'arreglo', descripcion: 'Editar una tarea ya no borra su descripción ni archivos adjuntos'},
            {tipo: 'arreglo', descripcion: 'El menú de hábitos ya solo muestra \"Configurar\" sin opciones duplicadas'},
            {tipo: 'arreglo', descripcion: 'Los colores del popup de tareas ahora se adaptan correctamente al modo claro'},
            {tipo: 'arreglo', descripcion: 'La prioridad \"Muy Alta\" ya se muestra correctamente formateada en el selector'},
            {tipo: 'arreglo', descripcion: 'El panel de creación rápida ya se ve correctamente en modo claro'}
        ]
    },
    {
        version: 'v1.0.23-beta',
        fecha: '2026-02-05',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Sincronización en tiempo real entre dispositivos (tus cambios aparecen automáticamente en otros dispositivos)'},
            {tipo: 'nuevo', descripcion: 'Modo offline: la app funciona sin internet y sincroniza cuando vuelves a conectarte'},
            {tipo: 'nuevo', descripcion: 'Indicador de conexión que muestra cuando la app está sincronizando o sin conexión'},
            {tipo: 'mejora', descripcion: 'El botón atrás del teléfono ahora cierra modales y menús correctamente en Android'},
            {tipo: 'mejora', descripcion: 'Las subtareas en móvil ahora se ven claramente diferenciadas con sangría'},
            {tipo: 'mejora', descripcion: 'Al tocar un hábito en la lista de ejecución, se abre el panel de configuración'},
            {tipo: 'mejora', descripcion: 'Deslizar izquierda en hábitos ahora pospone en vez de eliminar'},
            {tipo: 'mejora', descripcion: 'Mejor espaciado entre hábitos en modo compacto'},
            {tipo: 'arreglo', descripcion: 'La hora de las actividades ahora se muestra correctamente según tu zona horaria'},
            {tipo: 'arreglo', descripcion: 'Los hábitos ahora aparecen el día correcto según su frecuencia configurada'}
        ]
    },
    {
        version: 'v1.0.21-beta',
        fecha: '2026-02-03',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Panel de notas adaptado para móvil con mejor uso del espacio'},
            {tipo: 'nuevo', descripcion: 'Desliza tareas para completarlas o eliminarlas rápidamente en móvil'},
            {tipo: 'nuevo', descripcion: 'Subhábitos: hábitos dentro de hábitos con frecuencia e importancia independiente'},
            {tipo: 'nuevo', descripcion: 'Configura el mejor horario para cada hábito con ventana de oportunidad visual'},
            {tipo: 'nuevo', descripcion: 'Organiza tus notas en carpetas y navega como en un explorador de archivos'},
            {tipo: 'nuevo', descripcion: 'Ocultar o mostrar lista de notas y editor de forma independiente'},
            {tipo: 'nuevo', descripcion: 'Selecciona múltiples tareas con Ctrl+Click o mantén presionado en móvil'},
            {tipo: 'nuevo', descripcion: 'Ordena grupos de tareas por nombre o importancia promedio'},
            {tipo: 'mejora', descripcion: 'Los gestos de deslizamiento ahora funcionan correctamente sin importar el largo del texto'},
            {tipo: 'mejora', descripcion: 'Ahora puedes editar hábitos tocándolos una vez en móvil'},
            {tipo: 'mejora', descripcion: 'Las subtareas se expanden automáticamente al agregar una nueva si la opción está desactivada'},
            {tipo: 'mejora', descripcion: 'Menú contextual en notas con opciones para ver, mover, eliminar o renombrar'},
            {tipo: 'mejora', descripcion: 'Modal de copias de seguridad ahora se adapta mejor a pantallas móviles'},
            {tipo: 'mejora', descripcion: 'Opción para ocultar subtareas automáticamente al inicio'},
            {tipo: 'mejora', descripcion: 'Ordenar notas por fecha de modificación o creación'},
            {tipo: 'arreglo', descripcion: 'Las actividades del día ahora muestran correctamente el nombre de tareas y hábitos'},
            {tipo: 'arreglo', descripcion: 'Los acentos y caracteres especiales ya no se muestran con símbolos raros en las notas'},
            {tipo: 'arreglo', descripcion: 'La carpeta General siempre aparece y no desaparece al navegar'},
            {tipo: 'arreglo', descripcion: 'Las copias de seguridad automáticas ya no aparecen marcadas como manuales'}
        ]
    },
    {
        version: 'v1.0.19-beta',
        fecha: '2026-02-01',
        cambios: [
            {tipo: 'mejora', descripcion: 'BottomSheets más compactos con barra de acciones horizontal'},
            {tipo: 'mejora', descripcion: 'Modales de selección de propiedades para tareas, hábitos y proyectos'},
            {tipo: 'mejora', descripcion: 'Badges de propiedades seleccionadas con botón para eliminar'},
            {tipo: 'mejora', descripcion: 'Menú contextual de hábitos sincronizado entre paneles'},
            {tipo: 'mejora', descripcion: 'Solo un menú contextual visible a la vez'},
            {tipo: 'mejora', descripcion: 'Opciones del menú de usuario centralizadas'},
            {tipo: 'mejora', descripcion: 'Panel de notas ahora accesible desde navegación inferior móvil'},
            {tipo: 'mejora', descripcion: 'Icono de urgencia actualizado a rayo para mejor coherencia visual'},
            {tipo: 'mejora', descripcion: 'Fuente aumentada en modo compacto para mejor legibilidad móvil'},
            {tipo: 'mejora', descripcion: 'Modales móviles ahora ocupan el 100% del ancho disponible'},
            {tipo: 'mejora', descripcion: 'Placeholders de inputs con opacidad reducida para mejor contraste'},
            {tipo: 'mejora', descripcion: 'Menús contextuales con mejor padding táctil en móvil'},
            {tipo: 'mejora', descripcion: 'Estado vacío centrado verticalmente en la pantalla'},
            {tipo: 'mejora', descripcion: 'Refactorización de modales para mejor mantenibilidad'},
            {tipo: 'arreglo', descripcion: 'El drawer ahora aparece correctamente sobre la navegación inferior'},
            {tipo: 'arreglo', descripcion: 'Click en foto o nombre del drawer abre el perfil'},
            {tipo: 'arreglo', descripcion: 'Scroll móvil mejorado usando viewport dinámico (dvh)'},
            {tipo: 'arreglo', descripcion: 'Bug de propiedades que desaparecían al editar en BottomSheet'},
            {tipo: 'arreglo', descripcion: 'Autocompletado del teclado móvil desactivado en formularios'},
            {tipo: 'arreglo', descripcion: 'Separadores duplicados en menú lateral móvil eliminados'},
            {tipo: 'arreglo', descripcion: 'Modal selector de propiedades centrado correctamente'}
        ]
    },
    {
        version: 'v1.0.18-beta',
        fecha: '2026-01-31',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Sistema de comentarios Premium: envía hasta 3 sugerencias por día'},
            {tipo: 'nuevo', descripcion: 'Panel de administración mejorado con pestaña de feedback de usuarios'},
            {tipo: 'mejora', descripcion: 'Botones para crear tareas y proyectos ahora abren el modal completo de configuración'},
            {tipo: 'mejora', descripcion: 'El panel de notas ahora mantiene el ancho sincronizado correctamente'},
            {tipo: 'mejora', descripcion: 'Al registrarte, aparecen automáticamente tareas y notas de bienvenida'},
            {tipo: 'mejora', descripcion: 'Puedes cambiar la importancia de los hábitos desde el menú contextual'},
            {tipo: 'mejora', descripcion: 'El botón "Añadir" ahora se expande correctamente en los paneles'},
            {tipo: 'arreglo', descripcion: 'Corregido el botón de enviar en el formulario de comentarios'},
            {tipo: 'arreglo', descripcion: 'El badge "Muy Alta" ahora se muestra correctamente en hábitos'},
            {tipo: 'arreglo', descripcion: 'Corregido el pie de página mostrando "Nakomi.studio"'}
        ]
    },
    {
        version: 'v1.0.17-beta',
        fecha: '2026-01-31',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Botón rápido para crear proyectos desde el panel de Proyectos'},
            {tipo: 'mejora', descripcion: 'Las tareas vacías ahora muestran un mensaje amigable en lugar de estar en blanco'},
            {tipo: 'mejora', descripcion: 'La nota de bienvenida aparece correctamente al registrarte'},
            {tipo: 'mejora', descripcion: 'Al exportar datos ahora se incluye tu historial completo de hábitos y tareas'},
            {tipo: 'arreglo', descripcion: 'El modal de Premium ahora muestra correctamente 30 días de prueba'},
            {tipo: 'arreglo', descripcion: 'Corregido el desface visual en el panel de notas'},
            {tipo: 'arreglo', descripcion: 'Las tareas de bienvenida ya no muestran actividad confusa'}
        ]
    },
    {
        version: 'v1.0.15-beta',
        fecha: '2026-01-29',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Copias de seguridad automáticas para usuarios Premium (se guardan cada 30 minutos, hasta 30 días)'},
            {tipo: 'nuevo', descripcion: 'Puedes ver y restaurar versiones anteriores de tus datos desde el menú'},
            {tipo: 'mejora', descripcion: 'Las subtareas ahora se pueden reorganizar arrastrándolas'},
            {tipo: 'mejora', descripcion: 'Las subtareas muestran su nivel de prioridad con un indicador visual'},
            {tipo: 'mejora', descripcion: 'Puedes agregar subtareas más rápido desde el menú contextual'},
            {tipo: 'mejora', descripcion: 'Las subtareas se ordenan automáticamente por prioridad'},
            {tipo: 'arreglo', descripcion: 'Las subtareas ahora heredan correctamente la prioridad al crearlas'},
            {tipo: 'arreglo', descripcion: 'Las subtareas aparecen inmediatamente en la sección "Metas"'},
            {tipo: 'arreglo', descripcion: 'La frecuencia y nombre de los hábitos ya no se pierden al recargar'},
            {tipo: 'arreglo', descripcion: 'Las tareas ya no desaparecen al crear una nueva'},
            {tipo: 'arreglo', descripcion: 'Se solucionaron errores cuando no estás conectado'},
            {tipo: 'arreglo', descripcion: 'El inicio de sesión ya no muestra pantalla negra'}
        ]
    },
    {
        version: 'v1.0.14-beta',
        fecha: '2026-01-27',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Puedes pausar hábitos temporalmente sin perder tu racha'},
            {tipo: 'nuevo', descripcion: 'Configura tu "Fin del Día" si trabajas de noche o tienes horarios irregulares'},
            {tipo: 'nuevo', descripcion: 'Los hábitos ahora pueden tener subtareas y metas asociadas'},
            {tipo: 'nuevo', descripcion: 'Puedes bloquear paneles expandidos con el botón de candado'},
            {tipo: 'nuevo', descripcion: 'Al hacer clic en el mapa de calor, ves el detalle de ese día'},
            {tipo: 'mejora', descripcion: 'Las tareas retrasadas ahora aparecen más arriba en la lista automáticamente'},
            {tipo: 'mejora', descripcion: 'Los días libres ya no aparecen en el historial de hábitos'},
            {tipo: 'mejora', descripcion: 'Mejor visualización de hábitos en modo compacto'},
            {tipo: 'arreglo', descripcion: 'El registro de actividad ahora respeta tu configuración de hora'}
        ]
    },
    {
        version: 'v1.0.12-beta',
        fecha: '2026-01-16',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Navegación por páginas en móvil: cada panel es una página independiente'},
            {tipo: 'nuevo', descripcion: 'NavegacionInferior con 5 botones: Tareas, Proyectos, FAB, Hábitos, Actividad'},
            {tipo: 'nuevo', descripcion: 'Menú de opciones unificado (3 puntos) con BottomSheet en móvil'},
            {tipo: 'nuevo', descripcion: 'Chat inline al final de modales en móvil (sin columna lateral)'},
            {tipo: 'nuevo', descripcion: 'Configuración de columnas de hábitos separada por dispositivo'},
            {tipo: 'nuevo', descripcion: 'Gesto drag-to-close en BottomSheet'},
            {tipo: 'mejora', descripcion: 'Paneles fullscreen sin bordes ni sombras en móvil'},
            {tipo: 'mejora', descripcion: 'Header modal compacto (40px) con layout grid 3 columnas'},
            {tipo: 'mejora', descripcion: 'Formularios compactos: pills más pequeños, padding reducido'},
            {tipo: 'mejora', descripcion: 'Proyectos en layout 2 filas: título completo + badges inline'},
            {tipo: 'mejora', descripcion: 'Hábitos compactos: checkbox 16px, racha 10px, columnas optimizadas'},
            {tipo: 'mejora', descripcion: 'Botones "Añadir" ocultos en móvil (FAB es suficiente)'},
            {tipo: 'mejora', descripcion: 'Búsqueda movida al menú de opciones (3 puntos)'},
            {tipo: 'mejora', descripcion: 'Iconos consistentes en opciones de ordenamiento'},
            {tipo: 'arreglo', descripcion: 'Badge de filtros activos con color correcto (no rojo)'},
            {tipo: 'arreglo', descripcion: 'Scroll innecesario en paneles con pocas tareas'},
            {tipo: 'arreglo', descripcion: 'Tooltips deshabilitados en móvil'},
            {tipo: 'arreglo', descripcion: 'Fondos de color eliminados en hábitos (interfieren con tema)'}
        ]
    },
    {
        version: 'v1.0.11-beta',
        fecha: '2026-01-11',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Header móvil con grid 3 columnas (hamburguesa | título | búsqueda)'},
            {tipo: 'nuevo', descripcion: 'DrawerMovil con animación swipe y overlay'},
            {tipo: 'nuevo', descripcion: 'Modales fullscreen en móvil con botón "Volver"'},
            {tipo: 'nuevo', descripcion: 'BottomSheet para menús contextuales en móvil'},
            {tipo: 'nuevo', descripcion: 'Búsqueda modal fullscreen en dispositivos móviles'},
            {tipo: 'nuevo', descripcion: 'MenuContextualAdaptivo: detecta móvil/escritorio automáticamente'},
            {tipo: 'mejora', descripcion: 'Layout una columna en móvil para mejor lectura'},
            {tipo: 'mejora', descripcion: 'Iconos header unificados a 20px sin borders'},
            {tipo: 'mejora', descripcion: 'Header fijo (position: fixed) para navegación constante'},
            {tipo: 'arreglo', descripcion: 'Error e.map al abrir configuración de tarea desde creación rápida'},
            {tipo: 'arreglo', descripcion: 'Proyecto no se asignaba a tareas creadas desde modal rápido'},
            {tipo: 'arreglo', descripcion: 'Hábitos no actualizaban estado global al marcar días retroactivos'},
            {tipo: 'arreglo', descripcion: 'Scroll horizontal eliminado en header móvil'},
            {tipo: 'mejora', descripcion: 'Validación defensiva en SelectorTags para evitar crashes'}
        ]
    },
    {
        version: 'v1.0.10-beta',
        fecha: '2026-01-01',
        cambios: [
            {tipo: 'nuevo', descripcion: 'API REST para asistentes de IA (tareas, proyectos, hábitos)'},
            {tipo: 'nuevo', descripcion: 'Servidor MCP para integración con Claude, Antigravity y otros'},
            {tipo: 'nuevo', descripcion: 'Submenús contextuales con opciones de Prioridad y Urgencia'},
            {tipo: 'nuevo', descripcion: 'Modo compacto para tareas y proyectos'},
            {tipo: 'nuevo', descripcion: 'Tareas heredan prioridad y urgencia del proyecto al crearse'},
            {tipo: 'mejora', descripcion: 'Submenús se ajustan dinámicamente al borde de la pantalla'},
            {tipo: 'mejora', descripcion: 'Menús de filtro/ordenar ya no se cortan por el panel'},
            {tipo: 'mejora', descripcion: 'Texto por defecto en notas cambiado a "# Título de la nota"'},
            {tipo: 'mejora', descripcion: 'Borrar tarea vacía con Backspace al editar'},
            {tipo: 'mejora', descripcion: 'Cursor automático en tarea nueva al presionar Enter'},
            {tipo: 'mejora', descripcion: 'Tareas con subtareas no se expanden automáticamente'},
            {tipo: 'mejora', descripcion: 'Ordenamiento de tareas por prioridad dentro de proyectos'},
            {tipo: 'arreglo', descripcion: 'Títulos con salto de línea en modales de configuración'},
            {tipo: 'arreglo', descripcion: 'Arrastre de paneles no se queda pegado'},
            {tipo: 'arreglo', descripcion: 'Padding en acciones de tareas para evitar cambios de layout'},
            {tipo: 'arreglo', descripcion: 'Separador entre Prioridad y Urgencia en menú contextual'},
            {tipo: 'arreglo', descripcion: 'API registra actividad al completar tareas'}
        ]
    },
    {
        version: 'v1.0.9-beta',
        fecha: '2025-12-29',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Selectores estilo pill para tareas: Estado, Proyecto, Repetición'},
            {tipo: 'nuevo', descripcion: 'Selectores estilo pill para hábitos: Importancia, Estado, Frecuencia'},
            {tipo: 'nuevo', descripcion: 'Selector de estado de proyecto: Activo, Pausado, Completado'},
            {tipo: 'nuevo', descripcion: 'Componente FilaPropiedades reutilizable con etiqueta + pills'},
            {tipo: 'nuevo', descripcion: 'Panel de repetición expandible con configuración avanzada'},
            {tipo: 'nuevo', descripcion: 'Panel de frecuencia expandible para hábitos'},
            {tipo: 'mejora', descripcion: 'Formularios modernos con layout estilo Linear'},
            {tipo: 'mejora', descripcion: 'Consistencia visual en gaps y espaciados de propiedades'},
            {tipo: 'arreglo', descripcion: 'Gap inconsistente en sección de adjuntos moderno'}
        ]
    },
    {
        version: 'v1.0.7-beta',
        fecha: '2025-12-29',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Buscador Global centrado en header (Tareas, Hábitos, Proyectos)'},
            {tipo: 'nuevo', descripcion: 'Menu contextual "Dashboard" para navegación rápida'},
            {tipo: 'nuevo', descripcion: 'Selector de estado de hábito (Completado, Pospuesto, Pendiente) en edicion'},
            {tipo: 'nuevo', descripcion: 'Opción de mover tarea a otro proyecto desde el modal de configuración'},
            {tipo: 'nuevo', descripcion: 'Selector de estado de tarea (Pendiente/Completada) en modal de edición'},
            {tipo: 'mejora', descripcion: 'Headers de paneles con opacidad reducida para menor ruido visual'},
            {tipo: 'arreglo', descripcion: 'Tooltips se ocultan al abrir menús contextuales'}
        ]
    },
    {
        version: 'v1.0.6-beta',
        fecha: '2025-12-27',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Panel de Actividad con mapa de calor tipo GitHub'},
            {tipo: 'nuevo', descripcion: 'Mapa de calor por habito (en modal de configuracion)'},
            {tipo: 'nuevo', descripcion: 'Mapa de calor por proyecto (tareas completadas)'},
            {tipo: 'nuevo', descripcion: 'Historial de 7 dias inline en tabla de habitos'},
            {tipo: 'nuevo', descripcion: 'Click para marcar/desmarcar dias pasados (hasta 30 dias)'},
            {tipo: 'nuevo', descripcion: 'Click derecho para marcar como pospuesto'},
            {tipo: 'nuevo', descripcion: 'Calculo dinamico de semanas segun ancho del contenedor'},
            {tipo: 'mejora', descripcion: 'Cache de actividad con TTL 5 min (persistido en sessionStorage)'},
            {tipo: 'mejora', descripcion: 'Cache de historial de habitos con TTL 10 min'},
            {tipo: 'mejora', descripcion: 'Actualizacion optimista al marcar/desmarcar dias'},
            {tipo: 'mejora', descripcion: 'Panel mantiene datos anteriores mientras recarga'},
            {tipo: 'arreglo', descripcion: 'Zona horaria: obtenerFechaLocalISO() evita problemas UTC'},
            {tipo: 'arreglo', descripcion: 'Desmarcar habito elimina registro de actividad correctamente'},
            {tipo: 'arreglo', descripcion: 'Sincronizacion panel - modal al marcar desde checkbox'},
            {tipo: 'arreglo', descripcion: 'Dias no relevantes se muestran con opacidad reducida'},
            {tipo: 'arreglo', descripcion: 'Click unico para cambiar estado (sin multiples clicks)'},
            {tipo: 'arreglo', descripcion: 'Alineacion correcta de dias de semana en heatmap'}
        ]
    },
    {
        version: 'v1.0.4-beta',
        fecha: '2025-12-25',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Sistema de notas guardadas en Scratchpad (guardar, buscar, recuperar)'},
            {tipo: 'nuevo', descripcion: 'Habitos editables y eliminables desde panel de Ejecucion'},
            {tipo: 'nuevo', descripcion: 'Sistema de posponer habitos sin romper racha'},
            {tipo: 'nuevo', descripcion: 'Tolerancia de urgencia configurable (4 presets)'},
            {tipo: 'nuevo', descripcion: 'Redimensionar ancho de columnas con handles'},
            {tipo: 'nuevo', descripcion: 'Redimensionar altura de paneles (modo auto/fijo)'},
            {tipo: 'mejora', descripcion: 'Doble clic en handle iguala anchos de columnas'},
            {tipo: 'mejora', descripcion: 'Indicador visual de modo auto en paneles (linea verde)'},
            {tipo: 'mejora', descripcion: 'Eliminacion optimista de notas (respuesta instantanea)'},
            {tipo: 'arreglo', descripcion: 'Subtareas ahora persisten correctamente'},
            {tipo: 'arreglo', descripcion: 'Nombre de tarea persiste al editar'},
            {tipo: 'arreglo', descripcion: 'Error 403 en mensajes por timing de sincronizacion'},
            {tipo: 'arreglo', descripcion: 'Scroll visual en Scratchpad llega al borde'},
            {tipo: 'arreglo', descripcion: 'Cargando notas centrado correctamente'},
            {tipo: 'arreglo', descripcion: 'Notas se sincronizan al abrir carpeta'}
        ]
    },
    {
        version: 'v1.0.3-beta',
        fecha: '2025-12-24',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Sistema de Urgencia: niveles bloqueante, urgente, normal, chill'},
            {tipo: 'nuevo', descripcion: 'Ordenamiento inteligente mejorado: urgencia + prioridad + fecha'},
            {tipo: 'nuevo', descripcion: 'Hábitos en Ejecución: aparecen como tareas con urgencia automática'},
            {tipo: 'nuevo', descripcion: 'Modal expandido con Chat e Historial para tareas compartidas'},
            {tipo: 'nuevo', descripcion: 'Timeline unificado: mensajes + eventos del sistema'},
            {tipo: 'nuevo', descripcion: 'Notificaciones de mensajes de chat a participantes'},
            {tipo: 'nuevo', descripcion: 'Indicador de mensajes sin leer en tareas'},
            {tipo: 'nuevo', descripcion: 'Botón minimizar en todos los paneles'},
            {tipo: 'mejora', descripcion: 'Auto-guardado en modales de Tareas, Hábitos y Proyectos'},
            {tipo: 'mejora', descripcion: 'Toggle para ocultar/mostrar panel de chat (persistente)'},
            {tipo: 'mejora', descripcion: 'Columnas por defecto optimizadas en tabla de hábitos'},
            {tipo: 'mejora', descripcion: 'Orden de paneles por defecto mejorado'},
            {tipo: 'arreglo', descripcion: 'Modal de creación sin chat innecesario'},
            {tipo: 'arreglo', descripcion: 'Filtro Mis Asignadas excluye hábitos correctamente'},
            {tipo: 'arreglo', descripcion: 'Scroll unificado sin parpadeo'},
            {tipo: 'arreglo', descripcion: 'Tamaño de fuente pequeña en Scratchpad visible'}
        ]
    },
    {
        version: 'v1.0.2-beta',
        fecha: '2025-12-23',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Sistema de Equipos: solicitudes, compañeros, estados pendientes'},
            {tipo: 'nuevo', descripcion: 'Sistema de Notificaciones: alertas en tiempo real, polling automático'},
            {tipo: 'nuevo', descripcion: 'Compartir Proyectos y Tareas con miembros del equipo'},
            {tipo: 'nuevo', descripcion: 'Asignación de tareas a participantes específicos'},
            {tipo: 'nuevo', descripcion: 'Límites de almacenamiento (50MB Free / 10GB Premium)'},
            {tipo: 'nuevo', descripcion: 'Archivos físicos con cifrado para usuarios Premium'},
            {tipo: 'nuevo', descripcion: 'Thumbnails para imágenes adjuntas'},
            {tipo: 'nuevo', descripcion: 'Sistema de alertas personalizadas (toasts y confirmaciones)'},
            {tipo: 'mejora', descripcion: 'Header compactado: iconos con tooltips'},
            {tipo: 'mejora', descripcion: 'Cache de archivos descifrados (5 min TTL)'},
            {tipo: 'arreglo', descripcion: 'Badges de solicitudes y notificaciones sincronizados'}
        ]
    },
    {
        version: 'v1.0.1-beta',
        fecha: '2025-12-22',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Perfil de usuario con foto, bio y cambio de contraseña'},
            {tipo: 'nuevo', descripcion: 'Avatar del usuario visible en el header'},
            {tipo: 'nuevo', descripcion: 'Recuperación de contraseña desde el login'},
            {tipo: 'nuevo', descripcion: 'Configuración individual por panel (Hábitos, Tareas, Proyectos, Scratchpad)'},
            {tipo: 'nuevo', descripcion: 'Filtros inteligentes en panel de Ejecución'},
            {tipo: 'nuevo', descripcion: 'Sistema de tooltips personalizados'},
            {tipo: 'nuevo', descripcion: 'Mover tareas entre proyectos'},
            {tipo: 'nuevo', descripcion: 'Ordenamiento inteligente de tareas'},
            {tipo: 'nuevo', descripcion: 'Modal de historial de versiones'},
            {tipo: 'mejora', descripcion: 'Scratchpad con límite de caracteres y contador'},
            {tipo: 'mejora', descripcion: 'Botones de creación unificados en todos los paneles'},
            {tipo: 'mejora', descripcion: 'Controles de layout y visibilidad de paneles'},
            {tipo: 'arreglo', descripcion: 'Cifrado E2E ahora incluye datos del Scratchpad'}
        ]
    },
    {
        version: 'v1.0.0-beta',
        fecha: '2025-12-22',
        cambios: [
            {tipo: 'nuevo', descripcion: 'Sistema de reordenamiento de paneles (Drag & Drop)'},
            {tipo: 'nuevo', descripcion: 'Configuración de layout personalizable (columnas)'},
            {tipo: 'nuevo', descripcion: 'Foco Prioritario (Hábitos) con rachas y frecuencias'},
            {tipo: 'nuevo', descripcion: 'Gestión de Proyectos con jerarquía'},
            {tipo: 'nuevo', descripcion: 'Sistema de Tareas con subtareas y adjuntos'},
            {tipo: 'nuevo', descripcion: 'Scratchpad cifrado E2E'},
            {tipo: 'nuevo', descripcion: 'Integración con Stripe (Pagos y Suscripciones)'},
            {tipo: 'nuevo', descripcion: 'Panel de Administración'},
            {tipo: 'mejora', descripcion: 'Interfaz estilo terminal minimalista'},
            {tipo: 'mejora', descripcion: 'Sincronización robusta offline-first'}
        ]
    }
];

/* Versión actual siempre es la primera del historial */
export const VERSION_ACTUAL = HISTORIAL_VERSIONES[0].version;

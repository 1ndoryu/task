<?php

/**
 * AI API Controller
 *
 * API REST Universal para Asistentes de IA (Antigravity, Claude, GPT, etc.)
 * Permite a cualquier asistente interactuar con tareas, proyectos y hábitos
 * mediante peticiones HTTP estándar con autenticación Basic.
 *
 * Endpoints:
 * - GET    /wp-json/glory/v1/ai/tareas              -> Listar tareas
 * - POST   /wp-json/glory/v1/ai/tareas              -> Crear tarea
 * - GET    /wp-json/glory/v1/ai/tareas/{id}         -> Obtener tarea
 * - PUT    /wp-json/glory/v1/ai/tareas/{id}         -> Editar tarea
 * - POST   /wp-json/glory/v1/ai/tareas/{id}/completar -> Toggle completado
 * - DELETE /wp-json/glory/v1/ai/tareas/{id}         -> Eliminar tarea
 * - GET    /wp-json/glory/v1/ai/proyectos           -> Listar proyectos
 * - GET    /wp-json/glory/v1/ai/proyectos/{id}      -> Obtener proyecto
 * - GET    /wp-json/glory/v1/ai/habitos             -> Listar hábitos
 * - GET    /wp-json/glory/v1/ai/resumen             -> Resumen estadístico
 *
 * @package App\Api
 */

namespace App\Api;

use App\Repository\TareasRepository;
use App\Repository\ProyectosRepository;
use App\Repository\HabitosRepository;

class AIApiController
{
    private const API_NAMESPACE = 'glory/v1';

    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes(): void
    {
        /* 
        * Endpoints de Tareas 
        */
        register_rest_route(self::API_NAMESPACE, '/ai/tareas', [
            [
                'methods' => \WP_REST_Server::READABLE,
                'callback' => [self::class, 'obtenerTareas'],
                'permission_callback' => [self::class, 'requireAuthentication'],
                'args' => [
                    'filtro' => [
                        'required' => false,
                        'default' => 'todas',
                        'enum' => ['pendientes', 'completadas', 'todas'],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'proyectoId' => [
                        'required' => false,
                        'validate_callback' => fn($param) => is_numeric($param),
                        'sanitize_callback' => 'absint',
                    ],
                    'proyecto_id' => [
                        'required' => false,
                        'validate_callback' => fn($param) => is_numeric($param),
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
            [
                'methods' => \WP_REST_Server::CREATABLE,
                'callback' => [self::class, 'crearTarea'],
                'permission_callback' => [self::class, 'requireAuthentication'],
                'args' => self::getCrearTareaArgs(),
            ],
        ]);

        register_rest_route(self::API_NAMESPACE, '/ai/tareas/(?P<id>\d+)', [
            [
                'methods' => \WP_REST_Server::READABLE,
                'callback' => [self::class, 'obtenerTarea'],
                'permission_callback' => [self::class, 'requireAuthentication'],
            ],
            [
                'methods' => 'PUT',
                'callback' => [self::class, 'editarTarea'],
                'permission_callback' => [self::class, 'requireAuthentication'],
                'args' => self::getEditarTareaArgs(),
            ],
            [
                'methods' => \WP_REST_Server::DELETABLE,
                'callback' => [self::class, 'eliminarTarea'],
                'permission_callback' => [self::class, 'requireAuthentication'],
            ],
        ]);

        register_rest_route(self::API_NAMESPACE, '/ai/tareas/(?P<id>\d+)/completar', [
            'methods' => \WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'completarTarea'],
            'permission_callback' => [self::class, 'requireAuthentication'],
        ]);

        /* 
        * Endpoints de Proyectos 
        */
        register_rest_route(self::API_NAMESPACE, '/ai/proyectos', [
            'methods' => \WP_REST_Server::READABLE,
            'callback' => [self::class, 'obtenerProyectos'],
            'permission_callback' => [self::class, 'requireAuthentication'],
            'args' => [
                'estado' => [
                    'required' => false,
                    'default' => 'todos',
                    'enum' => ['activo', 'completado', 'pausado', 'todos'],
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ]);

        register_rest_route(self::API_NAMESPACE, '/ai/proyectos/(?P<id>\d+)', [
            'methods' => \WP_REST_Server::READABLE,
            'callback' => [self::class, 'obtenerProyecto'],
            'permission_callback' => [self::class, 'requireAuthentication'],
            'args' => [
                'filtro' => [
                    'required' => false,
                    'default' => 'todas',
                    'enum' => ['pendientes', 'completadas', 'todas'],
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ]);

        /* 
        * Endpoints de Hábitos 
        */
        register_rest_route(self::API_NAMESPACE, '/ai/habitos', [
            'methods' => \WP_REST_Server::READABLE,
            'callback' => [self::class, 'obtenerHabitos'],
            'permission_callback' => [self::class, 'requireAuthentication'],
            'args' => [
                'importancia' => [
                    'required' => false,
                    'enum' => ['Alta', 'Media', 'Baja'],
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ]);

        /* 
        * Endpoint de Resumen 
        */
        register_rest_route(self::API_NAMESPACE, '/ai/resumen', [
            'methods' => \WP_REST_Server::READABLE,
            'callback' => [self::class, 'obtenerResumen'],
            'permission_callback' => [self::class, 'requireAuthentication'],
        ]);
    }

    /* 
    * Argumentos de validación
    */
    private static function getCrearTareaArgs(): array
    {
        return [
            'texto' => [
                'required' => true,
                'validate_callback' => fn($param) => is_string($param) && strlen($param) > 0,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'proyectoId' => [
                'required' => false,
                'validate_callback' => fn($param) => is_numeric($param),
                'sanitize_callback' => 'absint',
            ],
            'prioridad' => [
                'required' => false,
                'enum' => ['Alta', 'Media', 'Baja', null],
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'urgencia' => [
                'required' => false,
                'default' => 'normal',
                'enum' => ['bloqueante', 'urgente', 'normal', 'chill'],
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'fechaMaxima' => [
                'required' => false,
                'validate_callback' => fn($param) => is_string($param),
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ];
    }

    private static function getEditarTareaArgs(): array
    {
        return [
            'texto' => [
                'required' => false,
                'validate_callback' => fn($param) => is_string($param),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'prioridad' => [
                'required' => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'urgencia' => [
                'required' => false,
                'enum' => ['bloqueante', 'urgente', 'normal', 'chill'],
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'fechaMaxima' => [
                'required' => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'proyectoId' => [
                'required' => false,
                'validate_callback' => fn($param) => is_numeric($param) || $param === null,
            ],
        ];
    }

    public static function requireAuthentication(): bool
    {
        return is_user_logged_in();
    }

    /* 
    *
    * TAREAS
    *
    */

    /**
     * Lista las tareas del usuario con filtros opcionales
     */
    public static function obtenerTareas(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $filtro = $request->get_param('filtro');
        $proyectoId = $request->get_param('proyectoId') ?? $request->get_param('proyecto_id') ?? $request->get_param('proyecto');
        
        /* Soporte para parámetro completado como alias de filtro */
        $completado = $request->get_param('completado');
        if ($completado !== null && $filtro === 'todas') {
            $filtro = filter_var($completado, FILTER_VALIDATE_BOOLEAN) ? 'completadas' : 'pendientes';
        }

        try {
            $repository = new TareasRepository($userId);
            $tareas = $repository->getAll();

            /* Aplicar filtro por estado */
            if ($filtro === 'pendientes') {
                $tareas = array_filter($tareas, fn($t) => empty($t['completado']));
            } elseif ($filtro === 'completadas') {
                $tareas = array_filter($tareas, fn($t) => !empty($t['completado']));
            }

            /* Aplicar filtro por proyecto */
            if ($proyectoId !== null) {
                $tareas = array_filter($tareas, fn($t) => ($t['proyectoId'] ?? null) === (int)$proyectoId);
            }

            $tareas = array_values($tareas);

            return self::respuestaExitosa([
                'tareas' => $tareas,
                'total' => count($tareas),
                'filtro' => $filtro,
            ]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al obtener tareas: ' . $e->getMessage(), 'tareas_error');
        }
    }

    /**
     * Obtiene una tarea específica por ID
     */
    public static function obtenerTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tareaId = (int) $request->get_param('id');

        try {
            $repository = new TareasRepository($userId);
            $tareas = $repository->getAll();

            $tarea = array_values(array_filter($tareas, fn($t) => ($t['id'] ?? 0) === $tareaId));

            if (empty($tarea)) {
                return self::respuestaError('Tarea no encontrada', 'tarea_no_encontrada', 404);
            }

            return self::respuestaExitosa(['tarea' => $tarea[0]]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al obtener tarea: ' . $e->getMessage(), 'tarea_error');
        }
    }

    /**
     * Crea una nueva tarea
     */
    public static function crearTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();

        try {
            $repository = new TareasRepository($userId);
            $tareasExistentes = $repository->getAll();

            /* Generar nuevo ID único */
            $maxId = 0;
            foreach ($tareasExistentes as $tarea) {
                if (isset($tarea['id']) && $tarea['id'] > $maxId) {
                    $maxId = $tarea['id'];
                }
            }
            $nuevoId = $maxId + 1;

            $nuevaTarea = [
                'id' => $nuevoId,
                'texto' => $request->get_param('texto'),
                'completado' => false,
                'proyectoId' => $request->get_param('proyectoId'),
                'prioridad' => $request->get_param('prioridad'),
                'urgencia' => $request->get_param('urgencia') ?? 'normal',
                'fechaMaxima' => $request->get_param('fechaMaxima'),
                'fechaCreacion' => current_time('c'),
            ];

            /* Agregar la nueva tarea */
            $tareasExistentes[] = $nuevaTarea;
            $repository->saveAll($tareasExistentes);

            return self::respuestaExitosa([
                'mensaje' => 'Tarea creada exitosamente',
                'tarea' => $nuevaTarea,
            ], 201);
        } catch (\Exception $e) {
            return self::respuestaError('Error al crear tarea: ' . $e->getMessage(), 'crear_tarea_error');
        }
    }

    /**
     * Edita una tarea existente
     */
    public static function editarTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tareaId = (int) $request->get_param('id');

        try {
            $repository = new TareasRepository($userId);
            $tareas = $repository->getAll();

            $indice = null;
            foreach ($tareas as $i => $tarea) {
                if (($tarea['id'] ?? 0) === $tareaId) {
                    $indice = $i;
                    break;
                }
            }

            if ($indice === null) {
                return self::respuestaError('Tarea no encontrada', 'tarea_no_encontrada', 404);
            }

            /* Actualizar solo los campos proporcionados */
            $camposEditables = ['texto', 'prioridad', 'urgencia', 'fechaMaxima', 'proyectoId'];
            foreach ($camposEditables as $campo) {
                $valor = $request->get_param($campo);
                if ($valor !== null) {
                    $tareas[$indice][$campo] = $valor;
                }
            }

            $repository->saveAll($tareas);

            return self::respuestaExitosa([
                'mensaje' => 'Tarea actualizada exitosamente',
                'tarea' => $tareas[$indice],
            ]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al editar tarea: ' . $e->getMessage(), 'editar_tarea_error');
        }
    }

    /**
     * Toggle completado de una tarea
     */
    public static function completarTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tareaId = (int) $request->get_param('id');

        try {
            $repository = new TareasRepository($userId);
            $actividadRepo = new \App\Repository\ActividadRepository($userId);
            $tareas = $repository->getAll();

            $indice = null;
            foreach ($tareas as $i => $tarea) {
                if (($tarea['id'] ?? 0) === $tareaId) {
                    $indice = $i;
                    break;
                }
            }

            if ($indice === null) {
                return self::respuestaError('Tarea no encontrada', 'tarea_no_encontrada', 404);
            }

            /* Toggle completado */
            $estabaCompletada = !empty($tareas[$indice]['completado']);
            $tareas[$indice]['completado'] = !$estabaCompletada;
            $proyectoId = $tareas[$indice]['proyectoId'] ?? null;

            if (!$estabaCompletada) {
                // Marcar como completada
                $tareas[$indice]['fechaCompletado'] = current_time('c');

                // Registrar actividad
                $actividadRepo->registrar(
                    'tarea_completada',
                    $tareaId,
                    'tarea',
                    $proyectoId,
                    current_time('Y-m-d'),
                    ['texto' => $tareas[$indice]['texto']]
                );
            } else {
                // Marcar como pendiente (desmarcar)
                // Intentar obtener la fecha de completado original para eliminar la actividad correcta
                $fechaCompletado = isset($tareas[$indice]['fechaCompletado'])
                    ? date('Y-m-d', strtotime($tareas[$indice]['fechaCompletado']))
                    : current_time('Y-m-d'); // Fallback a hoy si no existe

                $actividadRepo->eliminarPorTarea($tareaId, $fechaCompletado);

                unset($tareas[$indice]['fechaCompletado']);
            }

            $repository->saveAll($tareas);

            return self::respuestaExitosa([
                'mensaje' => $tareas[$indice]['completado'] ? 'Tarea completada' : 'Tarea marcada como pendiente',
                'tarea' => $tareas[$indice],
                'completado' => $tareas[$indice]['completado'],
            ]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al completar tarea: ' . $e->getMessage(), 'completar_tarea_error');
        }
    }

    /**
     * Elimina una tarea (soft delete)
     */
    public static function eliminarTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tareaId = (int) $request->get_param('id');

        try {
            $repository = new TareasRepository($userId);
            $tareas = $repository->getAll();

            $tareasOriginales = count($tareas);
            $tareas = array_values(array_filter($tareas, fn($t) => ($t['id'] ?? 0) !== $tareaId));

            if (count($tareas) === $tareasOriginales) {
                return self::respuestaError('Tarea no encontrada', 'tarea_no_encontrada', 404);
            }

            $repository->saveAll($tareas);

            return self::respuestaExitosa([
                'mensaje' => 'Tarea eliminada exitosamente',
                'tareaId' => $tareaId,
            ]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al eliminar tarea: ' . $e->getMessage(), 'eliminar_tarea_error');
        }
    }

    /* 
    *
    * PROYECTOS
    *
    */

    /**
     * Lista los proyectos con filtro opcional por estado
     */
    public static function obtenerProyectos(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $estado = $request->get_param('estado');

        try {
            $repository = new ProyectosRepository($userId);
            $proyectos = $repository->getAll();

            /* Aplicar filtro por estado */
            if ($estado !== 'todos' && $estado !== null) {
                $proyectos = array_filter($proyectos, fn($p) => ($p['estado'] ?? 'activo') === $estado);
            }

            $proyectos = array_values($proyectos);

            return self::respuestaExitosa([
                'proyectos' => $proyectos,
                'total' => count($proyectos),
                'filtro' => $estado,
            ]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al obtener proyectos: ' . $e->getMessage(), 'proyectos_error');
        }
    }

    /**
     * Obtiene un proyecto específico por ID
     */
    public static function obtenerProyecto(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $proyectoId = (int) $request->get_param('id');

        try {
            $proyectosRepo = new ProyectosRepository($userId);
            $tareasRepo = new TareasRepository($userId);

            $proyectos = $proyectosRepo->getAll();
            $proyecto = array_values(array_filter($proyectos, fn($p) => ($p['id'] ?? 0) === $proyectoId));

            if (empty($proyecto)) {
                return self::respuestaError('Proyecto no encontrado', 'proyecto_no_encontrado', 404);
            }

            /* Obtener tareas del proyecto */
            $todasTareas = $tareasRepo->getAll();
            $tareasProyecto = array_values(array_filter($todasTareas, fn($t) => ($t['proyectoId'] ?? null) === $proyectoId));

            // Calcular contadores antes de filtrar para la respuesta
            $pendientes = count(array_filter($tareasProyecto, fn($t) => empty($t['completado'])));
            $completadas = count($tareasProyecto) - $pendientes;

            /* Aplicar filtro solicitado a la lista devuelta */
            $filtro = $request->get_param('filtro');
            if ($filtro === 'pendientes') {
                $tareasProyecto = array_filter($tareasProyecto, fn($t) => empty($t['completado']));
            } elseif ($filtro === 'completadas') {
                $tareasProyecto = array_filter($tareasProyecto, fn($t) => !empty($t['completado']));
            }
            $tareasProyecto = array_values($tareasProyecto);

            return self::respuestaExitosa([
                'proyecto' => $proyecto[0],
                'tareas' => [
                    'lista' => $tareasProyecto,
                    'total' => count($tareasProyecto),
                    'pendientes' => $pendientes,
                    'completadas' => $completadas,
                ],
            ]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al obtener proyecto: ' . $e->getMessage(), 'proyecto_error');
        }
    }

    /* 
    *
    * HÁBITOS
    *
    */

    /**
     * Lista los hábitos con filtro opcional por importancia
     */
    public static function obtenerHabitos(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $importancia = $request->get_param('importancia');

        try {
            $repository = new HabitosRepository($userId);
            $habitos = $repository->getAll();

            /* Aplicar filtro por importancia */
            if ($importancia !== null) {
                $habitos = array_filter($habitos, fn($h) => ($h['importancia'] ?? 'Media') === $importancia);
            }

            /* Agregar información de completado de hoy */
            $hoy = date('Y-m-d');
            foreach ($habitos as &$habito) {
                $habito['completadoHoy'] = ($habito['ultimoCompletado'] ?? '') === $hoy;
            }

            $habitos = array_values($habitos);

            $completadosHoy = count(array_filter($habitos, fn($h) => $h['completadoHoy']));

            return self::respuestaExitosa([
                'habitos' => $habitos,
                'total' => count($habitos),
                'completadosHoy' => $completadosHoy,
                'pendientesHoy' => count($habitos) - $completadosHoy,
            ]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al obtener hábitos: ' . $e->getMessage(), 'habitos_error');
        }
    }

    /* 
    *
    * RESUMEN
    *
    */

    /**
     * Obtiene un resumen estadístico del dashboard
     */
    public static function obtenerResumen(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();

        try {
            $tareasRepo = new TareasRepository($userId);
            $proyectosRepo = new ProyectosRepository($userId);
            $habitosRepo = new HabitosRepository($userId);

            $tareas = $tareasRepo->getAll();
            $proyectos = $proyectosRepo->getAll();
            $habitos = $habitosRepo->getAll();

            /* Estadísticas de tareas */
            $tareasPendientes = array_filter($tareas, fn($t) => empty($t['completado']));
            $tareasCompletadas = array_filter($tareas, fn($t) => !empty($t['completado']));
            $tareasUrgentes = array_filter($tareasPendientes, fn($t) => in_array($t['urgencia'] ?? 'normal', ['urgente', 'bloqueante']));

            /* Estadísticas de proyectos */
            $proyectosActivos = array_filter($proyectos, fn($p) => ($p['estado'] ?? 'activo') === 'activo');

            /* Estadísticas de hábitos */
            $hoy = date('Y-m-d');
            $habitosCompletadosHoy = array_filter($habitos, fn($h) => ($h['ultimoCompletado'] ?? '') === $hoy);

            return self::respuestaExitosa([
                'tareas' => [
                    'total' => count($tareas),
                    'pendientes' => count($tareasPendientes),
                    'completadas' => count($tareasCompletadas),
                    'urgentes' => count($tareasUrgentes),
                ],
                'proyectos' => [
                    'total' => count($proyectos),
                    'activos' => count($proyectosActivos),
                ],
                'habitos' => [
                    'total' => count($habitos),
                    'completadosHoy' => count($habitosCompletadosHoy),
                    'pendientesHoy' => count($habitos) - count($habitosCompletadosHoy),
                ],
                'fecha' => current_time('Y-m-d'),
                'horaLocal' => current_time('H:i'),
            ]);
        } catch (\Exception $e) {
            return self::respuestaError('Error al obtener resumen: ' . $e->getMessage(), 'resumen_error');
        }
    }

    /* 
    *
    * Helpers de respuesta
    *
    */

    private static function respuestaExitosa(array $data, int $statusCode = 200): \WP_REST_Response
    {
        return new \WP_REST_Response([
            'success' => true,
            'data' => $data,
            'meta' => [
                'userId' => get_current_user_id(),
                'timestamp' => current_time('c'),
            ],
        ], $statusCode);
    }

    private static function respuestaError(string $mensaje, string $codigo, int $statusCode = 500): \WP_REST_Response
    {
        return new \WP_REST_Response([
            'success' => false,
            'error' => [
                'code' => $codigo,
                'message' => $mensaje,
            ],
        ], $statusCode);
    }
}

AIApiController::register();

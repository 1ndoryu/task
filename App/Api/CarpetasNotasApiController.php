<?php

/**
 * Carpetas Notas API Controller
 *
 * Maneja los endpoints REST para carpetas del sistema de notas
 *
 * Endpoints:
 * - GET /wp-json/glory/v1/notas/carpetas -> Listar carpetas
 * - POST /wp-json/glory/v1/notas/carpetas -> Crear carpeta
 * - PUT /wp-json/glory/v1/notas/carpetas/{id} -> Renombrar carpeta
 * - DELETE /wp-json/glory/v1/notas/carpetas/{id} -> Eliminar carpeta
 * - PUT /wp-json/glory/v1/notas/{id}/mover -> Mover nota a carpeta
 *
 * @package App\Api
 */

namespace App\Api;

use App\Repository\CarpetasNotasRepository;
use App\Repository\NotasRepository;

class CarpetasNotasApiController
{
    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registrarRutas']);
    }

    public static function registrarRutas(): void
    {
        /* Listar carpetas */
        register_rest_route('glory/v1', '/notas/carpetas', [
            'methods' => 'GET',
            'callback' => [self::class, 'listarCarpetas'],
            'permission_callback' => [self::class, 'verificarPermisos']
        ]);

        /* Crear carpeta */
        register_rest_route('glory/v1', '/notas/carpetas', [
            'methods' => 'POST',
            'callback' => [self::class, 'crearCarpeta'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'nombre' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
        ]);

        /* Renombrar carpeta */
        register_rest_route('glory/v1', '/notas/carpetas/(?P<id>\d+)', [
            'methods' => 'PUT',
            'callback' => [self::class, 'renombrarCarpeta'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'nombre' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
        ]);

        /* Eliminar carpeta */
        register_rest_route('glory/v1', '/notas/carpetas/(?P<id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [self::class, 'eliminarCarpeta'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ]
            ]
        ]);

        /* Mover nota a carpeta */
        register_rest_route('glory/v1', '/notas/(?P<id>\d+)/mover', [
            'methods' => 'PUT',
            'callback' => [self::class, 'moverNota'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'carpetaId' => [
                    'required' => false,
                    'type' => ['integer', 'null'],
                    'default' => null
                ]
            ]
        ]);
    }

    /**
     * Verifica que el usuario esté autenticado
     */
    public static function verificarPermisos(): bool
    {
        return is_user_logged_in();
    }

    /**
     * Lista las carpetas del usuario con conteo de notas
     */
    public static function listarCarpetas(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new CarpetasNotasRepository($userId);

            $carpetas = $repo->listar();

            return new \WP_REST_Response([
                'success' => true,
                'carpetas' => $carpetas
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crea una nueva carpeta
     */
    public static function crearCarpeta(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new CarpetasNotasRepository($userId);

            $nombre = $request->get_param('nombre');

            if (empty(trim($nombre))) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'El nombre no puede estar vacío'
                ], 400);
            }

            $carpeta = $repo->crear($nombre);

            if (!$carpeta) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al crear la carpeta'
                ], 500);
            }

            return new \WP_REST_Response([
                'success' => true,
                'carpeta' => $carpeta
            ], 201);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Renombra una carpeta existente
     */
    public static function renombrarCarpeta(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new CarpetasNotasRepository($userId);

            $id = (int)$request->get_param('id');
            $nombre = $request->get_param('nombre');

            if (empty(trim($nombre))) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'El nombre no puede estar vacío'
                ], 400);
            }

            $resultado = $repo->renombrar($id, $nombre);

            if (!$resultado) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al renombrar la carpeta'
                ], 500);
            }

            return new \WP_REST_Response([
                'success' => true
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Elimina una carpeta y mueve sus notas a General
     */
    public static function eliminarCarpeta(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new CarpetasNotasRepository($userId);

            $id = (int)$request->get_param('id');
            $resultado = $repo->eliminar($id);

            if (!$resultado) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al eliminar la carpeta'
                ], 500);
            }

            return new \WP_REST_Response([
                'success' => true
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mueve una nota a una carpeta específica
     */
    public static function moverNota(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new NotasRepository($userId);

            $notaId = (int)$request->get_param('id');
            $carpetaId = $request->get_param('carpetaId');
            
            /* Convertir 0 o "null" a null real */
            if ($carpetaId === 0 || $carpetaId === '0' || $carpetaId === 'null') {
                $carpetaId = null;
            } elseif ($carpetaId !== null) {
                $carpetaId = (int)$carpetaId;
            }

            $resultado = $repo->moverACarpeta($notaId, $carpetaId);

            if (!$resultado) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al mover la nota'
                ], 500);
            }

            return new \WP_REST_Response([
                'success' => true
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

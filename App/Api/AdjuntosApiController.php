<?php

/**
 * API Controller para Adjuntos
 *
 * Maneja los endpoints REST para subida, descarga y gestión de archivos adjuntos.
 * Delega toda la lógica de negocio a AdjuntosService.
 *
 * Endpoints:
 * - POST   /glory/v1/adjuntos            - Subir archivo
 * - GET    /glory/v1/adjuntos/{id}       - Descargar archivo (con token para cifrados)
 * - DELETE /glory/v1/adjuntos/{id}       - Eliminar archivo
 * - GET    /glory/v1/adjuntos            - Listar archivos del usuario
 * - POST   /glory/v1/adjuntos/verificar  - Verificar espacio
 *
 * @package App\Api
 */

namespace App\Api;

use App\Services\AdjuntosService;
use App\Services\AlmacenamientoService;

class AdjuntosApiController
{
    /**
     * Registra el controlador
     */
    public static function register(): void
    {
        add_action('rest_api_init', [new self(), 'registrarRutas']);
    }

    /**
     * Registra las rutas REST
     */
    public function registrarRutas(): void
    {
        $ns = 'glory/v1';

        register_rest_route($ns, '/adjuntos', [
            'methods' => 'POST',
            'callback' => [$this, 'subirArchivo'],
            'permission_callback' => [$this, 'verificarAutenticacion']
        ]);

        register_rest_route($ns, '/adjuntos', [
            'methods' => 'GET',
            'callback' => [$this, 'listarArchivos'],
            'permission_callback' => [$this, 'verificarAutenticacion']
        ]);

        register_rest_route($ns, '/adjuntos/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'descargarArchivo'],
            'permission_callback' => [$this, 'verificarAccesoArchivo'],
            'args' => self::argsDescarga()
        ]);

        register_rest_route($ns, '/adjuntos/(?P<id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'eliminarArchivo'],
            'permission_callback' => [$this, 'verificarAutenticacion'],
            'args' => [
                'id'   => ['required' => true, 'type' => 'integer', 'sanitize_callback' => 'absint'],
                'file' => ['required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_file_name']
            ]
        ]);

        register_rest_route($ns, '/adjuntos/verificar', [
            'methods' => 'POST',
            'callback' => [$this, 'verificarEspacio'],
            'permission_callback' => [$this, 'verificarAutenticacion'],
            'args' => ['tamano' => ['required' => true, 'type' => 'integer', 'sanitize_callback' => 'absint']]
        ]);
    }

    private static function argsDescarga(): array
    {
        return [
            'id'    => ['required' => true, 'type' => 'integer', 'sanitize_callback' => 'absint'],
            'file'  => ['required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_file_name'],
            'token' => ['required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field'],
            'exp'   => ['required' => false, 'type' => 'integer', 'sanitize_callback' => 'absint'],
            'uid'   => ['required' => false, 'type' => 'integer', 'sanitize_callback' => 'absint']
        ];
    }

    /* ---------------------------------------------------------------
     * Permisos
     * --------------------------------------------------------------- */

    public function verificarAutenticacion(): bool
    {
        return is_user_logged_in();
    }

    /**
     * Verifica acceso a archivo: autenticación normal O token válido
     */
    public function verificarAccesoArchivo(\WP_REST_Request $request): bool
    {
        if (is_user_logged_in()) {
            return true;
        }

        $token = $request->get_param('token');
        $exp = $request->get_param('exp');
        $userId = $request->get_param('uid');
        $file = $request->get_param('file');

        if (empty($token) || empty($exp) || empty($userId) || empty($file)) {
            return false;
        }

        if (time() > $exp) {
            return false;
        }

        $tokenEsperado = AdjuntosService::generarToken($userId, $file, $exp);

        return hash_equals($tokenEsperado, $token);
    }

    /* ---------------------------------------------------------------
     * Callbacks — delegan a AdjuntosService
     * --------------------------------------------------------------- */

    public function subirArchivo(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $files = $request->get_file_params();

            if (empty($files) || !isset($files['archivo'])) {
                return new \WP_REST_Response(['success' => false, 'error' => 'No se recibió ningún archivo', 'code' => 'no_file'], 400);
            }

            $archivo = $files['archivo'];

            if ($archivo['error'] !== UPLOAD_ERR_OK) {
                $mensaje = AdjuntosService::traducirErrorSubida($archivo['error']);
                return new \WP_REST_Response(['success' => false, 'error' => $mensaje, 'code' => 'upload_error'], 400);
            }

            $almacenamiento = new AlmacenamientoService($userId);
            if (!$almacenamiento->puedeSubir($archivo['size'])) {
                return new \WP_REST_Response(['success' => false, 'error' => 'Límite de almacenamiento excedido', 'code' => 'storage_limit', 'almacenamiento' => $almacenamiento->getInfoCompleta()], 403);
            }

            $adjuntosService = new AdjuntosService($userId);
            $resultado = $adjuntosService->subirArchivo($archivo);

            if ($resultado === null) {
                return new \WP_REST_Response(['success' => false, 'error' => 'Error al procesar el archivo', 'code' => 'processing_error'], 500);
            }

            return new \WP_REST_Response(['success' => true, 'adjunto' => $resultado, 'almacenamiento' => $almacenamiento->getInfoCompleta()], 201);
        } catch (\Throwable $e) {
            error_log('[AdjuntosApiController] Error en subirArchivo: ' . $e->getMessage());
            return new \WP_REST_Response(['success' => false, 'error' => 'Error interno del servidor'], 500);
        }
    }

    public function descargarArchivo(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = is_user_logged_in() ? get_current_user_id() : $request->get_param('uid');
            $nombreArchivo = $request->get_param('file');

            if (empty($nombreArchivo) || empty($userId)) {
                return new \WP_REST_Response(['success' => false, 'error' => 'Parámetros requeridos faltantes', 'code' => 'missing_params'], 400);
            }

            $adjuntosService = new AdjuntosService($userId);
            $contenido = $adjuntosService->obtenerArchivo($nombreArchivo);

            if ($contenido === null) {
                return new \WP_REST_Response(['success' => false, 'error' => 'Archivo no encontrado', 'code' => 'not_found'], 404);
            }

            $info = $adjuntosService->obtenerInfoArchivo($nombreArchivo);
            $mimeType = $info['mimeType'] ?? 'application/octet-stream';

            if ($info['cifrado']) {
                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $mimeType = $finfo->buffer($contenido) ?: 'application/octet-stream';
            }

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . strlen($contenido));
            header('Cache-Control: private, max-age=3600');
            echo $contenido;
            exit;
        } catch (\Throwable $e) {
            error_log('[AdjuntosApiController] Error en descargarArchivo: ' . $e->getMessage());
            return new \WP_REST_Response(['success' => false, 'error' => 'Error interno del servidor'], 500);
        }
    }

    public function eliminarArchivo(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $nombreArchivo = $request->get_param('file');

            if (empty($nombreArchivo)) {
                return new \WP_REST_Response(['success' => false, 'error' => 'Nombre de archivo requerido', 'code' => 'missing_filename'], 400);
            }

            $adjuntosService = new AdjuntosService($userId);
            $eliminado = $adjuntosService->eliminarArchivo($nombreArchivo);

            if (!$eliminado) {
                return new \WP_REST_Response(['success' => false, 'error' => 'No se pudo eliminar el archivo', 'code' => 'delete_failed'], 500);
            }

            $almacenamiento = new AlmacenamientoService($userId);

            return new \WP_REST_Response(['success' => true, 'message' => 'Archivo eliminado correctamente', 'almacenamiento' => $almacenamiento->getInfoCompleta()]);
        } catch (\Throwable $e) {
            error_log('[AdjuntosApiController] Error en eliminarArchivo: ' . $e->getMessage());
            return new \WP_REST_Response(['success' => false, 'error' => 'Error interno del servidor'], 500);
        }
    }

    public function listarArchivos(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $adjuntosService = new AdjuntosService($userId);
            $archivos = $adjuntosService->listarArchivos();

            return new \WP_REST_Response(['success' => true, 'archivos' => $archivos, 'total' => count($archivos)]);
        } catch (\Throwable $e) {
            error_log('[AdjuntosApiController] Error en listarArchivos: ' . $e->getMessage());
            return new \WP_REST_Response(['success' => false, 'error' => 'Error interno del servidor'], 500);
        }
    }

    public function verificarEspacio(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $tamano = $request->get_param('tamano');
            $almacenamiento = new AlmacenamientoService($userId);

            return new \WP_REST_Response(['success' => true, 'puedeSubir' => $almacenamiento->puedeSubir($tamano), 'almacenamiento' => $almacenamiento->getInfoCompleta()]);
        } catch (\Throwable $e) {
            error_log('[AdjuntosApiController] Error en verificarEspacio: ' . $e->getMessage());
            return new \WP_REST_Response(['success' => false, 'error' => 'Error interno del servidor'], 500);
        }
    }
}

/* Registrar el controlador automáticamente */
AdjuntosApiController::register();

<?php

/**
 * Servicio de Tokens para Adjuntos
 *
 * Genera y valida tokens HMAC para acceso seguro a archivos adjuntos.
 * Los tokens permiten descarga temporal sin autenticación de sesión,
 * útil para archivos cifrados que se sirven por URL directa.
 *
 * @package App\Services
 */

namespace App\Services;

class AdjuntosTokenService
{
    /* Tiempo de expiración del token: 1 hora */
    public const TOKEN_EXPIRACION = 3600;

    /**
     * Genera un token HMAC firmado para acceso a archivo
     */
    public static function generarToken(int $userId, string $file, int $exp): string
    {
        try {
            $clave = self::obtenerClaveToken();
            $datos = "{$userId}:{$file}:{$exp}";

            return hash_hmac('sha256', $datos, $clave);
        } catch (\Throwable $e) {
            error_log('[AdjuntosTokenService] Error en generarToken: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Genera URL con token temporal para descarga de archivo cifrado
     */
    public static function generarUrlConToken(int $adjuntoId, int $userId, string $nombreArchivo): string
    {
        try {
            $exp = time() + self::TOKEN_EXPIRACION;
            $token = self::generarToken($userId, $nombreArchivo, $exp);

            $url = rest_url("glory/v1/adjuntos/{$adjuntoId}");
            $url .= "?file=" . urlencode($nombreArchivo);
            $url .= "&uid=" . $userId;
            $url .= "&exp=" . $exp;
            $url .= "&token=" . $token;

            return $url;
        } catch (\Throwable $e) {
            error_log('[AdjuntosTokenService] Error en generarUrlConToken: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Obtiene la clave para firmar tokens de descarga
     */
    private static function obtenerClaveToken(): string
    {
        if (defined('AUTH_KEY') && strlen(AUTH_KEY) >= 32) {
            return AUTH_KEY . '_adjuntos_token';
        }

        if (defined('SECURE_AUTH_KEY') && strlen(SECURE_AUTH_KEY) >= 32) {
            return SECURE_AUTH_KEY . '_adjuntos_token';
        }

        error_log('[AdjuntosTokenService] CRITICO: AUTH_KEY no configurada.');
        throw new \RuntimeException('Configuración de seguridad incompleta para tokens de descarga');
    }

    /**
     * Traduce códigos de error de subida a mensajes legibles
     */
    public static function traducirErrorSubida(int $codigo): string
    {
        $errores = [
            UPLOAD_ERR_INI_SIZE => 'El archivo excede el límite del servidor',
            UPLOAD_ERR_FORM_SIZE => 'El archivo excede el límite del formulario',
            UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
            UPLOAD_ERR_NO_FILE => 'No se recibió ningún archivo',
            UPLOAD_ERR_NO_TMP_DIR => 'Falta directorio temporal del servidor',
            UPLOAD_ERR_CANT_WRITE => 'Error al escribir archivo en disco',
            UPLOAD_ERR_EXTENSION => 'Subida bloqueada por extensión'
        ];

        return $errores[$codigo] ?? 'Error desconocido en la subida';
    }
}

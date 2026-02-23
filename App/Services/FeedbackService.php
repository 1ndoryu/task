<?php

/**
 * Servicio de Feedback
 *
 * Centraliza toda la lógica de acceso a datos para el sistema de feedback.
 * Extraído de FeedbackApiController para cumplir con separación de responsabilidades.
 *
 * @package App\Services
 */

namespace App\Services;

use App\Database\Schema;

class FeedbackService
{
    private const LIMITE_DIARIO = 3;

    /**
     * Inserta un nuevo feedback en la base de datos
     *
     * @return int|false ID del feedback insertado o false en caso de error
     */
    public function crear(int $userId, string $tipo, string $mensaje): int|false
    {
        global $wpdb;

        Schema::ensureTableExists('feedback');

        $table = Schema::getTableName('feedback');
        $usuario = get_userdata($userId);

        $resultado = $wpdb->insert(
            $table,
            [
                'user_id' => $userId,
                'usuario_nombre' => $usuario ? $usuario->display_name : 'Usuario',
                'usuario_email' => $usuario ? $usuario->user_email : '',
                'tipo' => $tipo,
                'mensaje' => $mensaje,
                'leido' => 0,
                'fecha_creacion' => current_time('mysql')
            ],
            ['%d', '%s', '%s', '%s', '%s', '%d', '%s']
        );

        if (!$resultado) {
            return false;
        }

        return $wpdb->insert_id;
    }

    /**
     * Lista feedbacks con paginación y filtro de no leídos
     *
     * @return array{feedbacks: array, total: int, noLeidos: int}
     */
    public function listar(int $pagina, int $porPagina, bool $soloNoLeidos): array
    {
        global $wpdb;

        Schema::ensureTableExists('feedback');

        $table = Schema::getTableName('feedback');
        $offset = ($pagina - 1) * $porPagina;

        if ($soloNoLeidos) {
            $total = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE leido = %d",
                0
            ));
            $feedbacks = $wpdb->get_results($wpdb->prepare(
                "SELECT id, user_id, usuario_nombre, usuario_email, tipo, mensaje, leido, fecha_creacion
                 FROM {$table} WHERE leido = %d ORDER BY fecha_creacion DESC LIMIT %d OFFSET %d",
                0,
                $porPagina,
                $offset
            ), ARRAY_A);
        } else {
            $total = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE %d = %d",
                1, 1
            ));
            $feedbacks = $wpdb->get_results($wpdb->prepare(
                "SELECT id, user_id, usuario_nombre, usuario_email, tipo, mensaje, leido, fecha_creacion
                 FROM {$table} ORDER BY fecha_creacion DESC LIMIT %d OFFSET %d",
                $porPagina,
                $offset
            ), ARRAY_A);
        }

        $noLeidos = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table} WHERE leido = %d",
            0
        ));

        return [
            'feedbacks' => $feedbacks ?: [],
            'total' => $total,
            'noLeidos' => $noLeidos,
        ];
    }

    /**
     * Marca un feedback como leído
     */
    public function marcarLeido(int $id): bool
    {
        global $wpdb;

        $table = Schema::getTableName('feedback');

        $resultado = $wpdb->update(
            $table,
            ['leido' => 1],
            ['id' => $id],
            ['%d'],
            ['%d']
        );

        return $resultado !== false;
    }

    /**
     * Calcula cuántos comentarios le quedan al usuario hoy
     */
    public function obtenerComentariosRestantes(int $userId): int
    {
        global $wpdb;

        if (!Schema::tableExists('feedback')) {
            return self::LIMITE_DIARIO;
        }

        $table = Schema::getTableName('feedback');
        $hoy = current_time('Y-m-d');

        $enviados = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table} WHERE user_id = %d AND DATE(fecha_creacion) = %s",
            $userId,
            $hoy
        ));

        return max(0, self::LIMITE_DIARIO - $enviados);
    }

    /**
     * Obtiene el límite diario de feedback
     */
    public function getLimiteDiario(): int
    {
        return self::LIMITE_DIARIO;
    }
}

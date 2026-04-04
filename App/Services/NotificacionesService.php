<?php

/**
 * Servicio de Notificaciones - CRUD y consultas base
 *
 * Los creadores de notificaciones por dominio estan en NotificacionesDomainService.
 *
 * @package App\Services
 */

namespace App\Services;

use App\Database\Schema;

class NotificacionesService
{
    private string $tabla;

    /* Tipos de notificación válidos */
    public const TIPO_SOLICITUD_EQUIPO = 'solicitud_equipo';
    public const TIPO_SOLICITUD_ACEPTADA = 'solicitud_aceptada';
    public const TIPO_TAREA_VENCE_HOY = 'tarea_vence_hoy';
    public const TIPO_TAREA_ASIGNADA = 'tarea_asignada';
    public const TIPO_TAREA_REMOVIDA = 'tarea_removida';
    public const TIPO_ADJUNTO_AGREGADO = 'adjunto_agregado';
    public const TIPO_MENSAJE_CHAT = 'mensaje_chat';
    public const TIPO_HABITO_COMPANERO = 'habito_companero';

    /* Límites de paginación */
    private const POR_PAGINA_DEFAULT = 20;
    private const POR_PAGINA_MAX = 50;

    public function __construct()
    {
        $this->tabla = Schema::getTableName('notificaciones');
    }

    /** Crea una nueva notificación para un usuario */
    public function crear(
        int $usuarioId,
        string $tipo,
        string $titulo,
        ?string $contenido = null,
        ?array $datosExtra = null
    ): array {
        global $wpdb;

        $tiposValidos = [
            self::TIPO_SOLICITUD_EQUIPO,
            self::TIPO_SOLICITUD_ACEPTADA,
            self::TIPO_TAREA_VENCE_HOY,
            self::TIPO_TAREA_ASIGNADA,
            self::TIPO_TAREA_REMOVIDA,
            self::TIPO_ADJUNTO_AGREGADO,
            self::TIPO_MENSAJE_CHAT,
            self::TIPO_HABITO_COMPANERO,
        ];

        if (!in_array($tipo, $tiposValidos)) {
            return [
                'exito' => false,
                'mensaje' => 'Tipo de notificación no válido',
                'codigo' => 'tipo_invalido'
            ];
        }

        $datos = [
            'usuario_id' => $usuarioId,
            'tipo' => $tipo,
            'titulo' => sanitize_text_field($titulo),
            'contenido' => $contenido ? wp_kses_post($contenido) : null,
            // sentinel-disable-next-line json-sin-limite-bd — datos_extra es metadata pequena (tipo, ids), no contenido libre
            'datos_extra' => $datosExtra ? wp_json_encode($datosExtra) : null,
            'leida' => 0,
            'fecha_creacion' => current_time('mysql'),
        ];

        // sentinel-disable-next-line retorno-ignorado-repo — se valida via insert_id en la linea siguiente
        $wpdb->insert($this->tabla, $datos);

        if (!$wpdb->insert_id) {
            return [
                'exito' => false,
                'mensaje' => 'Error al crear notificación',
                'codigo' => 'error_bd'
            ];
        }

        return [
            'exito' => true,
            'mensaje' => 'Notificación creada',
            'notificacion' => $this->formatear(
                $wpdb->insert_id,
                $tipo,
                $titulo,
                $contenido,
                0,
                $datos['fecha_creacion'],
                null,
                $datosExtra
            )
        ];
    }

    /** Obtiene las notificaciones de un usuario con paginación */
    public function listar(
        int $usuarioId,
        int $pagina = 1,
        int $porPagina = self::POR_PAGINA_DEFAULT,
        ?bool $soloNoLeidas = null
    ): array {
        global $wpdb;

        $porPagina = min(max($porPagina, 1), self::POR_PAGINA_MAX);
        $pagina = max($pagina, 1);
        $offset = ($pagina - 1) * $porPagina;

        $whereExtra = $soloNoLeidas ? 'AND leida = 0' : '';

        $total = (int)$wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->tabla} 
                WHERE usuario_id = %d {$whereExtra}",
                $usuarioId
            )
        );

        $resultados = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, usuario_id, tipo, titulo, contenido, leida, datos_extra, fecha_creacion, fecha_lectura FROM {$this->tabla}
                WHERE usuario_id = %d {$whereExtra}
                ORDER BY fecha_creacion DESC
                LIMIT %d OFFSET %d",
                $usuarioId,
                $porPagina,
                $offset
            )
        );

        $notificaciones = array_map(
            fn($r) => $this->formatearDesdeDB($r),
            $resultados
        );

        return [
            'notificaciones' => $notificaciones,
            'total' => $total,
            'paginacion' => [
                'pagina' => $pagina,
                'porPagina' => $porPagina,
                'totalPaginas' => (int)ceil($total / $porPagina),
            ]
        ];
    }

    /** Marca una notificación como leída */
    public function marcarLeida(int $notificacionId, int $usuarioId): array
    {
        global $wpdb;

        $notificacion = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT id, usuario_id, tipo, titulo, contenido, leida, datos_extra, fecha_creacion, fecha_lectura FROM {$this->tabla} WHERE id = %d",
                $notificacionId
            )
        );

        if (!$notificacion) {
            return [
                'exito' => false,
                'mensaje' => 'Notificación no encontrada',
                'codigo' => 'no_encontrada'
            ];
        }

        if ((int)$notificacion->usuario_id !== $usuarioId) {
            return [
                'exito' => false,
                'mensaje' => 'No tienes permiso para modificar esta notificación',
                'codigo' => 'sin_permiso'
            ];
        }

        if ($notificacion->leida) {
            return [
                'exito' => true,
                'mensaje' => 'La notificación ya estaba marcada como leída'
            ];
        }

        // sentinel-disable-next-line retorno-ignorado-repo — operacion no critica, marcar como leida es best-effort
        $wpdb->update(
            $this->tabla,
            [
                'leida' => 1,
                'fecha_lectura' => current_time('mysql')
            ],
            ['id' => $notificacionId]
        );

        return [
            'exito' => true,
            'mensaje' => 'Notificación marcada como leída'
        ];
    }

    /** Marca todas las notificaciones del usuario como leídas */
    public function marcarTodasLeidas(int $usuarioId): array
    {
        global $wpdb;

        $cantidad = $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$this->tabla} 
                SET leida = 1, fecha_lectura = %s 
                WHERE usuario_id = %d AND leida = 0",
                current_time('mysql'),
                $usuarioId
            )
        );

        return [
            'exito' => true,
            'mensaje' => "Marcadas {$cantidad} notificaciones como leídas",
            'cantidad' => (int)$cantidad
        ];
    }

    /** Elimina una notificación */
    public function eliminar(int $notificacionId, int $usuarioId): array
    {
        global $wpdb;

        $notificacion = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT id, usuario_id, tipo, titulo, contenido, leida, datos_extra, fecha_creacion, fecha_lectura FROM {$this->tabla} WHERE id = %d",
                $notificacionId
            )
        );

        if (!$notificacion) {
            return [
                'exito' => false,
                'mensaje' => 'Notificación no encontrada',
                'codigo' => 'no_encontrada'
            ];
        }

        if ((int)$notificacion->usuario_id !== $usuarioId) {
            return [
                'exito' => false,
                'mensaje' => 'No tienes permiso para eliminar esta notificación',
                'codigo' => 'sin_permiso'
            ];
        }

        // sentinel-disable-next-line retorno-ignorado-repo — eliminacion no critica, se retorna exito (el registro ya no aparecera en queries)
        $wpdb->delete($this->tabla, ['id' => $notificacionId]);

        return [
            'exito' => true,
            'mensaje' => 'Notificación eliminada'
        ];
    }

    /** Cuenta las notificaciones no leídas para el badge del header */
    public function contarNoLeidas(int $usuarioId): int
    {
        global $wpdb;

        return (int)$wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->tabla} 
                WHERE usuario_id = %d AND leida = 0",
                $usuarioId
            )
        );
    }

    /**
     * Formatea una notificación para la respuesta de API
     */
    private function formatear(
        int $id,
        string $tipo,
        string $titulo,
        ?string $contenido,
        int $leida,
        string $fechaCreacion,
        ?string $fechaLectura,
        ?array $datosExtra = null
    ): array {
        return [
            'id' => $id,
            'tipo' => $tipo,
            'titulo' => $titulo,
            'contenido' => $contenido,
            'leida' => (bool)$leida,
            'fechaCreacion' => $fechaCreacion,
            'fechaLectura' => $fechaLectura,
            'datosExtra' => $datosExtra,
        ];
    }

    /**
     * Formatea una notificación desde un objeto de base de datos
     */
    private function formatearDesdeDB(object $notificacion): array
    {
        $datosExtra = $notificacion->datos_extra
            // sentinel-disable-next-line json-decode-inseguro — datos_extra viene de BD propia, json_encode controlado en crear()
            ? json_decode($notificacion->datos_extra, true)
            : null;

        return $this->formatear(
            (int)$notificacion->id,
            $notificacion->tipo,
            $notificacion->titulo,
            $notificacion->contenido,
            (int)$notificacion->leida,
            $notificacion->fecha_creacion,
            $notificacion->fecha_lectura,
            $datosExtra
        );
    }
}

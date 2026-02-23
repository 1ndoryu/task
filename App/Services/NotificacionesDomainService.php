<?php

/**
 * Servicio de Notificaciones de Dominio
 *
 * Creadores de notificaciones específicos por dominio:
 * - Equipos (solicitudes, aceptaciones)
 * - Tareas (asignaciones, vencimientos, desasignaciones)
 * - Mensajes (chat en elementos compartidos)
 *
 * Delega la creación al servicio base NotificacionesService.
 *
 * @package App\Services
 */

namespace App\Services;

class NotificacionesDomainService
{
    private NotificacionesService $notificaciones;

    public function __construct()
    {
        $this->notificaciones = new NotificacionesService();
    }

    /**
     * Crea notificación de solicitud de equipo recibida
     * Llamar desde EquiposService al recibir una solicitud
     */
    public function notificarSolicitudEquipo(
        int $usuarioDestinoId,
        int $usuarioOrigenId,
        int $solicitudId
    ): array {
        $usuarioOrigen = get_user_by('ID', $usuarioOrigenId);
        $nombreOrigen = $usuarioOrigen ? $usuarioOrigen->display_name : 'Usuario';

        return $this->notificaciones->crear(
            $usuarioDestinoId,
            NotificacionesService::TIPO_SOLICITUD_EQUIPO,
            "{$nombreOrigen} quiere unirse a tu equipo",
            "Has recibido una solicitud de conexión de {$nombreOrigen}.",
            [
                'solicitudId' => $solicitudId,
                'usuarioId' => $usuarioOrigenId,
                'usuarioNombre' => $nombreOrigen,
                'usuarioEmail' => $usuarioOrigen ? $usuarioOrigen->user_email : '',
                'usuarioAvatar' => $usuarioOrigen ? get_avatar_url($usuarioOrigenId, ['size' => 48]) : '',
            ]
        );
    }

    /**
     * Crea notificaciones de tareas que vencen hoy
     * Llamar desde un cron job diario
     */
    public function notificarTareasVencenHoy(int $usuarioId, array $tareas): int
    {
        $creadas = 0;

        foreach ($tareas as $tarea) {
            $resultado = $this->notificaciones->crear(
                $usuarioId,
                NotificacionesService::TIPO_TAREA_VENCE_HOY,
                "Tarea vence hoy: {$tarea['texto']}",
                "La tarea \"{$tarea['texto']}\" tiene fecha límite hoy.",
                [
                    'tareaId' => $tarea['id'],
                    'tareaTexto' => $tarea['texto'],
                    'proyectoId' => $tarea['proyectoId'] ?? null,
                ]
            );

            if ($resultado['exito']) {
                $creadas++;
            }
        }

        return $creadas;
    }

    /**
     * Crea notificación cuando una solicitud de equipo es aceptada
     * Notifica al usuario que envió la solicitud original
     */
    public function notificarSolicitudAceptada(
        int $usuarioDestinoId,
        int $usuarioAceptoId
    ): array {
        $usuarioAcepto = get_user_by('ID', $usuarioAceptoId);
        $nombreAcepto = $usuarioAcepto ? $usuarioAcepto->display_name : 'Usuario';

        return $this->notificaciones->crear(
            $usuarioDestinoId,
            NotificacionesService::TIPO_SOLICITUD_ACEPTADA,
            "{$nombreAcepto} aceptó tu solicitud",
            "¡Ahora {$nombreAcepto} es parte de tu equipo!",
            [
                'usuarioId' => $usuarioAceptoId,
                'usuarioNombre' => $nombreAcepto,
                'usuarioAvatar' => $usuarioAcepto ? get_avatar_url($usuarioAceptoId, ['size' => 48]) : '',
            ]
        );
    }

    /**
     * Crea notificación cuando se asigna una tarea a un usuario
     */
    public function notificarTareaAsignada(
        int $usuarioDestinoId,
        int $usuarioOrigenId,
        int $tareaId,
        string $tareaTexto
    ): array {
        $usuarioOrigen = get_user_by('ID', $usuarioOrigenId);
        $nombreOrigen = $usuarioOrigen ? $usuarioOrigen->display_name : 'Alguien';

        $textoCorto = strlen($tareaTexto) > 50
            ? substr($tareaTexto, 0, 50) . '...'
            : $tareaTexto;

        return $this->notificaciones->crear(
            $usuarioDestinoId,
            NotificacionesService::TIPO_TAREA_ASIGNADA,
            "Nueva tarea asignada",
            "{$nombreOrigen} te asignó la tarea: \"{$textoCorto}\"",
            [
                'tareaId' => $tareaId,
                'tareaTexto' => $tareaTexto,
                'asignadoPor' => $usuarioOrigenId,
                'asignadoPorNombre' => $nombreOrigen,
            ]
        );
    }

    /**
     * Crea notificación cuando se quita la asignación de una tarea
     */
    public function notificarTareaDesasignada(
        int $usuarioDestinoId,
        int $usuarioOrigenId,
        int $tareaId,
        string $tareaTexto
    ): array {
        $usuarioOrigen = get_user_by('ID', $usuarioOrigenId);
        $nombreOrigen = $usuarioOrigen ? $usuarioOrigen->display_name : 'Alguien';

        $textoCorto = strlen($tareaTexto) > 50
            ? substr($tareaTexto, 0, 50) . '...'
            : $tareaTexto;

        return $this->notificaciones->crear(
            $usuarioDestinoId,
            NotificacionesService::TIPO_TAREA_REMOVIDA,
            "Tarea desasignada",
            "Ya no estas asignado a la tarea: \"{$textoCorto}\"",
            [
                'tareaId' => $tareaId,
                'tareaTexto' => $tareaTexto,
                'removidoPor' => $usuarioOrigenId,
                'removidoPorNombre' => $nombreOrigen,
            ]
        );
    }

    /**
     * Crea notificacion cuando se recibe un mensaje en un elemento compartido
     */
    public function notificarMensajeChat(
        int $usuarioDestinoId,
        int $usuarioOrigenId,
        string $tipoElemento,
        int $elementoId,
        string $elementoNombre,
        string $mensajePreview
    ): array {
        $usuarioOrigen = get_user_by('ID', $usuarioOrigenId);
        $nombreOrigen = $usuarioOrigen ? $usuarioOrigen->display_name : 'Alguien';

        $tiposLegibles = [
            'tarea' => 'tarea',
            'proyecto' => 'proyecto',
            'habito' => 'habito'
        ];
        $tipoLegible = $tiposLegibles[$tipoElemento] ?? $tipoElemento;

        $elementoCorto = strlen($elementoNombre) > 30
            ? substr($elementoNombre, 0, 30) . '...'
            : $elementoNombre;

        $mensajeCorto = strlen($mensajePreview) > 50
            ? substr($mensajePreview, 0, 50) . '...'
            : $mensajePreview;

        return $this->notificaciones->crear(
            $usuarioDestinoId,
            NotificacionesService::TIPO_MENSAJE_CHAT,
            "Nuevo mensaje de {$nombreOrigen}",
            "En {$tipoLegible} \"{$elementoCorto}\": \"{$mensajeCorto}\"",
            [
                'tipoElemento' => $tipoElemento,
                'elementoId' => $elementoId,
                'elementoNombre' => $elementoNombre,
                'mensajePreview' => $mensajePreview,
                'enviadoPor' => $usuarioOrigenId,
                'enviadoPorNombre' => $nombreOrigen,
                'enviadoPorAvatar' => $usuarioOrigen ? get_avatar_url($usuarioOrigenId, ['size' => 48]) : '',
            ]
        );
    }
}

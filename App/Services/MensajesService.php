<?php

/**
 * Servicio de Mensajes
 *
 * Proporciona una interfaz de alto nivel para el sistema de timeline.
 * Incluye metodos para generar mensajes de sistema automaticamente.
 *
 * @package App\Services
 */

namespace App\Services;

use App\Database\Schema;
use App\Repository\MensajesRepository;
use App\Services\NotificacionesDomainService;

class MensajesService
{
    /* Mapeo de tipo de elemento a entidad de Schema */
    private const TIPOS_A_TABLAS = [
        'tarea' => 'tareas',
        'proyecto' => 'proyectos',
        'habito' => 'habitos'
    ];

    /* Mapeo de tipo de elemento al campo que contiene su nombre */
    private const CAMPOS_NOMBRE = [
        'tarea' => 'texto',
        'proyecto' => 'nombre',
        'habito' => 'nombre'
    ];
    /**
     * Descripciones legibles para acciones del sistema
     */
    private const DESCRIPCIONES_ACCIONES = [
        'creado' => 'creo este elemento',
        'editado' => 'edito',
        'completado' => 'marco como completado',
        'reabierto' => 'reabrio el elemento',
        'asignado' => 'asigno a',
        'desasignado' => 'quito la asignacion de',
        'adjunto_agregado' => 'agrego un adjunto',
        'adjunto_eliminado' => 'elimino un adjunto',
        'prioridad' => 'cambio la prioridad a',
        'urgencia' => 'cambio la urgencia a',
        'fecha_limite' => 'cambio la fecha limite',
        'participante_agregado' => 'agrego a',
        'participante_removido' => 'removio a',
        'compartido' => 'compartio el elemento',
        'descripcion' => 'modifico la descripcion',
        'nombre' => 'cambio el nombre a'
    ];

    /**
     * Registra un evento generico en el timeline
     */
    public static function registrarEvento(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        string $accion,
        ?string $detalle = null,
        ?array $datosExtra = null
    ): bool {
        $usuario = get_userdata($usuarioId);
        $nombreUsuario = $usuario ? $usuario->display_name : 'Usuario';

        $descripcionAccion = self::DESCRIPCIONES_ACCIONES[$accion] ?? $accion;

        $contenido = $detalle
            ? "{$nombreUsuario} {$descripcionAccion}: {$detalle}"
            : "{$nombreUsuario} {$descripcionAccion}";

        return MensajesRepository::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            $accion,
            $contenido,
            $datosExtra
        );
    }

    /**
     * Registra la creacion de un elemento
     */
    public static function registrarCreacion(string $tipoElemento, int $elementoId, int $usuarioId): bool
    {
        return self::registrarEvento($tipoElemento, $elementoId, $usuarioId, 'creado');
    }

    /**
     * Registra que se completo una tarea/habito
     */
    public static function registrarCompletado(string $tipoElemento, int $elementoId, int $usuarioId): bool
    {
        return self::registrarEvento($tipoElemento, $elementoId, $usuarioId, 'completado');
    }

    /**
     * Registra que se reabrio una tarea/habito
     */
    public static function registrarReabierto(string $tipoElemento, int $elementoId, int $usuarioId): bool
    {
        return self::registrarEvento($tipoElemento, $elementoId, $usuarioId, 'reabierto');
    }

    /**
     * Registra cambio de prioridad
     */
    public static function registrarCambioPrioridad(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        string $nuevaPrioridad
    ): bool {
        $prioridadesLegibles = [
            'muy_alta' => 'Muy Alta',
            'alta' => 'Alta',
            'media' => 'Media',
            'baja' => 'Baja',
            'muy_baja' => 'Muy Baja'
        ];
        $prioridadLegible = $prioridadesLegibles[$nuevaPrioridad] ?? $nuevaPrioridad;

        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'prioridad',
            $prioridadLegible
        );
    }

    /**
     * Registra cambio de urgencia
     */
    public static function registrarCambioUrgencia(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        string $nuevaUrgencia
    ): bool {
        $urgenciasLegibles = [
            'bloqueante' => 'Bloqueante',
            'urgente' => 'Urgente',
            'normal' => 'Normal',
            'chill' => 'Sin prisa'
        ];
        $urgenciaLegible = $urgenciasLegibles[$nuevaUrgencia] ?? $nuevaUrgencia;

        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'urgencia',
            $urgenciaLegible
        );
    }

    /**
     * Registra cambio de nombre
     */
    public static function registrarCambioNombre(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        string $nuevoNombre
    ): bool {
        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'nombre',
            $nuevoNombre
        );
    }

    /**
     * Registra cambio de fecha limite
     */
    public static function registrarCambioFechaLimite(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        ?string $nuevaFecha
    ): bool {
        $detalle = $nuevaFecha
            ? date_i18n('d M Y', strtotime($nuevaFecha))
            : 'sin fecha';

        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'fecha_limite',
            $detalle
        );
    }

    /**
     * Registra que se agrego un adjunto
     */
    public static function registrarAdjuntoAgregado(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        string $nombreArchivo
    ): bool {
        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'adjunto_agregado',
            $nombreArchivo
        );
    }

    /**
     * Registra que se elimino un adjunto
     */
    public static function registrarAdjuntoEliminado(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        string $nombreArchivo
    ): bool {
        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'adjunto_eliminado',
            $nombreArchivo
        );
    }

    /**
     * Registra que se asigno a un usuario
     */
    public static function registrarAsignacion(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        int $asignadoId
    ): bool {
        $asignado = get_userdata($asignadoId);
        $nombreAsignado = $asignado ? $asignado->display_name : 'Usuario';

        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'asignado',
            $nombreAsignado
        );
    }

    /**
     * Registra que se agrego un participante
     */
    public static function registrarParticipanteAgregado(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        int $participanteId
    ): bool {
        $participante = get_userdata($participanteId);
        $nombreParticipante = $participante ? $participante->display_name : 'Usuario';

        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'participante_agregado',
            $nombreParticipante
        );
    }

    /**
     * Registra que se removio un participante
     */
    public static function registrarParticipanteRemovido(
        string $tipoElemento,
        int $elementoId,
        int $usuarioId,
        int $participanteId
    ): bool {
        $participante = get_userdata($participanteId);
        $nombreParticipante = $participante ? $participante->display_name : 'Usuario';

        return self::registrarEvento(
            $tipoElemento,
            $elementoId,
            $usuarioId,
            'participante_removido',
            $nombreParticipante
        );
    }

    /**
     * Verifica si un usuario tiene acceso a un elemento
     * (es propietario o tiene el elemento compartido con el)
     */
    public static function tieneAccesoAElemento(int $userId, string $tipo, int $elementoId): bool
    {
        global $wpdb;

        if (!isset(self::TIPOS_A_TABLAS[$tipo])) {
            return false;
        }

        $tableName = Schema::getTableName(self::TIPOS_A_TABLAS[$tipo]);

        /* Verificar si es propietario */
        $esPropietario = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$tableName} WHERE user_id = %d AND id_local = %d AND deleted_at IS NULL",
            $userId,
            $elementoId
        ));

        if ($esPropietario) {
            return true;
        }

        /* Verificar si esta compartido con el usuario */
        $tablaCompartidos = Schema::getTableName('compartidos');
        $estaCompartido = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$tablaCompartidos} WHERE tipo = %s AND elemento_id = %d AND usuario_id = %d",
            $tipo,
            $elementoId,
            $userId
        ));

        return (bool)$estaCompartido;
    }

    /**
     * Notifica a los participantes de un elemento cuando se envia un mensaje
     * Excluye al usuario que envia el mensaje
     */
    public static function notificarParticipantesMensaje(
        int $usuarioOrigenId,
        string $tipoElemento,
        int $elementoId,
        string $contenido
    ): void {
        global $wpdb;

        if (!isset(self::TIPOS_A_TABLAS[$tipoElemento])) {
            return;
        }

        $tableName = Schema::getTableName(self::TIPOS_A_TABLAS[$tipoElemento]);
        $campoNombre = self::CAMPOS_NOMBRE[$tipoElemento];

        /* Obtener el propietario y nombre del elemento */
        $elemento = $wpdb->get_row($wpdb->prepare(
            "SELECT user_id, {$campoNombre} as nombre FROM {$tableName} WHERE id_local = %d AND deleted_at IS NULL",
            $elementoId
        ));

        if (!$elemento) {
            return;
        }

        $propietarioId = (int)$elemento->user_id;
        $elementoNombre = $elemento->nombre;

        /* Obtener participantes del elemento compartido */
        $tablaCompartidos = Schema::getTableName('compartidos');
        $participantes = $wpdb->get_col($wpdb->prepare(
            "SELECT usuario_id FROM {$tablaCompartidos} WHERE tipo = %s AND elemento_id = %d",
            $tipoElemento,
            $elementoId
        ));

        /* Agregar propietario a la lista si no esta */
        if (!in_array($propietarioId, $participantes)) {
            $participantes[] = $propietarioId;
        }

        /* Si no hay participantes ademas del que envia, salir */
        $participantes = array_filter($participantes, fn($id) => (int)$id !== $usuarioOrigenId);

        if (empty($participantes)) {
            return;
        }

        /* Crear notificacion para cada participante */
        $notificacionesService = new NotificacionesDomainService();

        foreach ($participantes as $participanteId) {
            $notificacionesService->notificarMensajeChat(
                (int)$participanteId,
                $usuarioOrigenId,
                $tipoElemento,
                $elementoId,
                $elementoNombre,
                $contenido
            );
        }
    }
}

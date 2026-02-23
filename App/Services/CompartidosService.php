<?php

/**
 * Servicio de Compartidos
 *
 * Gestiona la lógica para compartir tareas, proyectos y hábitos:
 * - Compartir elementos con miembros del equipo
 * - Gestionar roles (propietario, colaborador, observador)
 * - Obtener elementos compartidos conmigo
 * - Validar permisos de acceso
 *
 * @package App\Services
 */

namespace App\Services;

use App\Database\Schema;

class CompartidosService
{
    private $wpdb;
    private $tabla;
    private $tablaEquipos;

    public function __construct()
    {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->tabla = Schema::getTableName('compartidos');
        $this->tablaEquipos = Schema::getTableName('equipos');
    }

    /**
     * Comparte un elemento con otro usuario
     *
     * @param int $propietarioId ID del propietario del elemento
     * @param string $tipo Tipo de elemento: 'tarea', 'proyecto', 'habito'
     * @param int $elementoId ID local del elemento
     * @param int $usuarioDestinoId ID del usuario con quien compartir
     * @param string $rol Rol asignado: 'colaborador' o 'observador'
     * @return array Resultado de la operación
     */
    public function compartir(
        int $propietarioId,
        string $tipo,
        int $elementoId,
        int $usuarioDestinoId,
        string $rol = 'colaborador'
    ): array {
        /* Validar tipo */
        if (!in_array($tipo, ['tarea', 'proyecto', 'habito'])) {
            return [
                'exito' => false,
                'error' => 'Tipo de elemento no válido'
            ];
        }

        /* Validar rol */
        if (!in_array($rol, ['colaborador', 'observador'])) {
            return [
                'exito' => false,
                'error' => 'Rol no válido'
            ];
        }

        /* No puede compartir consigo mismo */
        if ($propietarioId === $usuarioDestinoId) {
            return [
                'exito' => false,
                'error' => 'No puedes compartir contigo mismo'
            ];
        }

        /* Verificar que son compañeros de equipo */
        if (!$this->sonCompaneros($propietarioId, $usuarioDestinoId)) {
            return [
                'exito' => false,
                'error' => 'Solo puedes compartir con miembros de tu equipo'
            ];
        }

        /* Verificar que no esté ya compartido con este usuario */
        $existente = $this->wpdb->get_row($this->wpdb->prepare(
            "SELECT id FROM {$this->tabla}
             WHERE tipo = %s AND elemento_id = %d AND propietario_id = %d AND usuario_id = %d",
            $tipo,
            $elementoId,
            $propietarioId,
            $usuarioDestinoId
        ));

        if ($existente) {
            return [
                'exito' => false,
                'error' => 'Este elemento ya está compartido con este usuario'
            ];
        }

        /* Insertar registro de compartido */
        $resultado = $this->wpdb->insert(
            $this->tabla,
            [
                'tipo' => $tipo,
                'elemento_id' => $elementoId,
                'propietario_id' => $propietarioId,
                'usuario_id' => $usuarioDestinoId,
                'rol' => $rol,
                'fecha_compartido' => current_time('mysql')
            ],
            ['%s', '%d', '%d', '%d', '%s', '%s']
        );

        if ($resultado === false) {
            return [
                'exito' => false,
                'error' => 'Error al compartir el elemento'
            ];
        }

        $compartidoId = $this->wpdb->insert_id;

        /* Crear notificación para el destinatario */
        $this->notificarCompartido($propietarioId, $usuarioDestinoId, $tipo, $elementoId);

        return [
            'exito' => true,
            'compartido' => $this->formatearCompartido(
                $compartidoId,
                $tipo,
                $elementoId,
                $propietarioId,
                $usuarioDestinoId,
                $rol
            )
        ];
    }

    /**
     * Actualiza el rol de un usuario en un elemento compartido
     *
     * @param int $compartidoId ID del registro de compartido
     * @param int $propietarioId ID del propietario (para verificar permisos)
     * @param string $nuevoRol Nuevo rol: 'colaborador' o 'observador'
     * @return array Resultado de la operación
     */
    public function actualizarRol(int $compartidoId, int $propietarioId, string $nuevoRol): array
    {
        if (!in_array($nuevoRol, ['colaborador', 'observador'])) {
            return [
                'exito' => false,
                'error' => 'Rol no válido'
            ];
        }

        /* Verificar que el usuario es el propietario */
        $compartido = $this->wpdb->get_row($this->wpdb->prepare(
            "SELECT id, tipo, elemento_id, propietario_id, usuario_id, rol, fecha_compartido FROM {$this->tabla} WHERE id = %d AND propietario_id = %d",
            $compartidoId,
            $propietarioId
        ));

        if (!$compartido) {
            return [
                'exito' => false,
                'error' => 'No tienes permisos para modificar este compartido'
            ];
        }

        $this->wpdb->update(
            $this->tabla,
            ['rol' => $nuevoRol],
            ['id' => $compartidoId],
            ['%s'],
            ['%d']
        );

        return ['exito' => true];
    }

    /**
     * Deja de compartir un elemento con un usuario
     *
     * @param int $compartidoId ID del registro de compartido
     * @param int $usuarioId ID del usuario que quita el compartido (propietario o destinatario)
     * @return array Resultado de la operación
     */
    public function dejarDeCompartir(int $compartidoId, int $usuarioId): array
    {
        /* El propietario puede quitar a cualquiera, el destinatario puede salirse */
        $compartido = $this->wpdb->get_row($this->wpdb->prepare(
            "SELECT id, tipo, elemento_id, propietario_id, usuario_id, rol, fecha_compartido FROM {$this->tabla}
             WHERE id = %d AND (propietario_id = %d OR usuario_id = %d)",
            $compartidoId,
            $usuarioId,
            $usuarioId
        ));

        if (!$compartido) {
            return [
                'exito' => false,
                'error' => 'No tienes permisos para eliminar este compartido'
            ];
        }

        $this->wpdb->delete(
            $this->tabla,
            ['id' => $compartidoId],
            ['%d']
        );

        return ['exito' => true];
    }

    /**
     * Verifica si dos usuarios son compañeros de equipo
     */
    private function sonCompaneros(int $usuario1, int $usuario2): bool
    {
        $conexion = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tablaEquipos}
             WHERE estado = 'aceptada'
             AND ((usuario_id = %d AND companero_id = %d) OR (usuario_id = %d AND companero_id = %d))",
            $usuario1,
            $usuario2,
            $usuario2,
            $usuario1
        ));

        return (int) $conexion > 0;
    }

    /**
     * Ofusca un email para no exponer PII completa en respuestas API.
     * Ejemplo: "usuario@dominio.com" -> "u***@d***.com"
     * Se mantiene la primera letra del local y dominio para reconocimiento mínimo.
     */
    private function ofuscarEmail(string $email): string
    {
        if (empty($email) || !str_contains($email, '@')) {
            return '***@***.***';
        }

        $partes = explode('@', $email);
        $local = $partes[0];
        $dominio = $partes[1];

        $localOfuscado = substr($local, 0, 1) . '***';

        $parteDominio = explode('.', $dominio);
        $dominioOfuscado = substr($parteDominio[0], 0, 1) . '***';
        $extension = end($parteDominio);

        return $localOfuscado . '@' . $dominioOfuscado . '.' . $extension;
    }

    /**
     * Formatea un registro de compartido para la respuesta
     */
    private function formatearCompartido(
        int $id,
        string $tipo,
        int $elementoId,
        int $propietarioId,
        int $usuarioId,
        string $rol
    ): array {
        $usuario = get_userdata($usuarioId);

        return [
            'id' => $id,
            'tipo' => $tipo,
            'elementoId' => $elementoId,
            'usuarioId' => $usuarioId,
            'usuarioNombre' => $usuario->display_name,
            'usuarioEmail' => $this->ofuscarEmail($usuario->user_email),
            'usuarioAvatar' => get_avatar_url($usuarioId, ['size' => 32]),
            'rol' => $rol,
            'fechaCompartido' => current_time('mysql')
        ];
    }

    /**
     * Crea una notificación cuando se comparte un elemento
     */
    private function notificarCompartido(int $propietarioId, int $destinatarioId, string $tipo, int $elementoId): void
    {
        $propietario = get_userdata($propietarioId);
        $tipoTexto = $tipo === 'tarea' ? 'una tarea' : ($tipo === 'proyecto' ? 'un proyecto' : 'un hábito');

        $notificacionesService = new NotificacionesService();
        $notificacionesService->crear(
            $destinatarioId,
            'elemento_compartido',
            "{$propietario->display_name} compartió $tipoTexto contigo",
            "Tienes acceso a un nuevo $tipo compartido",
            [
                'tipo' => $tipo,
                'elementoId' => $elementoId,
                'propietarioId' => $propietarioId,
                'propietarioNombre' => $propietario->display_name
            ]
        );
    }
}

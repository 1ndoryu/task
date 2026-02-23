<?php

/**
 * Servicio de Consultas de Compartidos
 *
 * Operaciones de lectura para elementos compartidos:
 * - Obtener elementos compartidos conmigo/por mi
 * - Obtener participantes de un elemento
 * - Verificar acceso a elementos
 * - Contar elementos compartidos
 *
 * @package App\Services
 */

namespace App\Services;

use App\Database\Schema;

class CompartidosQueryService
{
    private $wpdb;
    private string $tabla;

    public function __construct()
    {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->tabla = Schema::getTableName('compartidos');
    }

    /**
     * Obtiene todos los elementos compartidos conmigo
     *
     * @param int $usuarioId ID del usuario
     * @param string|null $tipo Filtrar por tipo (opcional)
     * @return array Lista de elementos compartidos
     */
    public function obtenerCompartidosConmigo(int $usuarioId, ?string $tipo = null): array
    {
        $sql = "SELECT c.id, c.tipo, c.elemento_id, c.propietario_id, c.usuario_id,
                       c.rol, c.fecha_compartido,
                       u.display_name as propietario_nombre, u.user_email as propietario_email
                FROM {$this->tabla} c
                JOIN {$this->wpdb->users} u ON c.propietario_id = u.ID
                WHERE c.usuario_id = %d";

        $params = [$usuarioId];

        if ($tipo !== null) {
            $sql .= " AND c.tipo = %s";
            $params[] = $tipo;
        }

        $sql .= " ORDER BY c.fecha_compartido DESC";

        $compartidos = $this->wpdb->get_results(
            $this->wpdb->prepare($sql, ...$params)
        );

        return array_map(function ($c) {
            return [
                'id' => (int) $c->id,
                'tipo' => $c->tipo,
                'elementoId' => (int) $c->elemento_id,
                'propietarioId' => (int) $c->propietario_id,
                'propietarioNombre' => $c->propietario_nombre,
                'propietarioEmail' => $this->ofuscarEmail($c->propietario_email),
                'propietarioAvatar' => get_avatar_url($c->propietario_id, ['size' => 32]),
                'rol' => $c->rol,
                'fechaCompartido' => $c->fecha_compartido
            ];
        }, $compartidos);
    }

    /**
     * Obtiene todos los elementos que yo he compartido
     *
     * @param int $propietarioId ID del propietario
     * @param string|null $tipo Filtrar por tipo (opcional)
     * @return array Lista de compartidos
     */
    public function obtenerMisCompartidos(int $propietarioId, ?string $tipo = null): array
    {
        $sql = "SELECT c.id, c.tipo, c.elemento_id, c.propietario_id, c.usuario_id,
                       c.rol, c.fecha_compartido,
                       u.display_name as usuario_nombre, u.user_email as usuario_email
                FROM {$this->tabla} c
                JOIN {$this->wpdb->users} u ON c.usuario_id = u.ID
                WHERE c.propietario_id = %d";

        $params = [$propietarioId];

        if ($tipo !== null) {
            $sql .= " AND c.tipo = %s";
            $params[] = $tipo;
        }

        $sql .= " ORDER BY c.tipo, c.elemento_id, c.fecha_compartido DESC";

        $compartidos = $this->wpdb->get_results(
            $this->wpdb->prepare($sql, ...$params)
        );

        return array_map(function ($c) {
            return [
                'id' => (int) $c->id,
                'tipo' => $c->tipo,
                'elementoId' => (int) $c->elemento_id,
                'usuarioId' => (int) $c->usuario_id,
                'usuarioNombre' => $c->usuario_nombre,
                'usuarioEmail' => $this->ofuscarEmail($c->usuario_email),
                'usuarioAvatar' => get_avatar_url($c->usuario_id, ['size' => 32]),
                'rol' => $c->rol,
                'fechaCompartido' => $c->fecha_compartido
            ];
        }, $compartidos);
    }

    /**
     * Obtiene los participantes de un elemento específico
     *
     * @param string $tipo Tipo de elemento
     * @param int $elementoId ID del elemento
     * @param int $propietarioId ID del propietario para validar acceso
     * @return array Lista de participantes con sus roles
     */
    public function obtenerParticipantes(string $tipo, int $elementoId, int $propietarioId): array
    {
        $compartidos = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT c.id, c.usuario_id, c.rol, c.fecha_compartido,
                    u.display_name as nombre, u.user_email as email
             FROM {$this->tabla} c
             JOIN {$this->wpdb->users} u ON c.usuario_id = u.ID
             WHERE c.tipo = %s AND c.elemento_id = %d AND c.propietario_id = %d
             ORDER BY c.fecha_compartido ASC",
            $tipo,
            $elementoId,
            $propietarioId
        ));

        /* Añadir al propietario como primer participante */
        $propietario = get_userdata($propietarioId);
        $participantes = [[
            'id' => 0,
            'usuarioId' => $propietarioId,
            'nombre' => $propietario->display_name,
            'email' => $this->ofuscarEmail($propietario->user_email),
            'avatar' => get_avatar_url($propietarioId, ['size' => 32]),
            'rol' => 'propietario',
            'esPropietario' => true
        ]];

        foreach ($compartidos as $c) {
            $participantes[] = [
                'id' => (int) $c->id,
                'usuarioId' => (int) $c->usuario_id,
                'nombre' => $c->nombre,
                'email' => $this->ofuscarEmail($c->email),
                'avatar' => get_avatar_url($c->usuario_id, ['size' => 32]),
                'rol' => $c->rol,
                'esPropietario' => false
            ];
        }

        return $participantes;
    }

    /**
     * Verifica si un usuario tiene acceso a un elemento
     *
     * @return array|false Rol del usuario o false si no tiene acceso
     */
    public function verificarAcceso(int $usuarioId, string $tipo, int $elementoId, int $propietarioId)
    {
        if ($usuarioId === $propietarioId) {
            return ['rol' => 'propietario', 'puedeEditar' => true, 'puedeEliminar' => true];
        }

        $compartido = $this->wpdb->get_row($this->wpdb->prepare(
            "SELECT rol FROM {$this->tabla}
             WHERE tipo = %s AND elemento_id = %d AND propietario_id = %d AND usuario_id = %d",
            $tipo,
            $elementoId,
            $propietarioId,
            $usuarioId
        ));

        if (!$compartido) {
            return false;
        }

        return [
            'rol' => $compartido->rol,
            'puedeEditar' => $compartido->rol === 'colaborador',
            'puedeEliminar' => false
        ];
    }

    /**
     * Cuenta elementos compartidos conmigo (para badge)
     */
    public function contarCompartidosConmigo(int $usuarioId): array
    {
        $resultados = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT tipo, COUNT(*) as total
             FROM {$this->tabla}
             WHERE usuario_id = %d
             GROUP BY tipo",
            $usuarioId
        ));

        $contadores = [
            'tareas' => 0,
            'proyectos' => 0,
            'habitos' => 0,
            'total' => 0
        ];

        foreach ($resultados as $r) {
            $contadores[$r->tipo . 's'] = (int) $r->total;
            $contadores['total'] += (int) $r->total;
        }

        return $contadores;
    }

    /**
     * Ofusca un email para no exponer PII completa en respuestas API
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
}

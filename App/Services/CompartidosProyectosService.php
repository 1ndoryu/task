<?php

/**
 * Servicio de Proyectos Compartidos
 *
 * Operaciones específicas para proyectos y tareas compartidas:
 * - Obtener proyectos compartidos conmigo (IDs y datos completos)
 * - Obtener tareas de proyectos compartidos
 * - Obtener tareas asignadas directamente a un usuario
 *
 * @package App\Services
 */

namespace App\Services;

use App\Database\Schema;

class CompartidosProyectosService
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
     * Obtiene los IDs de proyectos compartidos conmigo
     *
     * @param int $usuarioId ID del usuario actual
     * @return array Lista de proyectos compartidos con info del propietario
     */
    public function obtenerProyectosCompartidosConmigo(int $usuarioId): array
    {
        $compartidos = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT c.elemento_id, c.propietario_id, c.rol, c.fecha_compartido,
                    u.display_name as propietario_nombre
             FROM {$this->tabla} c
             JOIN {$this->wpdb->users} u ON c.propietario_id = u.ID
             WHERE c.usuario_id = %d AND c.tipo = 'proyecto'",
            $usuarioId
        ));

        return array_map(function ($c) {
            return [
                'elementoId' => (int) $c->elemento_id,
                'propietarioId' => (int) $c->propietario_id,
                'propietarioNombre' => $c->propietario_nombre,
                'propietarioAvatar' => get_avatar_url($c->propietario_id, ['size' => 32]),
                'rol' => $c->rol,
                'fechaCompartido' => $c->fecha_compartido
            ];
        }, $compartidos);
    }

    /**
     * Obtiene las tareas de proyectos compartidos conmigo
     * Incluye metadata de compartido para distinguirlas en el frontend
     *
     * @param int $usuarioId ID del usuario actual
     * @return array Tareas con metadata de compartido
     */
    public function obtenerTareasDeProyectosCompartidos(int $usuarioId): array
    {
        $tablaTareas = Schema::getTableName('tareas');

        /*
         * Obtener tareas de proyectos donde soy participante
         * Join: compartidos(proyecto) -> tareas(proyecto_id)
         */
        $tareas = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT t.id_local, t.data, t.user_id as propietario_id,
                    c.rol, c.elemento_id as proyecto_id,
                    u.display_name as propietario_nombre
             FROM {$this->tabla} c
             JOIN $tablaTareas t ON t.proyecto_id = c.elemento_id AND t.user_id = c.propietario_id
             JOIN {$this->wpdb->users} u ON c.propietario_id = u.ID
             WHERE c.usuario_id = %d
               AND c.tipo = 'proyecto'
               AND t.deleted_at IS NULL",
            $usuarioId
        ));

        return array_map(function ($t) {
            return [
                'idLocal' => (int) $t->id_local,
                'data' => $t->data,
                'propietarioId' => (int) $t->propietario_id,
                'propietarioNombre' => $t->propietario_nombre,
                'propietarioAvatar' => get_avatar_url($t->propietario_id, ['size' => 32]),
                'rol' => $t->rol,
                'proyectoId' => (int) $t->proyecto_id
            ];
        }, $tareas);
    }

    /**
     * Obtiene datos completos de proyectos compartidos conmigo
     * Incluye el contenido del proyecto, no solo los IDs
     *
     * @param int $usuarioId ID del usuario actual
     * @return array Proyectos con datos completos y metadata de compartido
     */
    public function obtenerDatosProyectosCompartidos(int $usuarioId): array
    {
        $tablaProyectos = Schema::getTableName('proyectos');

        $proyectos = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT p.id_local, p.data, p.user_id as propietario_id,
                    c.rol, c.fecha_compartido,
                    u.display_name as propietario_nombre
             FROM {$this->tabla} c
             JOIN $tablaProyectos p ON p.id_local = c.elemento_id AND p.user_id = c.propietario_id
             JOIN {$this->wpdb->users} u ON c.propietario_id = u.ID
             WHERE c.usuario_id = %d
               AND c.tipo = 'proyecto'
               AND p.deleted_at IS NULL",
            $usuarioId
        ));

        return array_map(function ($p) {
            return [
                'idLocal' => (int) $p->id_local,
                'data' => $p->data,
                'propietarioId' => (int) $p->propietario_id,
                'propietarioNombre' => $p->propietario_nombre,
                'propietarioAvatar' => get_avatar_url($p->propietario_id, ['size' => 32]),
                'rol' => $p->rol,
                'fechaCompartido' => $p->fecha_compartido
            ];
        }, $proyectos);
    }

    /**
     * Obtiene tareas sueltas asignadas a mí (fuera de proyectos)
     * Estas son tareas individuales que alguien me asignó directamente
     *
     * @param int $usuarioId ID del usuario actual
     * @return array Tareas asignadas con metadata
     */
    public function obtenerTareasAsignadasAMi(int $usuarioId): array
    {
        $tablaTareas = Schema::getTableName('tareas');

        /*
         * Detectar y registrar tareas con JSON invalido para diagnostico
         * La tabla solo tiene updated_at, no created_at
         */
        $tareasInvalidas = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT t.id_local, t.user_id, t.data, t.updated_at
             FROM $tablaTareas t
             WHERE t.deleted_at IS NULL
               AND t.user_id != %d
               AND (t.data IS NULL OR t.data = '' OR NOT JSON_VALID(t.data))",
            $usuarioId
        ));

        if (!empty($tareasInvalidas)) {
            /* Log reducido: solo IDs y conteo, sin preview de datos para evitar fuga */
            $idsInvalidos = array_map(fn($t) => $t->id_local, $tareasInvalidas);
            error_log(sprintf(
                "[CompartidosProyectosService] %d tareas con JSON invalido detectadas. IDs: %s",
                count($tareasInvalidas),
                implode(', ', $idsInvalidos)
            ));
        }

        /*
         * Buscar tareas donde asignadoA = $usuarioId en el JSON data
         * MySQL 5.7+ soporta JSON_EXTRACT
         * Se valida que data sea JSON valido antes de extraer para evitar errores
         */
        $tareas = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT t.id_local, t.data, t.user_id as propietario_id,
                    u.display_name as propietario_nombre
             FROM $tablaTareas t
             JOIN {$this->wpdb->users} u ON t.user_id = u.ID
             WHERE t.deleted_at IS NULL
               AND t.user_id != %d
               AND t.data IS NOT NULL
               AND t.data != ''
               AND JSON_VALID(t.data)
               AND JSON_EXTRACT(t.data, '$.asignadoA') = %d",
            $usuarioId,
            $usuarioId
        ));

        return array_map(function ($t) {
            return [
                'idLocal' => (int) $t->id_local,
                'data' => $t->data,
                'propietarioId' => (int) $t->propietario_id,
                'propietarioNombre' => $t->propietario_nombre,
                'propietarioAvatar' => get_avatar_url($t->propietario_id, ['size' => 32]),
                'rol' => 'colaborador'
            ];
        }, $tareas);
    }
}

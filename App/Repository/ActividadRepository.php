<?php

/**
 * Repositorio de Actividad
 *
 * Maneja el registro y consulta de actividad del usuario para el mapa de calor.
 * Tipos soportados: tarea_completada, habito_cumplido, nota_creada, adjunto_subido
 *
 * @package App\Repository
 */

namespace App\Repository;

use App\Database\Schema;
use App\Services\CifradoService;

class ActividadRepository
{
    use CifradoTrait;

    public function __construct(int $userId)
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('ID de usuario invalido');
        }
        $this->userId = $userId;
        $this->inicializarCifrado();
    }

    /**
     * Registra una actividad
     * 
     * @param string $tipo Tipo de actividad (tarea_completada, habito_cumplido, etc)
     * @param int|null $elementoId ID del elemento relacionado
     * @param string|null $elementoTipo Tipo del elemento (tarea, habito, nota)
     * @param int|null $proyectoId ID del proyecto relacionado (opcional)
     * @param string|null $fecha Fecha de la actividad (Y-m-d), usa hoy si no se especifica
     * @param array $detalles Detalles adicionales de la actividad
     * @param string|null $horaLocal Hora local del cliente (HH:MM:SS) - TAREA 2: Fix timezone
     */
    public function registrar(
        string $tipo,
        ?int $elementoId = null,
        ?string $elementoTipo = null,
        ?int $proyectoId = null,
        ?string $fecha = null,
        array $detalles = [],
        ?string $horaLocal = null
    ): bool {
        global $wpdb;
        $table = Schema::getTableName('actividad');

        $fechaRegistro = $fecha ?? current_time('Y-m-d');
        
        /* TAREA 2: Usar hora del cliente si se proporciona, de lo contrario hora del servidor */
        $horaRegistro = $horaLocal ?? current_time('H:i:s');

        $result = $wpdb->insert(
            $table,
            [
                'user_id' => $this->userId,
                'tipo' => sanitize_text_field($tipo),
                'elemento_id' => $elementoId,
                'elemento_tipo' => $elementoTipo ? sanitize_text_field($elementoTipo) : null,
                'proyecto_id' => $proyectoId,
                'fecha' => $fechaRegistro,
                'hora' => $horaRegistro,
                'detalles' => !empty($detalles) ? wp_json_encode($detalles) : null
            ],
            ['%d', '%s', '%d', '%s', '%d', '%s', '%s', '%s']
        );

        return $result !== false;
    }

    /**
     * Obtiene actividad agrupada por día para un rango de fechas
     * 
     * @param string $fechaInicio Fecha inicio (Y-m-d)
     * @param string $fechaFin Fecha fin (Y-m-d)
     * @param string|null $tipo Filtrar por tipo de actividad
     * @param int|null $proyectoId Filtrar por proyecto
     * @param int|null $habitoId Filtrar por hábito específico
     */
    public function obtenerPorRango(
        string $fechaInicio,
        string $fechaFin,
        ?string $tipo = null,
        ?int $proyectoId = null,
        ?int $habitoId = null
    ): array {
        global $wpdb;
        $table = Schema::getTableName('actividad');

        $sql = "SELECT fecha, COUNT(*) as cantidad, tipo 
                FROM $table 
                WHERE user_id = %d 
                AND fecha BETWEEN %s AND %s";

        $params = [$this->userId, $fechaInicio, $fechaFin];

        if ($tipo) {
            $sql .= " AND tipo = %s";
            $params[] = $tipo;
        }

        if ($proyectoId) {
            $sql .= " AND proyecto_id = %d";
            $params[] = $proyectoId;
        }

        if ($habitoId) {
            $sql .= " AND elemento_tipo = 'habito' AND elemento_id = %d";
            $params[] = $habitoId;
        }

        $sql .= " GROUP BY fecha, tipo ORDER BY fecha ASC";

        $results = $wpdb->get_results($wpdb->prepare($sql, $params), 'ARRAY_A');

        /* Agrupar por fecha */
        $actividad = [];
        foreach ($results as $row) {
            $fecha = $row['fecha'];
            if (!isset($actividad[$fecha])) {
                $actividad[$fecha] = [
                    'fecha' => $fecha,
                    'total' => 0,
                    'tipos' => []
                ];
            }
            $actividad[$fecha]['total'] += (int)$row['cantidad'];
            $actividad[$fecha]['tipos'][$row['tipo']] = (int)$row['cantidad'];
        }

        return array_values($actividad);
    }

    public function obtenerDetalleDia(
        string $fecha,
        ?string $tipo = null,
        ?int $proyectoId = null,
        ?int $habitoId = null
    ): array {
        global $wpdb;
        $table = Schema::getTableName('actividad');
        $tableTareas = Schema::getTableName('tareas');
        $tableHabitos = Schema::getTableName('habitos');
        $tableNotas = Schema::getTableName('notas');
        $tableProyectos = Schema::getTableName('proyectos');

        $sql = "SELECT a.id, a.tipo, a.elemento_id, a.elemento_tipo, a.proyecto_id, a.fecha, a.hora, a.detalles,
                       t.texto as tarea_texto,
                       h.nombre as habito_nombre,
                       n.titulo as nota_titulo,
                       p.nombre as proyecto_nombre
                FROM $table a
                LEFT JOIN $tableTareas t ON a.elemento_id = t.id AND a.elemento_tipo = 'tarea'
                LEFT JOIN $tableHabitos h ON a.elemento_id = h.id AND a.elemento_tipo = 'habito'
                LEFT JOIN $tableNotas n ON a.elemento_id = n.id AND a.elemento_tipo = 'nota'
                LEFT JOIN $tableProyectos p ON a.proyecto_id = p.id
                WHERE a.user_id = %d AND a.fecha = %s";

        $params = [$this->userId, $fecha];

        if ($tipo) {
            $sql .= " AND a.tipo = %s";
            $params[] = $tipo;
        }

        if ($proyectoId) {
            $sql .= " AND a.proyecto_id = %d";
            $params[] = $proyectoId;
        }

        if ($habitoId) {
            $sql .= " AND a.elemento_tipo = 'habito' AND a.elemento_id = %d";
            $params[] = $habitoId;
        }

        $sql .= " ORDER BY a.hora DESC, a.id DESC";

        $results = $wpdb->get_results($wpdb->prepare($sql, $params), 'ARRAY_A');

        $detalle = [];
        foreach ($results as $row) {
            $detalles = $row['detalles'] ? json_decode($row['detalles'], true) : null;
            
            /* Obtener nombre del elemento (tarea, hábito o nota) y descifrar si es necesario */
            $elementoNombre = $row['tarea_texto'] ?? $row['habito_nombre'] ?? $row['nota_titulo'] ?? ($detalles['elementoNombre'] ?? null);
            if ($elementoNombre !== null) {
                $elementoNombre = $this->descifrarTexto($elementoNombre);
            }
            
            /* Obtener nombre del proyecto y descifrar si es necesario */
            $proyectoNombre = $row['proyecto_nombre'] ?? ($detalles['proyectoNombre'] ?? null);
            if ($proyectoNombre !== null) {
                $proyectoNombre = $this->descifrarTexto($proyectoNombre);
            }
            
            $detalle[] = [
                'id' => (int)$row['id'],
                'tipo' => $row['tipo'],
                'elementoId' => $row['elemento_id'] ? (int)$row['elemento_id'] : null,
                'elementoTipo' => $row['elemento_tipo'],
                'proyectoId' => $row['proyecto_id'] ? (int)$row['proyecto_id'] : null,
                'fecha' => $row['fecha'],
                'hora' => $row['hora'],
                'elementoNombre' => $elementoNombre,
                'proyectoNombre' => $proyectoNombre,
                'detalles' => $detalles
            ];
        }

        return $detalle;
    }

    /**
     * Descifra un texto si está cifrado, o lo devuelve tal cual si no lo está
     */
    private function descifrarTexto(?string $texto): ?string
    {
        if ($texto === null || $texto === '') {
            return $texto;
        }
        
        /* Si tiene el prefijo de cifrado y el servicio está disponible, descifrar */
        if ($this->cifradoService !== null && $this->cifradoService->estaCifrado($texto)) {
            try {
                return $this->cifradoService->descifrar($texto);
            } catch (\Exception $e) {
                error_log('[ActividadRepository] Error descifrando texto: ' . $e->getMessage());
                return $texto;
            }
        }
        
        return $texto;
    }

    /**
     * Obtiene el resumen de actividad para el mapa de calor
     * Devuelve un array asociativo fecha => nivel (0-4)
     */
    public function obtenerResumenHeatmap(
        string $fechaInicio,
        string $fechaFin,
        ?string $tipo = null,
        ?int $proyectoId = null,
        ?int $habitoId = null
    ): array {
        $actividad = $this->obtenerPorRango(
            $fechaInicio,
            $fechaFin,
            $tipo,
            $proyectoId,
            $habitoId
        );

        if (empty($actividad)) {
            return [];
        }

        /* Encontrar el máximo para escalar */
        $maxActividad = max(array_column($actividad, 'total'));

        $heatmap = [];
        foreach ($actividad as $dia) {
            /* Escalar a nivel 0-4 */
            $nivel = $this->calcularNivel($dia['total'], $maxActividad);
            $heatmap[$dia['fecha']] = [
                'nivel' => $nivel,
                'total' => $dia['total'],
                'tipos' => $dia['tipos']
            ];
        }

        return $heatmap;
    }

    /**
     * Calcula el nivel de actividad (0-4) basado en el conteo y máximo
     */
    private function calcularNivel(int $cantidad, int $maximo): int
    {
        if ($cantidad === 0 || $maximo === 0) {
            return 0;
        }

        $porcentaje = ($cantidad / $maximo) * 100;

        if ($porcentaje <= 25) return 1;
        if ($porcentaje <= 50) return 2;
        if ($porcentaje <= 75) return 3;
        return 4;
    }

    /**
     * Obtiene estadísticas generales de actividad
     */
    public function obtenerEstadisticas(string $fechaInicio, string $fechaFin): array
    {
        global $wpdb;
        $table = Schema::getTableName('actividad');

        /* Total por tipo */
        $totales = $wpdb->get_results($wpdb->prepare(
            "SELECT tipo, COUNT(*) as cantidad 
             FROM $table 
             WHERE user_id = %d AND fecha BETWEEN %s AND %s 
             GROUP BY tipo",
            $this->userId,
            $fechaInicio,
            $fechaFin
        ), 'ARRAY_A');

        /* Días con actividad */
        $diasActivos = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT fecha) 
             FROM $table 
             WHERE user_id = %d AND fecha BETWEEN %s AND %s",
            $this->userId,
            $fechaInicio,
            $fechaFin
        ));

        /* Racha actual (días consecutivos hasta hoy) */
        $racha = $this->calcularRachaActual();

        return [
            'totales' => array_column($totales, 'cantidad', 'tipo'),
            'diasActivos' => (int)$diasActivos,
            'racha' => $racha
        ];
    }

    /**
     * Calcula la racha actual de días consecutivos con actividad
     */
    private function calcularRachaActual(): int
    {
        global $wpdb;
        $table = Schema::getTableName('actividad');

        $fechas = $wpdb->get_col($wpdb->prepare(
            "SELECT DISTINCT fecha 
             FROM $table 
             WHERE user_id = %d 
             ORDER BY fecha DESC 
             LIMIT 365",
            $this->userId
        ));

        if (empty($fechas)) {
            return 0;
        }

        $hoy = current_time('Y-m-d');
        $racha = 0;
        $fechaEsperada = $hoy;

        foreach ($fechas as $fecha) {
            if ($fecha === $fechaEsperada) {
                $racha++;
                $fechaEsperada = date('Y-m-d', strtotime($fechaEsperada . ' -1 day'));
            } else {
                /* Si es hoy y no hay actividad, revisar ayer */
                if ($racha === 0 && $fecha === date('Y-m-d', strtotime($hoy . ' -1 day'))) {
                    $racha = 1;
                    $fechaEsperada = date('Y-m-d', strtotime($fecha . ' -1 day'));
                } else {
                    break;
                }
            }
        }

        return $racha;
    }

    /**
     * Elimina registros de actividad de un hábito para una fecha específica
     * Se usa cuando se desmarca un día del historial del hábito
     * 
     * @param int $habitoId ID del hábito
     * @param string $fecha Fecha a eliminar (Y-m-d)
     * @return int Número de registros eliminados
     */
    public function eliminarPorHabito(int $habitoId, string $fecha): int
    {
        global $wpdb;
        $table = Schema::getTableName('actividad');

        $eliminados = $wpdb->delete(
            $table,
            [
                'user_id' => $this->userId,
                'elemento_tipo' => 'habito',
                'elemento_id' => $habitoId,
                'fecha' => $fecha
            ],
            ['%d', '%s', '%d', '%s']
        );

        return $eliminados !== false ? $eliminados : 0;
    }

    /**
     * Elimina registros de actividad de una tarea para una fecha específica
     * Se usa cuando se desmarca una tarea completada
     * 
     * @param int $tareaId ID de la tarea
     * @param string $fecha Fecha a eliminar (Y-m-d)
     * @return int Número de registros eliminados
     */
    public function eliminarPorTarea(int $tareaId, string $fecha): int
    {
        global $wpdb;
        $table = Schema::getTableName('actividad');

        $eliminados = $wpdb->delete(
            $table,
            [
                'user_id' => $this->userId,
                'elemento_tipo' => 'tarea',
                'elemento_id' => $tareaId,
                'fecha' => $fecha
            ],
            ['%d', '%s', '%d', '%s']
        );

        return $eliminados !== false ? $eliminados : 0;
    }

    /**
     * Elimina toda la actividad del usuario (herramienta de desarrollo)
     * @return int Número de registros eliminados
     */
    public function limpiarTodo(): int
    {
        global $wpdb;
        $table = Schema::getTableName('actividad');

        $eliminados = $wpdb->delete(
            $table,
            ['user_id' => $this->userId],
            ['%d']
        );

        return $eliminados !== false ? $eliminados : 0;
    }
}

<?php

/**
 * Servicio de IA — lógica de negocio para el API de asistentes.
 *
 * @package App\Services
 */

namespace App\Services;

use App\Repository\TareasRepository;
use App\Repository\ProyectosRepository;
use App\Repository\HabitosRepository;
use App\Repository\ActividadRepository;

class AIService
{
    /** Lista tareas del usuario con filtros opcionales */
    public function obtenerTareas(int $userId, string $filtro, ?int $proyectoId): array
    {
        $tareas = (new TareasRepository($userId))->getAll();
        if ($filtro === 'pendientes') {
            $tareas = array_filter($tareas, fn($t) => empty($t['completado']));
        } elseif ($filtro === 'completadas') {
            $tareas = array_filter($tareas, fn($t) => !empty($t['completado']));
        }
        if ($proyectoId !== null) {
            $tareas = array_filter($tareas, fn($t) => ($t['proyectoId'] ?? null) === $proyectoId);
        }
        $tareas = array_values($tareas);
        return ['tareas' => $tareas, 'total' => count($tareas), 'filtro' => $filtro];
    }

    /** Obtiene una tarea específica. Retorna null si no existe */
    public function obtenerTarea(int $userId, int $tareaId): ?array
    {
        $tareas = (new TareasRepository($userId))->getAll();
        $tarea = array_values(array_filter($tareas, fn($t) => ($t['id'] ?? 0) === $tareaId));
        return empty($tarea) ? null : $tarea[0];
    }

    /** Crea una nueva tarea */
    public function crearTarea(int $userId, array $datos): array
    {
        $repository = new TareasRepository($userId);
        $tareasExistentes = $repository->getAll();

        $maxId = 0;
        foreach ($tareasExistentes as $tarea) {
            if (isset($tarea['id']) && $tarea['id'] > $maxId) {
                $maxId = $tarea['id'];
            }
        }
        $nuevaTarea = [
            'id' => $maxId + 1, 'texto' => $datos['texto'], 'completado' => false,
            'proyectoId' => $datos['proyectoId'] ?? null, 'prioridad' => $datos['prioridad'] ?? null,
            'urgencia' => $datos['urgencia'] ?? 'normal', 'fechaMaxima' => $datos['fechaMaxima'] ?? null,
            'fechaCreacion' => current_time('c'),
        ];
        $tareasExistentes[] = $nuevaTarea;
        // sentinel-disable-next-line retorno-ignorado-repo — saveAll lanza excepcion si falla
        $repository->saveAll($tareasExistentes);
        return $nuevaTarea;
    }

    /** Edita una tarea existente. Retorna null si no existe */
    public function editarTarea(int $userId, int $tareaId, array $datos): ?array
    {
        $repository = new TareasRepository($userId);
        $tareas = $repository->getAll();
        $indice = $this->buscarIndicePorId($tareas, $tareaId);
        if ($indice === null) {
            return null;
        }
        foreach (['texto', 'prioridad', 'urgencia', 'fechaMaxima', 'proyectoId'] as $campo) {
            if (array_key_exists($campo, $datos) && $datos[$campo] !== null) {
                $tareas[$indice][$campo] = $datos[$campo];
            }
        }
        // sentinel-disable-next-line retorno-ignorado-repo — saveAll lanza excepcion si falla
        $repository->saveAll($tareas);
        return $tareas[$indice];
    }

    /** Toggle completado con registro de actividad */
    public function completarTarea(int $userId, int $tareaId): array
    {
        $repository = new TareasRepository($userId);
        $actividadRepo = new ActividadRepository($userId);
        $tareas = $repository->getAll();
        $indice = $this->buscarIndicePorId($tareas, $tareaId);

        if ($indice === null) {
            return ['success' => false, 'error' => 'not_found'];
        }

        $estabaCompletada = !empty($tareas[$indice]['completado']);
        $tareas[$indice]['completado'] = !$estabaCompletada;
        $proyectoId = $tareas[$indice]['proyectoId'] ?? null;

        if (!$estabaCompletada) {
            $tareas[$indice]['fechaCompletado'] = current_time('c');
            // sentinel-disable-next-line retorno-ignorado-repo — registro de actividad no critico
            $actividadRepo->registrar(
                'tarea_completada', $tareaId, 'tarea', $proyectoId,
                current_time('Y-m-d'), ['texto' => $tareas[$indice]['texto']]
            );
        } else {
            $fechaCompletado = isset($tareas[$indice]['fechaCompletado'])
                ? date('Y-m-d', strtotime($tareas[$indice]['fechaCompletado']))
                : current_time('Y-m-d');
            // sentinel-disable-next-line retorno-ignorado-repo — cleanup de actividad no critico
            $actividadRepo->eliminarPorTarea($tareaId, $fechaCompletado);
            unset($tareas[$indice]['fechaCompletado']);
        }
        // sentinel-disable-next-line retorno-ignorado-repo — saveAll lanza excepcion si falla
        $repository->saveAll($tareas);

        return [
            'success' => true, 'tarea' => $tareas[$indice],
            'completado' => $tareas[$indice]['completado'],
            'mensaje' => $tareas[$indice]['completado'] ? 'Tarea completada' : 'Tarea marcada como pendiente',
        ];
    }

    /** Elimina una tarea. Retorna true si existía */
    public function eliminarTarea(int $userId, int $tareaId): bool
    {
        $repository = new TareasRepository($userId);
        $tareas = $repository->getAll();
        $total = count($tareas);
        $tareas = array_values(array_filter($tareas, fn($t) => ($t['id'] ?? 0) !== $tareaId));
        if (count($tareas) === $total) {
            return false;
        }
        // sentinel-disable-next-line retorno-ignorado-repo — saveAll lanza excepcion si falla
        $repository->saveAll($tareas);
        return true;
    }

    /** Lista proyectos con filtro por estado */
    public function obtenerProyectos(int $userId, ?string $estado): array
    {
        $proyectos = (new ProyectosRepository($userId))->getAll();
        if ($estado !== 'todos' && $estado !== null) {
            $proyectos = array_filter($proyectos, fn($p) => ($p['estado'] ?? 'activo') === $estado);
        }
        $proyectos = array_values($proyectos);
        return ['proyectos' => $proyectos, 'total' => count($proyectos), 'filtro' => $estado];
    }

    /** Obtiene un proyecto con tareas y contadores. Retorna null si no existe */
    public function obtenerProyecto(int $userId, int $proyectoId, ?string $filtro): ?array
    {
        $proyecto = array_values(array_filter(
            (new ProyectosRepository($userId))->getAll(),
            fn($p) => ($p['id'] ?? 0) === $proyectoId
        ));
        if (empty($proyecto)) {
            return null;
        }

        $tareasProyecto = array_values(array_filter(
            (new TareasRepository($userId))->getAll(),
            fn($t) => ($t['proyectoId'] ?? null) === $proyectoId
        ));

        $pendientes = count(array_filter($tareasProyecto, fn($t) => empty($t['completado'])));
        $completadas = count($tareasProyecto) - $pendientes;

        if ($filtro === 'pendientes') {
            $tareasProyecto = array_filter($tareasProyecto, fn($t) => empty($t['completado']));
        } elseif ($filtro === 'completadas') {
            $tareasProyecto = array_filter($tareasProyecto, fn($t) => !empty($t['completado']));
        }

        return [
            'proyecto' => $proyecto[0],
            'tareas' => [
                'lista' => array_values($tareasProyecto), 'total' => count($tareasProyecto),
                'pendientes' => $pendientes, 'completadas' => $completadas,
            ]
        ];
    }

    /** Obtiene hábitos con estado de completado de hoy */
    public function obtenerHabitos(int $userId, ?string $importancia): array
    {
        $habitos = (new HabitosRepository($userId))->getAll();
        if ($importancia !== null) {
            $habitos = array_filter($habitos, fn($h) => ($h['importancia'] ?? 'Media') === $importancia);
        }
        $hoy = date('Y-m-d');
        foreach ($habitos as &$habito) {
            $habito['completadoHoy'] = ($habito['ultimoCompletado'] ?? '') === $hoy;
        }
        $habitos = array_values($habitos);
        $completadosHoy = count(array_filter($habitos, fn($h) => $h['completadoHoy']));

        return [
            'habitos' => $habitos, 'total' => count($habitos),
            'completadosHoy' => $completadosHoy, 'pendientesHoy' => count($habitos) - $completadosHoy,
        ];
    }

    /** Resumen estadístico completo del dashboard */
    public function obtenerResumen(int $userId): array
    {
        $tareas = (new TareasRepository($userId))->getAll();
        $proyectos = (new ProyectosRepository($userId))->getAll();
        $habitos = (new HabitosRepository($userId))->getAll();

        $pendientes = array_filter($tareas, fn($t) => empty($t['completado']));
        $urgentes = array_filter($pendientes, fn($t) => in_array($t['urgencia'] ?? 'normal', ['urgente', 'bloqueante']));
        $activos = array_filter($proyectos, fn($p) => ($p['estado'] ?? 'activo') === 'activo');
        $hoy = date('Y-m-d');
        $habitosHoy = array_filter($habitos, fn($h) => ($h['ultimoCompletado'] ?? '') === $hoy);

        return [
            'tareas' => [
                'total' => count($tareas), 'pendientes' => count($pendientes),
                'completadas' => count($tareas) - count($pendientes), 'urgentes' => count($urgentes),
            ],
            'proyectos' => ['total' => count($proyectos), 'activos' => count($activos)],
            'habitos' => [
                'total' => count($habitos), 'completadosHoy' => count($habitosHoy),
                'pendientesHoy' => count($habitos) - count($habitosHoy),
            ],
            'fecha' => current_time('Y-m-d'), 'horaLocal' => current_time('H:i'),
        ];
    }

    /** Busca el índice de un elemento por ID en un array */
    private function buscarIndicePorId(array $items, int $id): ?int
    {
        foreach ($items as $i => $item) {
            if (($item['id'] ?? 0) === $id) {
                return $i;
            }
        }
        return null;
    }
}

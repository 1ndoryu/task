<?php

namespace App\Services;

use App\Repository\HabitosRepository;
use App\Repository\NotasRepository;
use App\Repository\TareasRepository;

class AgentProactiveService
{
    public function analizarUsuario(int $userId, bool $force = false): array
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('Usuario inválido para análisis activo del agente.');
        }

        $transientKey = 'glory_agent_active_scan_' . $userId;
        if (!$force && get_transient($transientKey)) {
            return ['created' => 0, 'skipped' => true, 'reason' => 'recently_scanned'];
        }

        $propuestas = $this->generarPropuestas($userId);
        $service = new AgentActionService();
        $creadas = [];
        foreach ($propuestas as $propuesta) {
            $creadas[] = $service->crearPropuesta(
                $userId,
                'agent_suggestion',
                $propuesta['titulo'],
                $propuesta,
                true
            );
        }

        set_transient($transientKey, 1, 6 * HOUR_IN_SECONDS);

        return ['created' => count($creadas), 'acciones' => $creadas];
    }

    public function analizarAdmins(bool $force = false): array
    {
        $admins = get_users(['role__in' => ['administrator'], 'fields' => ['ID']]);
        $resultados = [];
        foreach ($admins as $admin) {
            $resultados[(int)$admin->ID] = $this->analizarUsuario((int)$admin->ID, $force);
        }
        return $resultados;
    }

    private function generarPropuestas(int $userId): array
    {
        $notas = (new NotasRepository($userId))->listar(10, 0);
        $tareas = (new TareasRepository($userId))->getAll();
        $habitos = (new HabitosRepository($userId))->getAll();
        $propuestas = [];

        foreach ($notas as $nota) {
            $texto = strtolower((string)($nota['titulo'] ?? '') . ' ' . (string)($nota['contenido'] ?? ''));
            if (preg_match('/\b(funcion|feature|bug|commit|github|pull request|pr|codigo|proyecto|whatsapp|recordatorio)\b/u', $texto)) {
                $propuestas[] = [
                    'titulo' => 'Revisar nota accionable',
                    'mensaje' => 'Detecté una nota reciente que parece pedir una acción. Puedo ayudarte a convertirla en tarea o propuesta externa.',
                    'fuente' => ['tipo' => 'nota', 'id' => (int)$nota['id'], 'titulo' => (string)$nota['titulo']],
                ];
                break;
            }
        }

        $pendientesAltas = array_values(array_filter($tareas, fn(array $tarea) => empty($tarea['completado']) && in_array(($tarea['prioridad'] ?? ''), ['muy_alta', 'alta'], true)));
        if (count($pendientesAltas) >= 3) {
            $propuestas[] = [
                'titulo' => 'Priorizar tareas altas',
                'mensaje' => 'Hay varias tareas de prioridad alta pendientes. Puedo preparar un plan corto con el orden recomendado.',
                'fuente' => ['tipo' => 'tareas', 'ids' => array_slice(array_map(fn(array $t) => (int)($t['id'] ?? 0), $pendientesAltas), 0, 5)],
            ];
        }

        $habitosPendientes = array_values(array_filter($habitos, fn(array $habito) => empty($habito['pausado']) && empty($habito['completadoHoy'])));
        if (count($habitosPendientes) >= 3) {
            $propuestas[] = [
                'titulo' => 'Recordar hábitos activos',
                'mensaje' => 'Hay hábitos activos sin completar hoy. Puedo crear un recordatorio local para revisarlos.',
                'fuente' => ['tipo' => 'habitos', 'ids' => array_slice(array_map(fn(array $h) => (int)($h['id'] ?? 0), $habitosPendientes), 0, 5)],
            ];
        }

        return array_slice($propuestas, 0, 3);
    }
}

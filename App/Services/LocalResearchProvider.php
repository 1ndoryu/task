<?php

namespace App\Services;

use App\Repository\HabitosRepository;
use App\Repository\NotasRepository;
use App\Repository\TareasRepository;

class LocalResearchProvider implements ResearchProviderInterface
{
    public function search(int $userId, string $query, int $limit = 10): array
    {
        $query = trim(wp_strip_all_tags($query));
        if ($query === '' || strlen($query) > 300) {
            throw new \InvalidArgumentException('Consulta de research inválida.');
        }

        $limit = max(1, min(20, $limit));
        $items = array_merge(
            $this->buscarNotas($userId, $query, $limit),
            $this->buscarTareas($userId, $query, $limit),
            $this->buscarHabitos($userId, $query, $limit)
        );

        usort($items, fn(array $a, array $b) => ($b['score'] <=> $a['score']) ?: strcmp((string)$a['titulo'], (string)$b['titulo']));

        return [
            'provider' => 'local',
            'query' => $query,
            'results' => array_slice($items, 0, $limit),
        ];
    }

    private function buscarNotas(int $userId, string $query, int $limit): array
    {
        $repo = new NotasRepository($userId);
        return array_map(function (array $nota) use ($query) {
            $contenido = wp_strip_all_tags((string)($nota['contenido'] ?? ''));
            return [
                'tipo' => 'nota',
                'id' => (int)($nota['id'] ?? 0),
                'titulo' => (string)($nota['titulo'] ?? 'Nota'),
                'resumen' => $this->resumir($contenido),
                'score' => $this->score((string)($nota['titulo'] ?? ''), $contenido, $query),
                'fecha' => $nota['fechaModificacion'] ?? null,
            ];
        }, $repo->buscar($query, $limit));
    }

    private function buscarTareas(int $userId, string $query, int $limit): array
    {
        $repo = new TareasRepository($userId);
        $matches = [];
        foreach ($repo->getAll() as $tarea) {
            $texto = (string)($tarea['texto'] ?? '');
            $detalles = wp_json_encode($tarea, JSON_UNESCAPED_UNICODE) ?: '';
            $score = $this->score($texto, $detalles, $query);
            if ($score <= 0) {
                continue;
            }
            $matches[] = [
                'tipo' => 'tarea',
                'id' => (int)($tarea['id'] ?? 0),
                'titulo' => $texto,
                'resumen' => !empty($tarea['completado']) ? 'Completada' : 'Pendiente',
                'score' => $score,
                'fecha' => $tarea['updatedAt'] ?? null,
            ];
        }
        usort($matches, fn(array $a, array $b) => $b['score'] <=> $a['score']);
        return array_slice($matches, 0, $limit);
    }

    private function buscarHabitos(int $userId, string $query, int $limit): array
    {
        $repo = new HabitosRepository($userId);
        $matches = [];
        foreach ($repo->getAll() as $habito) {
            $nombre = (string)($habito['nombre'] ?? '');
            $detalles = wp_json_encode($habito, JSON_UNESCAPED_UNICODE) ?: '';
            $score = $this->score($nombre, $detalles, $query);
            if ($score <= 0) {
                continue;
            }
            $matches[] = [
                'tipo' => 'habito',
                'id' => (int)($habito['id'] ?? 0),
                'titulo' => $nombre,
                'resumen' => !empty($habito['pausado']) ? 'Pausado' : 'Activo',
                'score' => $score,
                'fecha' => $habito['updatedAt'] ?? null,
            ];
        }
        usort($matches, fn(array $a, array $b) => $b['score'] <=> $a['score']);
        return array_slice($matches, 0, $limit);
    }

    private function score(string $titulo, string $contenido, string $query): int
    {
        $queryLower = strtolower($query);
        $tituloLower = strtolower($titulo);
        $contenidoLower = strtolower($contenido);
        $score = 0;

        if (str_contains($tituloLower, $queryLower)) {
            $score += 10;
        }
        if (str_contains($contenidoLower, $queryLower)) {
            $score += 4;
        }

        foreach (preg_split('/\s+/', $queryLower) ?: [] as $token) {
            if (strlen($token) < 3) {
                continue;
            }
            if (str_contains($tituloLower, $token)) {
                $score += 3;
            }
            if (str_contains($contenidoLower, $token)) {
                $score += 1;
            }
        }

        return $score;
    }

    private function resumir(string $texto): string
    {
        $texto = trim(preg_replace('/\s+/', ' ', $texto) ?: '');
        return strlen($texto) > 220 ? substr($texto, 0, 217) . '...' : $texto;
    }
}
